import type {
  ComponentGraph,
  DreamProject,
  GameIdeaRecommendation,
  GenerationJob,
  PendingCodeChange
} from "@dream-studio-v2/core";

export interface AIStatusResponse {
  configured: boolean;
  provider: string | null;
  model: string | null;
  setupGuideKo?: string;
  message?: string;
}

export interface StartJobPayload {
  kind: "website" | "game";
  prompt: string;
  designIntent: string;
  extraNotes?: string;
  testFixtureMode?: boolean;
}

export type StartJobResponse =
  | { ok: true; jobId: string }
  | { ok: false; errorCode: string; message: string };

export type RecommendGamesResponse =
  | { ok: true; source: string; ideas: GameIdeaRecommendation[] }
  | { ok: false; errorCode?: string; message: string };

export type ConversationalEditResponse =
  | { ok: true; pendingChange: PendingCodeChange }
  | { ok: false; errorCode?: string; message: string };

export async function fetchAIStatus(): Promise<AIStatusResponse> {
  const res = await fetch("/api/ai/status");
  if (!res.ok) {
    return {
      configured: false,
      provider: null,
      model: null,
      message: "백엔드 API 서버에 연결할 수 없습니다."
    };
  }
  return (await res.json()) as AIStatusResponse;
}

export async function startGenerationJob(payload: StartJobPayload): Promise<StartJobResponse> {
  const res = await fetch("/api/ai/jobs", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return (await res.json()) as StartJobResponse;
}

export async function fetchGenerationJob(jobId: string): Promise<GenerationJob | null> {
  const res = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`, { credentials: "include" });
  if (!res.ok) return null;
  return (await res.json()) as GenerationJob;
}

export async function cancelGenerationJob(jobId: string): Promise<boolean> {
  const res = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { ok: boolean };
  return data.ok;
}

export async function recommendGameIdeas(
  careerPrompt: string,
  testFixtureMode?: boolean
): Promise<RecommendGamesResponse> {
  const res = await fetch("/api/ai/recommend-games", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ careerPrompt, testFixtureMode })
  });
  return (await res.json()) as RecommendGamesResponse;
}

export async function requestConversationalEdit(
  project: DreamProject,
  userRequest: string,
  testFixtureMode?: boolean
): Promise<ConversationalEditResponse> {
  const res = await fetch("/api/ai/edit", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, userRequest, testFixtureMode })
  });
  return (await res.json()) as ConversationalEditResponse;
}

export async function bundlePreviewHtml(
  files: Record<string, string>,
  componentGraph: ComponentGraph
): Promise<string> {
  const res = await fetch("/api/preview/bundle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files, componentGraph })
  });
  if (!res.ok) {
    throw new Error("미리보기 번들 생성에 실패했습니다.");
  }
  const data = (await res.json()) as { previewHtml: string };
  return data.previewHtml;
}
