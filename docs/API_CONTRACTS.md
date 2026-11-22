# Dream Studio 2.0 — API Contracts (`@dream-studio-v2/api`)

Base URL (개발 환경): `http://127.0.0.1:4000` (Vite 프록시 `/api/*`)

| Method & Path | 요청 바디 | 성공 응답 | 오류 응답 |
| :--- | :--- | :--- | :--- |
| `GET /api/health` | 없음 | `200 { status: "ok", service, aiConfigured, provider }` | - |
| `GET /api/ai/status` | 없음 | `200 { configured, provider, model, message }` | - |
| `POST /api/ai/jobs` | `{ kind, prompt, designIntent?, extraNotes?, testFixtureMode? }` | `202 { ok: true, jobId }` | `400`, `429`, `503 AI_NOT_CONFIGURED` |
| `GET /api/ai/jobs/:jobId` | 없음 | `200 GenerationJob` | `404` |
| `POST /api/ai/jobs/:jobId/cancel` | 없음 | `200 { ok: boolean }` | - |
| `POST /api/ai/recommend-games` | `{ careerPrompt, testFixtureMode? }` | `200 { ok: true, source, ideas: GameIdeaRecommendation[] }` | `400`, `503 AI_NOT_CONFIGURED` |
| `POST /api/ai/edit` | `{ project: DreamProject, userRequest, testFixtureMode? }` | `200 { ok: true, pendingChange: PendingCodeChange }` | `400`, `422`, `429`, `503 AI_NOT_CONFIGURED` |
| `POST /api/preview/bundle` | `{ files, componentGraph }` | `200 { previewHtml: string }` | `400` |

## 보안 및 속도 제한
- 본문 크기 상한: `640 KiB` (`Fastify bodyLimit`)
- IP 기반 속도 제한: 10분당 40회 (`/api/ai/jobs`, `/api/ai/edit`)
- 엄격한 Zod `.strict()` 스키마 검증 적용
