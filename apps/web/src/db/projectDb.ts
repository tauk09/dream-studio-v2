import Dexie, { type Table } from "dexie";
import { computeDreamProjectHash, type DreamProject } from "@dream-studio-v2/core";
import { useAuthStore } from "../store/authStore";

export interface PublishedSnapshot {
  slug: string;
  projectId: string;
  kind: "website" | "game";
  title: string;
  summary: string;
  previewHtml: string;
  publishedAt: string;
  authorName?: string;
  isDevFixture?: boolean;
}

class DreamStudioDatabase extends Dexie {
  projects!: Table<DreamProject, string>;
  published!: Table<PublishedSnapshot, string>;

  constructor() {
    super("DreamStudioV2DB");
    this.version(1).stores({
      projects: "id, kind, publishState, updatedAt, createdAt",
      published: "slug, projectId, kind, publishedAt"
    });
  }
}

export const db = new DreamStudioDatabase();

async function ensureAuthChecked() {
  const state = useAuthStore.getState();
  if (!state.initialized) {
    return state.refreshAuth();
  }
  return state.user;
}

export async function listProjects(): Promise<DreamProject[]> {
  const user = await ensureAuthChecked();
  if (user) {
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; projects: DreamProject[] };
        if (data.ok && Array.isArray(data.projects)) {
          return data.projects;
        }
      }
    } catch {
      // Fallback to local cache when offline
    }
  }
  return db.projects.orderBy("updatedAt").reverse().toArray();
}

export async function getProject(id: string): Promise<DreamProject | undefined> {
  const user = await ensureAuthChecked();
  if (user) {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; project?: DreamProject };
        if (data.ok && data.project) {
          await db.projects.put(data.project);
          return data.project;
        }
      }
    } catch {
      // Fallback to local cache
    }
  }
  return db.projects.get(id);
}

export async function saveProject(project: DreamProject): Promise<DreamProject> {
  const user = await ensureAuthChecked();
  const stamped: DreamProject = {
    ...project,
    ownerId: user?.id ?? project.ownerId ?? null,
    updatedAt: new Date().toISOString(),
    contentHash: computeDreamProjectHash(project.source.files, project.componentGraph)
  };
  await db.projects.put(stamped);

  if (user) {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(stamped.id)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stamped)
      });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; project?: DreamProject };
        if (data.ok && data.project) {
          await db.projects.put(data.project);
          return data.project;
        }
      }
    } catch {
      // Keep local save even if network temporarily unavailable
    }
  }
  return stamped;
}

export async function syncLocalProjectsToCloud(): Promise<number> {
  const user = await ensureAuthChecked();
  if (!user) return 0;
  const localAll = await db.projects.toArray();
  if (localAll.length === 0) return 0;
  const res = await fetch("/api/projects/sync", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projects: localAll })
  });
  if (!res.ok) return 0;
  return localAll.length;
}

export async function duplicateProject(id: string): Promise<DreamProject | null> {
  const original = await getProject(id);
  if (!original) return null;
  const now = new Date().toISOString();
  const copy: DreamProject = {
    ...structuredClone(original),
    id: `proj_${crypto.randomUUID().slice(0, 12)}`,
    title: `${original.title} (복사본)`,
    publishState: "draft",
    publishedSlug: null,
    createdAt: now,
    updatedAt: now
  };
  return saveProject(copy);
}

export async function deleteProject(id: string): Promise<void> {
  const user = await ensureAuthChecked();
  const existing = await db.projects.get(id);
  if (existing?.publishedSlug) {
    await db.published.delete(existing.publishedSlug);
  }
  await db.projects.delete(id);
  if (user) {
    try {
      await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include"
      });
    } catch {
      // Ignore network errors on delete fallback
    }
  }
}

export function createPublishSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "dream"}-${suffix}`;
}

export async function publishProject(
  project: DreamProject,
  previewHtml: string
): Promise<{ project: DreamProject; snapshot: PublishedSnapshot }> {
  const slug = project.publishedSlug || createPublishSlug(project.title);
  const now = new Date().toISOString();
  const snapshot: PublishedSnapshot = {
    slug,
    projectId: project.id,
    kind: project.kind,
    title: project.title,
    summary: project.blueprint.creativeGoal,
    previewHtml,
    publishedAt: now,
    isDevFixture: project.generatorSource === "dev_fixture"
  };

  // Publish to server DB so ANY device can open /p/:slug or /g/:slug
  try {
    await fetch("/api/publish", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: snapshot.slug,
        projectId: snapshot.projectId,
        kind: snapshot.kind,
        title: snapshot.title,
        summary: snapshot.summary,
        previewHtml: snapshot.previewHtml,
        isDevFixture: Boolean(snapshot.isDevFixture)
      })
    });
  } catch {
    // Still save locally as fallback
  }

  await db.published.put(snapshot);
  const updated = await saveProject({
    ...project,
    publishState: "published",
    publishedSlug: slug
  });
  return { project: updated, snapshot };
}

export async function unpublishProject(project: DreamProject): Promise<DreamProject> {
  if (project.publishedSlug) {
    try {
      await fetch(`/api/publish/${encodeURIComponent(project.publishedSlug)}`, {
        method: "DELETE",
        credentials: "include"
      });
    } catch {
      // Ignore offline error
    }
    await db.published.delete(project.publishedSlug);
  }
  return saveProject({
    ...project,
    publishState: "unpublished",
    publishedSlug: null
  });
}

export async function getPublishedBySlug(slug: string): Promise<PublishedSnapshot | undefined> {
  try {
    const res = await fetch(`/api/published/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const data = (await res.json()) as { ok: boolean; snapshot?: PublishedSnapshot };
      if (data.ok && data.snapshot) return data.snapshot;
    }
  } catch {
    // Offline fallback
  }
  return db.published.get(slug);
}

export async function listPublished(): Promise<PublishedSnapshot[]> {
  try {
    const res = await fetch("/api/published");
    if (res.ok) {
      const data = (await res.json()) as { ok: boolean; items?: PublishedSnapshot[] };
      if (data.ok && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch {
    // Offline fallback
  }
  return db.published.orderBy("publishedAt").reverse().toArray();
}
