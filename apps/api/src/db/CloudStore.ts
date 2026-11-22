import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DreamProject } from "@dream-studio-v2/core";

export type UserRole = "admin" | "user";

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface ServerPublishedSnapshot {
  slug: string;
  projectId: string;
  ownerId: string | null;
  authorName: string;
  kind: "website" | "game";
  title: string;
  summary: string;
  previewHtml: string;
  publishedAt: string;
  isDevFixture: boolean;
}

export interface AIUsageLogEntry {
  id: string;
  userId: string | null;
  userEmail: string;
  action: "generate_website" | "generate_game" | "recommend_games" | "ai_edit";
  provider: string;
  model: string;
  status: "success" | "failed";
  errorMessage: string | null;
  durationMs: number;
  createdAt: string;
}

export interface AdminUserSummary extends PublicUser {
  projectCount: number;
  aiCallCount: number;
}

export interface AdminOverviewData {
  summary: {
    totalUsers: number;
    adminUsers: number;
    totalProjects: number;
    websiteProjects: number;
    gameProjects: number;
    totalPublished: number;
    totalAiCalls: number;
    todayAiCalls: number;
    successRatePercent: number;
  };
  users: AdminUserSummary[];
  recentLogs: AIUsageLogEntry[];
  published: Array<Omit<ServerPublishedSnapshot, "previewHtml">>;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function isConfiguredAdminEmail(email: string): boolean {
  const raw = process.env["ADMIN_EMAILS"] ?? "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export class CloudStore {
  private readonly db: DatabaseSync;

  constructor(dbPath?: string) {
    const resolved = dbPath ?? CloudStore.defaultDbPath();
    if (resolved !== ":memory:") {
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
    }
    this.db = new DatabaseSync(resolved);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        publish_state TEXT NOT NULL,
        published_slug TEXT,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id, updated_at DESC);
      CREATE TABLE IF NOT EXISTS published_snapshots (
        slug TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        owner_id TEXT,
        author_name TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        preview_html TEXT NOT NULL,
        is_dev_fixture INTEGER NOT NULL DEFAULT 0,
        published_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_published_date ON published_snapshots(published_at DESC);
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_email TEXT NOT NULL,
        action TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ai_logs_date ON ai_usage_logs(created_at DESC);
    `);

    // Safe migration for existing DBs created before 'role' column existed
    const cols = this.db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "role")) {
      this.db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
      this.db.exec(
        "UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)"
      );
    }
  }

  static defaultDbPath(): string {
    const dataDir = process.env["DATA_DIR"]?.trim() || path.resolve(process.cwd(), "data");
    return path.join(dataDir, "dream-studio.sqlite");
  }

  close(): void {
    this.db.close();
  }

  // --- Auth ---

  registerUser(
    emailRaw: string,
    password: string,
    displayName: string
  ): { ok: true; user: PublicUser; token: string } | { ok: false; message: string } {
    const email = emailRaw.trim().toLowerCase();
    const existing = this.db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return { ok: false, message: "이미 가입된 이메일 주소입니다." };
    }
    const countRow = this.db.prepare("SELECT COUNT(*) as cnt FROM users").get() as { cnt: number };
    const role: UserRole =
      countRow.cnt === 0 || isConfiguredAdminEmail(email) ? "admin" : "user";

    const id = `usr_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);
    this.db
      .prepare(
        "INSERT INTO users (id, email, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(id, email, displayName.trim(), passwordHash, role, now);

    const token = this.createSession(id);
    return {
      ok: true,
      user: { id, email, displayName: displayName.trim(), role, createdAt: now },
      token
    };
  }

  loginUser(
    emailRaw: string,
    password: string
  ): { ok: true; user: PublicUser; token: string } | { ok: false; message: string } {
    const email = emailRaw.trim().toLowerCase();
    const row = this.db
      .prepare(
        "SELECT id, email, display_name, password_hash, role, created_at FROM users WHERE email = ?"
      )
      .get(email) as
      | {
          id: string;
          email: string;
          display_name: string;
          password_hash: string;
          role: string;
          created_at: string;
        }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      return { ok: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }

    let role: UserRole = row.role === "admin" ? "admin" : "user";
    if (role !== "admin" && isConfiguredAdminEmail(email)) {
      role = "admin";
      this.db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(row.id);
    }

    const token = this.createSession(row.id);
    return {
      ok: true,
      user: {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        role,
        createdAt: row.created_at
      },
      token
    };
  }

  private createSession(userId: string): string {
    const token = crypto.randomBytes(32).toString("hex");
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    this.db
      .prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .run(token, userId, expires.toISOString(), now.toISOString());
    return token;
  }

  getUserBySession(token?: string | null): PublicUser | null {
    if (!token) return null;
    const row = this.db
      .prepare(
        `SELECT u.id, u.email, u.display_name, u.role, u.created_at, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ?`
      )
      .get(token) as
      | {
          id: string;
          email: string;
          display_name: string;
          role: string;
          created_at: string;
          expires_at: string;
        }
      | undefined;

    if (!row) return null;
    if (Date.now() > Date.parse(row.expires_at)) {
      this.db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
      return null;
    }
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role === "admin" ? "admin" : "user",
      createdAt: row.created_at
    };
  }

  deleteSession(token?: string | null): void {
    if (!token) return;
    this.db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }

  // --- AI Usage Telemetry ---

  recordAIUsage(entry: Omit<AIUsageLogEntry, "id" | "createdAt">): void {
    const id = `log_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO ai_usage_logs
          (id, user_id, user_email, action, provider, model, status, error_message, duration_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        entry.userId,
        entry.userEmail,
        entry.action,
        entry.provider,
        entry.model,
        entry.status,
        entry.errorMessage,
        Math.max(0, Math.round(entry.durationMs)),
        now
      );
  }

  // --- Admin Overview & Account Management ---

  getAdminOverview(): AdminOverviewData {
    const userRows = this.db
      .prepare(
        `SELECT
           u.id, u.email, u.display_name, u.role, u.created_at,
           (SELECT COUNT(*) FROM projects p WHERE p.owner_id = u.id) AS project_count,
           (SELECT COUNT(*) FROM ai_usage_logs l WHERE l.user_id = u.id) AS ai_call_count
         FROM users u
         ORDER BY u.created_at DESC`
      )
      .all() as Array<{
      id: string;
      email: string;
      display_name: string;
      role: string;
      created_at: string;
      project_count: number;
      ai_call_count: number;
    }>;

    const users: AdminUserSummary[] = userRows.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role === "admin" ? "admin" : "user",
      createdAt: u.created_at,
      projectCount: Number(u.project_count),
      aiCallCount: Number(u.ai_call_count)
    }));

    const projStats = this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN kind = 'website' THEN 1 ELSE 0 END) as websites,
           SUM(CASE WHEN kind = 'game' THEN 1 ELSE 0 END) as games
         FROM projects`
      )
      .get() as { total: number; websites: number | null; games: number | null };

    const pubCount = this.db
      .prepare("SELECT COUNT(*) as total FROM published_snapshots")
      .get() as { total: number };

    const todayPrefix = new Date().toISOString().slice(0, 10);
    const aiStats = this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as ok_cnt,
           SUM(CASE WHEN created_at LIKE ? THEN 1 ELSE 0 END) as today_cnt
         FROM ai_usage_logs`
      )
      .get(`${todayPrefix}%`) as {
      total: number;
      ok_cnt: number | null;
      today_cnt: number | null;
    };

    const totalAiCalls = Number(aiStats.total ?? 0);
    const okAiCalls = Number(aiStats.ok_cnt ?? 0);
    const successRatePercent =
      totalAiCalls > 0 ? Math.round((okAiCalls / totalAiCalls) * 100) : 100;

    const logRows = this.db
      .prepare(
        `SELECT id, user_id, user_email, action, provider, model, status, error_message, duration_ms, created_at
         FROM ai_usage_logs
         ORDER BY created_at DESC
         LIMIT 50`
      )
      .all() as Array<{
      id: string;
      user_id: string | null;
      user_email: string;
      action: AIUsageLogEntry["action"];
      provider: string;
      model: string;
      status: AIUsageLogEntry["status"];
      error_message: string | null;
      duration_ms: number;
      created_at: string;
    }>;

    const recentLogs: AIUsageLogEntry[] = logRows.map((l) => ({
      id: l.id,
      userId: l.user_id,
      userEmail: l.user_email,
      action: l.action,
      provider: l.provider,
      model: l.model,
      status: l.status,
      errorMessage: l.error_message,
      durationMs: Number(l.duration_ms),
      createdAt: l.created_at
    }));

    return {
      summary: {
        totalUsers: users.length,
        adminUsers: users.filter((u) => u.role === "admin").length,
        totalProjects: Number(projStats.total ?? 0),
        websiteProjects: Number(projStats.websites ?? 0),
        gameProjects: Number(projStats.games ?? 0),
        totalPublished: Number(pubCount.total ?? 0),
        totalAiCalls,
        todayAiCalls: Number(aiStats.today_cnt ?? 0),
        successRatePercent
      },
      users,
      recentLogs,
      published: this.listPublished(50)
    };
  }

  setUserRole(userId: string, role: UserRole): boolean {
    const info = this.db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
    return Number(info.changes) > 0;
  }

  verifyUserPasswordById(userId: string, password: string): boolean {
    const row = this.db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .get(userId) as { password_hash: string } | undefined;
    if (!row) return false;
    return verifyPassword(password, row.password_hash);
  }

  resetUserPassword(userId: string, newPassword: string): boolean {
    const passwordHash = hashPassword(newPassword);
    const info = this.db
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .run(passwordHash, userId);
    if (Number(info.changes) > 0) {
      this.db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
      return true;
    }
    return false;
  }

  deleteUserById(userId: string): boolean {
    this.db.prepare("DELETE FROM published_snapshots WHERE owner_id = ?").run(userId);
    this.db.prepare("DELETE FROM projects WHERE owner_id = ?").run(userId);
    this.db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    const info = this.db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return Number(info.changes) > 0;
  }

  // --- Cloud Projects ---

  listUserProjects(ownerId: string): DreamProject[] {
    const rows = this.db
      .prepare("SELECT data_json FROM projects WHERE owner_id = ? ORDER BY updated_at DESC")
      .all(ownerId) as Array<{ data_json: string }>;
    return rows.map((r) => JSON.parse(r.data_json) as DreamProject);
  }

  getUserProject(ownerId: string, projectId: string): DreamProject | null {
    const row = this.db
      .prepare("SELECT data_json FROM projects WHERE id = ? AND owner_id = ?")
      .get(projectId, ownerId) as { data_json: string } | undefined;
    return row ? (JSON.parse(row.data_json) as DreamProject) : null;
  }

  upsertUserProject(ownerId: string, project: DreamProject): DreamProject {
    const owned: DreamProject = {
      ...project,
      ownerId,
      updatedAt: new Date().toISOString()
    };
    this.db
      .prepare(
        `INSERT INTO projects (id, owner_id, kind, title, publish_state, published_slug, data_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           kind = excluded.kind,
           title = excluded.title,
           publish_state = excluded.publish_state,
           published_slug = excluded.published_slug,
           data_json = excluded.data_json,
           updated_at = excluded.updated_at
         WHERE projects.owner_id = excluded.owner_id`
      )
      .run(
        owned.id,
        ownerId,
        owned.kind,
        owned.title,
        owned.publishState,
        owned.publishedSlug,
        JSON.stringify(owned),
        owned.createdAt,
        owned.updatedAt
      );
    return owned;
  }

  deleteUserProject(ownerId: string, projectId: string): boolean {
    const existing = this.getUserProject(ownerId, projectId);
    if (!existing) return false;
    if (existing.publishedSlug) {
      this.db.prepare("DELETE FROM published_snapshots WHERE slug = ?").run(existing.publishedSlug);
    }
    const info = this.db
      .prepare("DELETE FROM projects WHERE id = ? AND owner_id = ?")
      .run(projectId, ownerId);
    return Number(info.changes) > 0;
  }

  // --- Cross-Device Published Snapshots ---

  publishSnapshot(input: {
    slug: string;
    projectId: string;
    ownerId: string | null;
    authorName: string;
    kind: "website" | "game";
    title: string;
    summary: string;
    previewHtml: string;
    isDevFixture: boolean;
  }): ServerPublishedSnapshot {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO published_snapshots
          (slug, project_id, owner_id, author_name, kind, title, summary, preview_html, is_dev_fixture, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
           title = excluded.title,
           summary = excluded.summary,
           preview_html = excluded.preview_html,
           is_dev_fixture = excluded.is_dev_fixture,
           published_at = excluded.published_at`
      )
      .run(
        input.slug,
        input.projectId,
        input.ownerId,
        input.authorName,
        input.kind,
        input.title,
        input.summary,
        input.previewHtml,
        input.isDevFixture ? 1 : 0,
        now
      );
    return { ...input, publishedAt: now };
  }

  unpublishSnapshot(slug: string): boolean {
    const info = this.db.prepare("DELETE FROM published_snapshots WHERE slug = ?").run(slug);
    return Number(info.changes) > 0;
  }

  getPublishedBySlug(slug: string): ServerPublishedSnapshot | null {
    const row = this.db
      .prepare(
        `SELECT slug, project_id, owner_id, author_name, kind, title, summary, preview_html, is_dev_fixture, published_at
         FROM published_snapshots WHERE slug = ?`
      )
      .get(slug) as
      | {
          slug: string;
          project_id: string;
          owner_id: string | null;
          author_name: string;
          kind: "website" | "game";
          title: string;
          summary: string;
          preview_html: string;
          is_dev_fixture: number;
          published_at: string;
        }
      | undefined;

    if (!row) return null;
    return {
      slug: row.slug,
      projectId: row.project_id,
      ownerId: row.owner_id,
      authorName: row.author_name,
      kind: row.kind,
      title: row.title,
      summary: row.summary,
      previewHtml: row.preview_html,
      isDevFixture: row.is_dev_fixture === 1,
      publishedAt: row.published_at
    };
  }

  listPublished(limit = 40): Array<Omit<ServerPublishedSnapshot, "previewHtml">> {
    const rows = this.db
      .prepare(
        `SELECT slug, project_id, owner_id, author_name, kind, title, summary, is_dev_fixture, published_at
         FROM published_snapshots ORDER BY published_at DESC LIMIT ?`
      )
      .all(limit) as Array<{
      slug: string;
      project_id: string;
      owner_id: string | null;
      author_name: string;
      kind: "website" | "game";
      title: string;
      summary: string;
      is_dev_fixture: number;
      published_at: string;
    }>;

    return rows.map((row) => ({
      slug: row.slug,
      projectId: row.project_id,
      ownerId: row.owner_id,
      authorName: row.author_name,
      kind: row.kind,
      title: row.title,
      summary: row.summary,
      isDevFixture: row.is_dev_fixture === 1,
      publishedAt: row.published_at
    }));
  }
}
