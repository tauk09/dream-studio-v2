import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../server.js";
import { validateGeneratedCode } from "../validator/CodeValidator.js";
import {
  FailoverLLMProvider,
  RetryableProviderError,
  type LLMProvider
} from "../providers/LLMProvider.js";

describe("Dream Studio 2.0 API (Auth Gate, GenerationJob, Security Validator, Repair Agent)", () => {
  const app = buildServer(false, null, ":memory:");
  let authCookie = "";

  beforeAll(async () => {
    await app.ready();
    const reg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "creator@school.kr", password: "password123", displayName: "테스트 크리에이터" }
    });
    authCookie = String(reg.headers["set-cookie"] ?? "").split(";")[0]!;
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires login before starting AI generation (401 AUTH_REQUIRED)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/jobs",
      payload: { kind: "website", prompt: "컴퓨터 교사", designIntent: "모던" }
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().errorCode).toBe("AUTH_REQUIRED");
  });

  it("honestly rejects live AI job with 503 AI_NOT_CONFIGURED when authenticated but no API key is configured", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/jobs",
      headers: { cookie: authCookie },
      payload: { kind: "website", prompt: "컴퓨터 교사가 되고 싶어요", designIntent: "깔끔하고 모던하게" }
    });
    expect(res.statusCode).toBe(503);
    expect(res.json().errorCode).toBe("AI_NOT_CONFIGURED");
  });

  it("blocks dangerous APIs, path traversal, and JS syntax errors in CodeValidator", () => {
    const bad = validateGeneratedCode(
      {
        "../escape.js": "console.log(1)",
        "index.html": "<!doctype html><html><body></body></html>",
        "app.js": "fetch('https://evil.test'); eval('1'); function broken( {"
      },
      "website"
    );
    expect(bad.ok).toBe(false);
    expect(bad.securityPassed).toBe(false);
    expect(bad.syntaxPassed).toBe(false);
  });

  it("runs GenerationJob end-to-end in isolated testFixtureMode and produces CSP-hardened previewHtml", async () => {
    const startRes = await app.inject({
      method: "POST",
      url: "/api/ai/jobs",
      headers: { cookie: authCookie },
      payload: {
        kind: "website",
        prompt: "컴퓨터 교사가 되고 싶어요",
        designIntent: "깔끔하고 모던하게",
        testFixtureMode: true
      }
    });
    expect(startRes.statusCode).toBe(202);
    const { jobId } = startRes.json();

    let job: { status: string; project?: { generatorSource: string }; previewHtml?: string } = { status: "running" };
    for (let i = 0; i < 10 && job.status === "running"; i++) {
      await new Promise((r) => setTimeout(r, 20));
      const poll = await app.inject({ method: "GET", url: `/api/ai/jobs/${jobId}` });
      job = poll.json();
    }
    expect(job.status).toBe("completed");
    expect(job.project?.generatorSource).toBe("dev_fixture");
    expect(job.previewHtml).toContain("Content-Security-Policy");
    expect(job.previewHtml).toContain("connect-src 'none'");
  });

  it("repairs invalid LLM output automatically on retry with live_ai provider", async () => {
    let buildCalls = 0;
    const flakyLLM: LLMProvider = {
      providerName: "gemini",
      modelName: "gemini-3-flash-preview",
      async generateJson<T>(req: { systemPrompt: string }): Promise<T> {
        if (req.systemPrompt.includes("수석 프로덕트 아키텍트")) {
          return {
            title: "복구된 컴퓨터 교실",
            careerGoal: "컴퓨터 교사",
            extractedRequirements: ["코딩 체험"],
            visualDesignSpec: { atmosphere: "모던" },
            sectionsOrScenes: ["메인"],
            interactiveFeatures: [{ name: "체험", trigger: "클릭", behavior: "문구 변경" }],
            domIds: ["t"]
          } as T;
        }
        buildCalls += 1;
        return {
          title: "복구된 컴퓨터 교실",
          careerGoal: "컴퓨터 교사",
          blueprint: {
            creativeGoal: "코딩 체험",
            targetAudience: "학생",
            pagesOrScenes: ["메인"],
            requiredFeatures: ["체험"],
            interactionPlan: "클릭",
            visualDirection: "모던",
            acceptanceCriteria: ["실행"]
          },
          files: {
            "index.html": "<!doctype html><html><body><h1 id='t'>Hi</h1></body></html>",
            "styles.css": "body{margin:0}",
            "app.js": buildCalls === 1 ? "fetch('https://blocked.test');" : "document.getElementById('t').textContent='OK';"
          },
          componentGraph: { nodes: [] }
        } as T;
      }
    };

    const liveApp = buildServer(false, flakyLLM, ":memory:");
    await liveApp.ready();
    const reg = await liveApp.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "live@school.kr", password: "password123", displayName: "라이브" }
    });
    const liveCookie = String(reg.headers["set-cookie"] ?? "").split(";")[0]!;

    const res = await liveApp.inject({
      method: "POST",
      url: "/api/ai/jobs",
      headers: { cookie: liveCookie },
      payload: { kind: "website", prompt: "컴퓨터 교사", designIntent: "모던" }
    });
    const { jobId } = res.json();
    let job: { status: string; retryCount?: number; project?: { generatorSource: string } } = { status: "running" };
    for (let i = 0; i < 15 && job.status === "running"; i++) {
      await new Promise((r) => setTimeout(r, 20));
      job = (await liveApp.inject({ method: "GET", url: `/api/ai/jobs/${jobId}` })).json();
    }
    expect(job.status).toBe("completed");
    expect(job.retryCount).toBe(1);
    expect(job.project?.generatorSource).toBe("live_ai");
    await liveApp.close();
  });

  it("automatically fails over to the next provider slot on HTTP 429 rate limits", async () => {
    const rateLimited: LLMProvider = {
      providerName: "github",
      modelName: "openai/gpt-4.1-mini",
      async generateJson() {
        throw new RetryableProviderError("Rate limit exceeded", 429);
      }
    };
    const healthyBackup: LLMProvider = {
      providerName: "gemini",
      modelName: "gemini-3-flash-preview",
      async generateJson<T>() {
        return { ok: true, from: "backup" } as T;
      }
    };
    const pool = new FailoverLLMProvider([
      { id: "slot_primary", provider: rateLimited },
      { id: "slot_backup", provider: healthyBackup }
    ]);
    const result = await pool.generateJson<{ ok: boolean; from: string }>({
      systemPrompt: "test",
      userPrompt: "test"
    });
    expect(result).toEqual({ ok: true, from: "backup" });
  });

  it("supports account register/login, cloud project sync, and cross-device published URLs", async () => {
    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: authCookie }
    });
    expect(me.json().authenticated).toBe(true);
    expect(me.json().user.displayName).toBe("테스트 크리에이터");

    const pub = await app.inject({
      method: "POST",
      url: "/api/publish",
      headers: { cookie: authCookie },
      payload: {
        slug: "minsu-demo-01",
        projectId: "proj_demo_1",
        kind: "website",
        title: "민수의 포트폴리오",
        summary: "타 기기 공유 테스트",
        previewHtml: "<!doctype html><html><body><h1>Hello Cloud</h1></body></html>",
        isDevFixture: false
      }
    });
    expect(pub.statusCode).toBe(201);

    const friendFetch = await app.inject({
      method: "GET",
      url: "/api/published/minsu-demo-01"
    });
    expect(friendFetch.statusCode).toBe(200);
    expect(friendFetch.json().snapshot.authorName).toBe("테스트 크리에이터");
    expect(friendFetch.json().snapshot.previewHtml).toContain("Hello Cloud");
  });

  it("enforces admin RBAC and exposes real user & AI usage overview to admins", async () => {
    // Second registered user defaults to 'user' role and must get 403 on /api/admin/overview
    const secondReg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "student2@school.kr", password: "password123", displayName: "일반 학생" }
    });
    expect(secondReg.statusCode).toBe(201);
    expect(secondReg.json().user.role).toBe("user");
    const studentCookie = String(secondReg.headers["set-cookie"] ?? "").split(";")[0]!;

    const denied = await app.inject({
      method: "GET",
      url: "/api/admin/overview",
      headers: { cookie: studentCookie }
    });
    expect(denied.statusCode).toBe(403);

    // First registered user (authCookie) is automatically 'admin' and receives overview
    const allowed = await app.inject({
      method: "GET",
      url: "/api/admin/overview",
      headers: { cookie: authCookie }
    });
    expect(allowed.statusCode).toBe(200);
    const body = allowed.json();
    expect(body.overview.summary.totalUsers).toBeGreaterThanOrEqual(2);
    expect(body.overview.summary.totalAiCalls).toBeGreaterThanOrEqual(1);
    expect(body.overview.recentLogs.length).toBeGreaterThanOrEqual(1);
  });
});
