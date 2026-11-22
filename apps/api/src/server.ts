import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { ComponentGraphSchema, DreamProjectSchema } from "@dream-studio-v2/core";
import { CloudStore } from "./db/CloudStore.js";
import { GenerationJobStore } from "./jobs/GenerationJobStore.js";
import { StudioOrchestrator } from "./orchestrator/StudioOrchestrator.js";
import {
  getAIStatus,
  getProviderRuntimeTelemetry,
  type LLMProvider
} from "./providers/LLMProvider.js";
import { buildSandboxedPreviewHtml } from "./sandbox/PreviewBundler.js";

const StartJobSchema = z
  .object({
    kind: z.enum(["website", "game"]),
    prompt: z.string().min(2).max(800),
    designIntent: z.string().min(1).max(120).default("AI에게 추천받기"),
    extraNotes: z.string().max(400).optional(),
    testFixtureMode: z.boolean().optional()
  })
  .strict();

const RecommendSchema = z
  .object({
    careerPrompt: z.string().min(1).max(300),
    testFixtureMode: z.boolean().optional()
  })
  .strict();

const EditSchema = z
  .object({
    project: DreamProjectSchema,
    userRequest: z.string().min(1).max(400),
    testFixtureMode: z.boolean().optional()
  })
  .strict();

const BundleSchema = z
  .object({
    files: z.record(z.string(), z.string()),
    componentGraph: ComponentGraphSchema
  })
  .strict();

const RegisterSchema = z
  .object({
    email: z.string().email("올바른 이메일 주소를 입력해 주세요.").max(120),
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다.").max(100),
    displayName: z.string().min(1, "닉네임을 입력해 주세요.").max(40)
  })
  .strict();

const LoginSchema = z
  .object({
    email: z.string().email().max(120),
    password: z.string().min(1).max(100)
  })
  .strict();

const SyncProjectsSchema = z
  .object({
    projects: z.array(DreamProjectSchema).max(50)
  })
  .strict();

const PublishSchema = z
  .object({
    slug: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9가-힣-]+$/i, "유효하지 않은 슬러그 형식입니다."),
    projectId: z.string().min(1).max(64),
    kind: z.enum(["website", "game"]),
    title: z.string().min(1).max(80),
    summary: z.string().max(300),
    previewHtml: z.string().min(10).max(512 * 1024),
    isDevFixture: z.boolean().default(false)
  })
  .strict();

const SESSION_COOKIE = "ds_session";

function readSessionToken(req: FastifyRequest): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    const bearer = auth.slice(7).trim();
    if (bearer.length > 0) return bearer;
  }
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

function isHttpsRequest(req: FastifyRequest): boolean {
  const forwarded = String(req.headers["x-forwarded-proto"] ?? "").toLowerCase();
  return req.protocol === "https" || forwarded.includes("https");
}

function setSessionCookie(req: FastifyRequest, reply: FastifyReply, token: string): void {
  const secure = isHttpsRequest(req) ? "; Secure" : "";
  reply.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`
  );
}

function clearSessionCookie(reply: FastifyReply): void {
  reply.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

function resolveWebDistDir(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../web/dist"),
    path.resolve(process.cwd(), "apps/web/dist"),
    path.resolve(process.cwd(), "../web/dist")
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

export function buildServer(
  enableLogger = true,
  injectedProvider?: LLMProvider | null,
  dbPath?: string
): FastifyInstance {
  const app = Fastify({ logger: enableLogger, bodyLimit: 1024 * 1024 });
  const store = new CloudStore(dbPath);
  const jobStore = new GenerationJobStore();
  const orchestrator = new StudioOrchestrator(jobStore, injectedProvider);

  app.addHook("onClose", async () => {
    store.close();
  });

  const rateMap = new Map<string, number[]>();
  const allowRequest = (ip: string): boolean => {
    const now = Date.now();
    const recent = (rateMap.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
    if (recent.length >= 60) return false;
    recent.push(now);
    rateMap.set(ip, recent);
    return true;
  };

  void app.register(cors, {
    origin: process.env["CORS_ORIGIN"] ? process.env["CORS_ORIGIN"].split(",") : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });

  // --- Health & AI Status ---

  app.get("/api/health", async () => {
    const ai = getAIStatus();
    return {
      status: "ok",
      service: "dream-studio-v2-api",
      aiConfigured: ai.configured,
      provider: ai.provider,
      activeSlotCount: ai.activeSlotCount,
      cloudSync: true
    };
  });

  app.get("/api/ai/status", async () => getAIStatus());

  // --- Auth Routes ---

  app.get("/api/auth/me", async (req) => {
    const user = store.getUserBySession(readSessionToken(req));
    return { authenticated: Boolean(user), user };
  });

  app.post("/api/auth/register", async (req, reply) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." });
    }
    const res = store.registerUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.displayName
    );
    if (!res.ok) {
      return reply.status(409).send(res);
    }
    setSessionCookie(req, reply, res.token);
    return reply.status(201).send({ ok: true, user: res.user, token: res.token });
  });

  app.post("/api/auth/login", async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, message: "이메일과 비밀번호를 입력해 주세요." });
    }
    const res = store.loginUser(parsed.data.email, parsed.data.password);
    if (!res.ok) {
      return reply.status(401).send(res);
    }
    setSessionCookie(req, reply, res.token);
    return { ok: true, user: res.user, token: res.token };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    store.deleteSession(readSessionToken(req));
    clearSessionCookie(reply);
    return { ok: true };
  });

  // --- Cloud Projects Sync Routes (Authenticated) ---

  app.get("/api/projects", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    return { ok: true, projects: store.listUserProjects(user.id) };
  });

  app.get<{ Params: { id: string } }>("/api/projects/:id", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    const project = store.getUserProject(user.id, req.params.id);
    if (!project) return reply.status(404).send({ ok: false, message: "작품을 찾을 수 없습니다." });
    return { ok: true, project };
  });

  app.put<{ Params: { id: string } }>("/api/projects/:id", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    const parsed = DreamProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, message: "프로젝트 데이터 형식이 올바르지 않습니다." });
    }
    const saved = store.upsertUserProject(user.id, { ...parsed.data, id: req.params.id });
    return { ok: true, project: saved };
  });

  app.post("/api/projects/sync", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    const parsed = SyncProjectsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, message: "동기화 요청 형식이 올바르지 않습니다." });
    }
    for (const p of parsed.data.projects) {
      store.upsertUserProject(user.id, p);
    }
    return { ok: true, projects: store.listUserProjects(user.id) };
  });

  app.delete<{ Params: { id: string } }>("/api/projects/:id", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    const deleted = store.deleteUserProject(user.id, req.params.id);
    return { ok: deleted };
  });

  // --- Cross-Device Published Snapshots ---

  app.get("/api/published", async () => {
    return { ok: true, items: store.listPublished(48) };
  });

  app.get<{ Params: { slug: string } }>("/api/published/:slug", async (req, reply) => {
    const snap = store.getPublishedBySlug(req.params.slug);
    if (!snap) {
      return reply.status(404).send({ ok: false, message: "게시된 작품을 찾을 수 없습니다." });
    }
    return { ok: true, snapshot: snap };
  });

  app.post("/api/publish", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) {
      return reply
        .status(401)
        .send({ ok: false, errorCode: "AUTH_REQUIRED", message: "로그인이 필요합니다." });
    }
    const parsed = PublishSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, message: "게시 요청 데이터를 확인해 주세요." });
    }
    const snapshot = store.publishSnapshot({
      ...parsed.data,
      ownerId: user.id,
      authorName: user.displayName
    });
    return reply.status(201).send({ ok: true, snapshot });
  });

  app.delete<{ Params: { slug: string } }>("/api/publish/:slug", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) {
      return reply
        .status(401)
        .send({ ok: false, errorCode: "AUTH_REQUIRED", message: "로그인이 필요합니다." });
    }
    const ok = store.unpublishSnapshot(req.params.slug);
    return { ok };
  });

  // --- Admin Routes (role === "admin" required) ---

  app.get("/api/admin/overview", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    if (user.role !== "admin") {
      return reply.status(403).send({ ok: false, message: "관리자 권한이 필요합니다." });
    }
    const overview = store.getAdminOverview();
    const quotaTelemetry = getProviderRuntimeTelemetry();
    const estimatedRemainingToday = Math.max(
      0,
      quotaTelemetry.dailyLimit - overview.summary.todayAiCalls
    );
    return {
      ok: true,
      aiStatus: getAIStatus(),
      quotaTelemetry: {
        ...quotaTelemetry,
        usedToday: overview.summary.todayAiCalls,
        estimatedRemainingToday
      },
      overview
    };
  });

  app.post("/api/admin/verify-password", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    if (user.role !== "admin") {
      return reply.status(403).send({ ok: false, message: "관리자 권한이 필요합니다." });
    }
    const parsed = z.object({ password: z.string().min(1).max(100) }).strict().safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, message: "관리자 비밀번호를 입력해 주세요." });
    }
    const valid = store.verifyUserPasswordById(user.id, parsed.data.password);
    if (!valid) {
      return reply.status(403).send({ ok: false, message: "관리자 비밀번호가 일치하지 않습니다." });
    }
    return { ok: true };
  });

  app.patch<{ Params: { id: string } }>("/api/admin/users/:id/password", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    if (user.role !== "admin") {
      return reply.status(403).send({ ok: false, message: "관리자 권한이 필요합니다." });
    }
    const parsed = z
      .object({
        adminPassword: z.string().min(1, "관리자 비밀번호를 입력해 주세요.").max(100),
        newPassword: z.string().min(6, "새 비밀번호는 6자 이상이어야 합니다.").max(100)
      })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." });
    }
    if (!store.verifyUserPasswordById(user.id, parsed.data.adminPassword)) {
      return reply.status(403).send({ ok: false, message: "관리자 비밀번호가 일치하지 않습니다." });
    }
    const ok = store.resetUserPassword(req.params.id, parsed.data.newPassword);
    return { ok };
  });

  app.patch<{ Params: { id: string } }>("/api/admin/users/:id/role", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    if (user.role !== "admin") {
      return reply.status(403).send({ ok: false, message: "관리자 권한이 필요합니다." });
    }
    if (req.params.id === user.id) {
      return reply.status(400).send({ ok: false, message: "본인의 관리자 권한은 해제할 수 없습니다." });
    }
    const parsed = z.object({ role: z.enum(["admin", "user"]) }).strict().safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, message: "올바른 권한 값이 아닙니다." });
    }
    const ok = store.setUserRole(req.params.id, parsed.data.role);
    return { ok };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/users/:id", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    if (user.role !== "admin") {
      return reply.status(403).send({ ok: false, message: "관리자 권한이 필요합니다." });
    }
    if (req.params.id === user.id) {
      return reply.status(400).send({ ok: false, message: "본인 계정은 삭제할 수 없습니다." });
    }
    const ok = store.deleteUserById(req.params.id);
    return { ok };
  });

  app.delete<{ Params: { slug: string } }>("/api/admin/published/:slug", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) return reply.status(401).send({ ok: false, message: "로그인이 필요합니다." });
    if (user.role !== "admin") {
      return reply.status(403).send({ ok: false, message: "관리자 권한이 필요합니다." });
    }
    return { ok: store.unpublishSnapshot(req.params.slug) };
  });

  // --- AI Generation & Preview Routes (Authenticated) ---

  app.post("/api/ai/jobs", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) {
      return reply.status(401).send({
        ok: false,
        errorCode: "AUTH_REQUIRED",
        message: "작품을 생성하려면 먼저 로그인하거나 계정을 만들어 주세요."
      });
    }
    if (!allowRequest(req.ip)) {
      return reply.status(429).send({
        ok: false,
        errorCode: "RATE_LIMITED",
        message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
      });
    }
    const parsed = StartJobSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ ok: false, errorCode: "INVALID_REQUEST", message: "입력값을 확인해 주세요." });
    }
    const ai = getAIStatus();
    const res = orchestrator.startGenerationJob(parsed.data);
    store.recordAIUsage({
      userId: user.id,
      userEmail: user.email,
      action: parsed.data.kind === "game" ? "generate_game" : "generate_website",
      provider: parsed.data.testFixtureMode ? "dev_fixture" : (ai.provider ?? "none"),
      model: parsed.data.testFixtureMode ? "fixture" : (ai.model ?? "none"),
      status: res.ok ? "success" : "failed",
      errorMessage: res.ok ? null : (res.message ?? res.errorCode ?? "failed"),
      durationMs: 0
    });
    if (!res.ok) {
      return reply.status(res.errorCode === "AI_NOT_CONFIGURED" ? 503 : 400).send(res);
    }
    return reply.status(202).send(res);
  });

  app.get<{ Params: { jobId: string } }>("/api/ai/jobs/:jobId", async (req, reply) => {
    const job = jobStore.get(req.params.jobId);
    if (!job) {
      return reply.status(404).send({ ok: false, message: "생성 작업을 찾을 수 없습니다." });
    }
    return job;
  });

  app.post<{ Params: { jobId: string } }>("/api/ai/jobs/:jobId/cancel", async (req) => {
    return { ok: jobStore.cancel(req.params.jobId) };
  });

  app.post("/api/ai/recommend-games", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) {
      return reply.status(401).send({
        ok: false,
        errorCode: "AUTH_REQUIRED",
        message: "게임 아이디어를 추천받으려면 먼저 로그인해 주세요."
      });
    }
    const parsed = RecommendSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, message: "입력값을 확인해 주세요." });
    }
    const t0 = Date.now();
    const ai = getAIStatus();
    const res = await orchestrator.recommendGameIdeas(
      parsed.data.careerPrompt,
      parsed.data.testFixtureMode
    );
    store.recordAIUsage({
      userId: user.id,
      userEmail: user.email,
      action: "recommend_games",
      provider: parsed.data.testFixtureMode ? "dev_fixture" : (ai.provider ?? "none"),
      model: parsed.data.testFixtureMode ? "fixture" : (ai.model ?? "none"),
      status: res.ok ? "success" : "failed",
      errorMessage: res.ok ? null : (res.message ?? "failed"),
      durationMs: Date.now() - t0
    });
    if (!res.ok) return reply.status(res.errorCode === "AI_NOT_CONFIGURED" ? 503 : 500).send(res);
    return res;
  });

  app.post("/api/ai/edit", async (req, reply) => {
    const user = store.getUserBySession(readSessionToken(req));
    if (!user) {
      return reply.status(401).send({
        ok: false,
        errorCode: "AUTH_REQUIRED",
        message: "AI 수정을 사용하려면 먼저 로그인해 주세요."
      });
    }
    if (!allowRequest(req.ip)) return reply.status(429).send({ ok: false, message: "요청 한도 초과" });
    const parsed = EditSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, message: "수정 요청 형식이 올바르지 않습니다." });
    }
    const t0 = Date.now();
    const ai = getAIStatus();
    const res = await orchestrator.planConversationalEdit(
      parsed.data.project,
      parsed.data.userRequest,
      parsed.data.testFixtureMode
    );
    store.recordAIUsage({
      userId: user.id,
      userEmail: user.email,
      action: "ai_edit",
      provider: parsed.data.testFixtureMode ? "dev_fixture" : (ai.provider ?? "none"),
      model: parsed.data.testFixtureMode ? "fixture" : (ai.model ?? "none"),
      status: res.ok ? "success" : "failed",
      errorMessage: res.ok ? null : (res.message ?? "failed"),
      durationMs: Date.now() - t0
    });
    if (!res.ok) {
      return reply.status(res.errorCode === "AI_NOT_CONFIGURED" ? 503 : 422).send(res);
    }
    return res;
  });

  app.post("/api/preview/bundle", async (req, reply) => {
    const parsed = BundleSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "INVALID_REQUEST" });
    return { previewHtml: buildSandboxedPreviewHtml(parsed.data.files, parsed.data.componentGraph) };
  });

  // Unified production mode: serve built React SPA from apps/web/dist
  const webDistDir = resolveWebDistDir();
  if (webDistDir) {
    const indexHtmlPath = path.join(webDistDir, "index.html");
    app.get("/*", async (req, reply) => {
      const cleanPath = (req.url.split("?")[0] ?? "/").replace(/^\/+/, "");
      if (cleanPath.startsWith("api/")) {
        return reply.status(404).send({ ok: false, message: "Not Found" });
      }
      const candidate = path.resolve(webDistDir, cleanPath || "index.html");
      const safeInside =
        candidate === indexHtmlPath || candidate.startsWith(webDistDir + path.sep);

      if (safeInside && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const ext = path.extname(candidate).toLowerCase();
        const mime = MIME_TYPES[ext] ?? "application/octet-stream";
        if (cleanPath.startsWith("assets/")) {
          reply.header("Cache-Control", "public, max-age=31536000, immutable");
        }
        return reply.type(mime).send(fs.createReadStream(candidate));
      }

      reply.header("Cache-Control", "no-cache");
      return reply.type("text/html; charset=utf-8").send(fs.createReadStream(indexHtmlPath));
    });
  }

  return app;
}
