import {
  ComponentGraphSchema,
  DreamProjectSchema,
  GameDefinitionSchema,
  GameIdeaRecommendationSchema,
  ProjectBlueprintSchema,
  SCHEMA_VERSION_V2,
  computeDreamProjectHash,
  type DreamProject,
  type GameIdeaRecommendation,
  type PendingCodeChange,
  type ProjectKind
} from "@dream-studio-v2/core";
import { z } from "zod";
import {
  buildDevFixtureGameIdeas,
  buildDevFixtureProject
} from "../fixtures/DevFixtureProvider.js";
import type { GenerationJobStore } from "../jobs/GenerationJobStore.js";
import { resolveLLMProvider, type LLMProvider } from "../providers/LLMProvider.js";
import { buildSandboxedPreviewHtml } from "../sandbox/PreviewBundler.js";
import { validateGeneratedCode } from "../validator/CodeValidator.js";

const LLMProjectOutputSchema = z.object({
  title: z.string().min(1).max(80),
  careerGoal: z.string().min(1).max(60),
  blueprint: ProjectBlueprintSchema,
  files: z.record(z.string(), z.string()),
  componentGraph: ComponentGraphSchema,
  gameDefinition: GameDefinitionSchema.optional()
});

const LLMEditOutputSchema = z.object({
  summaryKo: z.string().min(1).max(200),
  diffItems: z.array(z.string().min(1)).min(1).max(10),
  requiresGameRestart: z.boolean().default(false),
  filePatches: z.record(z.string(), z.string()),
  componentGraph: ComponentGraphSchema
});

const LLMGameIdeasOutputSchema = z.object({
  ideas: z.array(GameIdeaRecommendationSchema).min(1).max(5)
});

const SYSTEM_CODEGEN_PROMPT = `당신은 Dream Studio 2.0의 AI Creative Planner & Code Generator입니다.
고정 템플릿에 텍스트만 바꾸지 말고, 학생의 요청마다 완전히 새로운 레이아웃·컴포넌트·게임 로직 코드를 생성해 순수 JSON 객체 하나만 반환하세요.

규칙:
1. files에는 최소 "index.html", "styles.css", 그리고 "app.js" (게임이면 "game.js")를 포함하세요.
2. 보안 금지: eval, new Function, fetch, XMLHttpRequest, WebSocket, document.cookie, localStorage, window.top, 외부 CDN <script src="http..."> 절대 금지.
3. 생성 코드는 window.__DREAM_CONFIG__에서 블록 편집 값을 읽고 window.onDreamConfigUpdate(fn) 콜백을 등록해야 합니다.
4. componentGraph.nodes에는 블록 편집 가능 항목(editableVia: "block")과 AI 수정 항목(editableVia: "ai_only")을 명확히 구분하세요.
5. 학생이 제공하지 않은 개인 경력·수상 이력을 사실처럼 지어내지 말고, 예시 데이터는 blueprint.exampleDataDisclaimerKo에 명시하세요.
6. JSON 안정성: files의 HTML 속성(class='...', id='...')과 JS 문자열 내부에서는 큰따옴표(") 대신 작은따옴표(')를 우선 사용해 JSON 파싱 오류를 원천 방지하세요.

반드시 아래 정확한 JSON 키 구조를 따르세요 (추가 키 금지, 특히 "label" 대신 반드시 "labelKo" 사용):
{
  "title": "작품 제목 (최대 80자)",
  "careerGoal": "장래희망 또는 주제 (최대 60자)",
  "blueprint": {
    "creativeGoal": "창작 목표 (최대 300자)",
    "targetAudience": "대상 사용자",
    "pagesOrScenes": ["메인 화면"],
    "requiredFeatures": ["핵심 기능 1", "핵심 기능 2"],
    "interactionPlan": "상호작용 방식 설명",
    "visualDirection": "시각 디자인 방향",
    "acceptanceCriteria": ["오류 없이 실행", "인터랙션 정상 동작"]
  },
  "files": {
    "index.html": "<!doctype html>...",
    "styles.css": "body { ... }",
    "app.js": "// window.__DREAM_CONFIG__ & window.onDreamConfigUpdate 사용"
  },
  "componentGraph": {
    "nodes": [
      {
        "id": "node_hero",
        "name": "HeroSection",
        "labelKo": "첫 화면 영역",
        "kind": "section",
        "parentId": null,
        "childrenIds": [],
        "sourceFile": "index.html",
        "editableVia": "block",
        "editableProperties": [
          { "key": "siteTitle", "labelKo": "제목", "type": "text", "value": "제목값" },
          { "key": "accentColor", "labelKo": "포인트 색상", "type": "color", "value": "#6858F5" }
        ]
      }
    ]
  }
}
주의:
- node.kind는 반드시 "section" | "component" | "game_object" | "game_rule" | "style" 중 하나
- editableProperties[].type은 반드시 "text" | "textarea" | "color" | "number" | "boolean" 중 하나`;

const SYSTEM_EDIT_PROMPT = `당신은 Dream Studio 2.0의 시니어 디버거 & AI 코드 수정 에이전트입니다.
현재 files, existingFileNames, componentGraph, 그리고 runtimeError(실제 브라우저 실행 오류)와 recentHistory(이전에 시도한 수정 요청)를 꼼꼼히 읽고 근본 원인을 찾아 완전히 해결한 수정 코드를 순수 JSON으로 반환하세요.

[절대 준수 규칙]
1. 먼저 "rootCauseDiagnosisKo"에 실제 버그의 근본 원인(예: 어느 파일 몇 번째 로직/DOM ID 불일치/상태 초기화 누락/충돌 판정 오류)을 구체적으로 분석하세요.
2. recentHistory에 비슷한 요청이 있었다면, 이전에 했던 표면적 수정이 실패했다는 뜻이므로 코드를 처음부터 다시 점검해 진짜 원인을 근본적으로 고치세요.
3. "filePatches"에는 반드시 existingFileNames에 이미 존재하는 파일명만 사용하세요! (예: game.js가 있는데 app.js나 script.js를 새로 만들면 두 파일이 중복 실행되어 심각한 오류가 납니다.)
4. filePatches의 값은 수정된 파일의 **완전한 전체 소스 코드**여야 합니다. 절대 "// 기존 코드 생략"이나 "..."으로 줄이지 마세요.
5. index.html의 모든 id와 JS의 getElementById/querySelector가 100% 일치하는지, 이벤트 리스너와 게임 재시작 초기화가 정상 동작하는지 검증하세요.
6. HTML 속성 및 JS 문자열 내부에서는 작은따옴표(')를 우선 사용해 JSON 파싱 오류를 방지하세요.
7. 보안 금지: eval, new Function, fetch, XMLHttpRequest, WebSocket, document.cookie, localStorage, 외부 CDN 스크립트.

응답 JSON 형식:
{
  "rootCauseDiagnosisKo": "원인 분석 (1~2문장)",
  "summaryKo": "수정 내용 요약 (한국어)",
  "diffItems": ["구체적 변경사항 1", "구체적 변경사항 2"],
  "requiresGameRestart": true,
  "filePatches": { "기존파일명": "수정된 전체 코드" },
  "componentGraph": { "nodes": [...] }
}`;

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asString(v: unknown, fallback: string, maxLen?: number): string {
  const s = typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
  return maxLen ? s.slice(0, maxLen) : s;
}

function asStringArray(v: unknown, fallback: string[], maxItems = 10, maxLen = 150): string[] {
  if (!Array.isArray(v)) return fallback;
  const cleaned = v
    .map((x) => (typeof x === "string" ? x.trim().slice(0, maxLen) : ""))
    .filter(Boolean)
    .slice(0, maxItems);
  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizePropertyType(rawType: unknown, value: unknown): "text" | "textarea" | "color" | "number" | "boolean" {
  const t = String(rawType ?? "").toLowerCase();
  if (t === "textarea" || t === "multiline" || t === "longtext") return "textarea";
  if (t === "color" || t === "colour" || t === "hex") return "color";
  if (t === "number" || t === "range" || t === "slider" || t === "int" || t === "integer" || t === "float") return "number";
  if (t === "boolean" || t === "bool" || t === "toggle" || t === "checkbox") return "boolean";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.trim())) return "color";
  return "text";
}

function normalizeNodeKind(rawKind: unknown): "section" | "component" | "game_object" | "game_rule" | "style" {
  const k = String(rawKind ?? "").toLowerCase();
  if (k === "section" || k === "component" || k === "game_object" || k === "game_rule" || k === "style") {
    return k;
  }
  if (k.includes("game") && k.includes("rule")) return "game_rule";
  if (k.includes("game") || k.includes("entity") || k.includes("object")) return "game_object";
  if (k.includes("style") || k.includes("theme")) return "style";
  return "section";
}

function normalizeComponentGraph(rawGraph: unknown): unknown {
  const g = asRecord(rawGraph);
  const rawNodes = Array.isArray(g["nodes"]) ? g["nodes"] : [];
  const nodes = rawNodes.map((n, idx) => {
    const rec = asRecord(n);
    const id = asString(rec["id"], `node_${idx + 1}`, 64);
    const name = asString(rec["name"], `Block${idx + 1}`, 64);
    const labelKo = asString(rec["labelKo"] ?? rec["label"] ?? rec["title"] ?? rec["name"], `구성요소 ${idx + 1}`, 64);
    const rawProps = Array.isArray(rec["editableProperties"])
      ? rec["editableProperties"]
      : Array.isArray(rec["properties"])
        ? rec["properties"]
        : [];
    const editableProperties = rawProps.slice(0, 20).map((p, pIdx) => {
      const pr = asRecord(p);
      const rawVal = pr["value"] ?? pr["defaultValue"] ?? pr["default"] ?? "";
      const type = normalizePropertyType(pr["type"], rawVal);
      let value: string | number | boolean;
      if (type === "number") {
        const num = Number(rawVal);
        value = Number.isFinite(num) ? num : 10;
      } else if (type === "boolean") {
        value = Boolean(rawVal);
      } else {
        value = String(rawVal);
      }
      const out: Record<string, unknown> = {
        key: asString(pr["key"] ?? pr["name"], `prop_${pIdx + 1}`, 64),
        labelKo: asString(pr["labelKo"] ?? pr["label"] ?? pr["key"], `속성 ${pIdx + 1}`, 64),
        type,
        value
      };
      if (type === "number") {
        if (typeof pr["min"] === "number" && Number.isFinite(pr["min"])) out["min"] = pr["min"];
        if (typeof pr["max"] === "number" && Number.isFinite(pr["max"])) out["max"] = pr["max"];
        if (typeof pr["step"] === "number" && Number.isFinite(pr["step"])) out["step"] = pr["step"];
      }
      return out;
    });

    const editableVia =
      rec["editableVia"] === "ai_only" || (rec["editableVia"] !== "block" && editableProperties.length === 0)
        ? "ai_only"
        : "block";

    const nodeOut: Record<string, unknown> = {
      id,
      name,
      labelKo,
      kind: normalizeNodeKind(rec["kind"]),
      parentId: typeof rec["parentId"] === "string" ? rec["parentId"] : null,
      childrenIds: Array.isArray(rec["childrenIds"])
        ? rec["childrenIds"].filter((c): c is string => typeof c === "string")
        : [],
      sourceFile: asString(rec["sourceFile"], "index.html", 80),
      editableVia,
      editableProperties
    };
    if (typeof rec["aiEditHintKo"] === "string" && rec["aiEditHintKo"].trim()) {
      nodeOut["aiEditHintKo"] = rec["aiEditHintKo"].trim().slice(0, 180);
    }
    if (typeof rec["interactionSummary"] === "string" && rec["interactionSummary"].trim()) {
      nodeOut["interactionSummary"] = rec["interactionSummary"].trim().slice(0, 160);
    }
    return nodeOut;
  });

  if (nodes.length === 0) {
    nodes.push({
      id: "node_main",
      name: "MainSection",
      labelKo: "기본 설정",
      kind: "section",
      parentId: null,
      childrenIds: [],
      sourceFile: "index.html",
      editableVia: "block",
      editableProperties: [
        { key: "siteTitle", labelKo: "작품 제목", type: "text", value: "나의 Dream Studio 작품" }
      ]
    });
  }
  return { nodes };
}

function normalizeLLMProjectOutput(raw: unknown, input: StartGenerationInput): unknown {
  const rec = asRecord(raw);
  const bp = asRecord(rec["blueprint"]);
  const blueprint: Record<string, unknown> = {
    creativeGoal: asString(bp["creativeGoal"] ?? bp["summary"], input.prompt, 300),
    targetAudience: asString(bp["targetAudience"], "학생과 방문자", 160),
    pagesOrScenes: asStringArray(bp["pagesOrScenes"], ["메인 화면"], 12, 120),
    requiredFeatures: asStringArray(bp["requiredFeatures"], ["맞춤형 인터랙션"], 12, 160),
    interactionPlan: asString(bp["interactionPlan"], "클릭 및 키보드 상호작용", 300),
    visualDirection: asString(bp["visualDirection"], input.designIntent, 200),
    acceptanceCriteria: asStringArray(bp["acceptanceCriteria"], ["오류 없이 실행"], 10, 160)
  };
  if (typeof bp["exampleDataDisclaimerKo"] === "string" && bp["exampleDataDisclaimerKo"].trim()) {
    blueprint["exampleDataDisclaimerKo"] = bp["exampleDataDisclaimerKo"].trim().slice(0, 240);
  }

  const out: Record<string, unknown> = {
    title: asString(rec["title"], "나의 새로운 창작 작품", 80),
    careerGoal: asString(rec["careerGoal"], input.prompt.slice(0, 40), 60),
    blueprint,
    files: asRecord(rec["files"]),
    componentGraph: normalizeComponentGraph(rec["componentGraph"])
  };

  if (rec["gameDefinition"] && typeof rec["gameDefinition"] === "object") {
    const gd = asRecord(rec["gameDefinition"]);
    out["gameDefinition"] = {
      gameplayLoop: asString(gd["gameplayLoop"], "조작하며 목표를 달성하는 루프", 260),
      scenes: asStringArray(gd["scenes"], ["타이틀", "플레이", "결과"]),
      objects: asStringArray(gd["objects"], ["플레이어", "목표 오브젝트"]),
      playerActions: asStringArray(gd["playerActions"], ["이동", "상호작용"]),
      rules: asStringArray(gd["rules"], ["점수 획득"]),
      states: asStringArray(gd["states"], ["ready", "playing", "ended"]),
      winConditions: asStringArray(gd["winConditions"], ["목표 점수 달성"]),
      loseConditions: asStringArray(gd["loseConditions"], ["제한 시간 종료"])
    };
  }
  return out;
}

const SYSTEM_WEBSITE_CODEGEN_PROMPT = `${SYSTEM_CODEGEN_PROMPT}

[웹사이트 제작 전용 필수 요구사항 — 실제 서비스 수준의 풍부한 완성도]
1. 학생의 요청(studentPrompt + extraNotes)에 등장하는 모든 주제·고유명사·원하는 기능을 하나도 빠짐없이 정확히 구현하세요.
2. 단순한 제목+문단 1~2개짜리 빈약한 페이지 금지! 반드시 아래 5개 이상의 완성된 섹션을 포함하세요:
   - 상단 내비게이션 바 (브랜드명 + 섹션 이동 링크 + 강조 배지)
   - 시각적 임팩트가 있는 히어로 섹션 (그라데이션/카드 레이아웃 + 핵심 제목·부제목 + 주요/보조 CTA 버튼 + 주제 관련 미니 프리뷰/요약 카드)
   - **주제에 특화된 실제 동작하는 JavaScript 인터랙티브 체험 위젯 2개 이상** (예: 계산기/시뮬레이터, 탭 필터 갤러리, 실시간 체크리스트+진행률 바, 인터랙티브 퀴즈+점수판 등)
   - 핵심 특징·정보 카드 그리드 (3~4개 카드, 깔끔한 인라인 SVG 아이콘 포함)
   - 활동/진로 로드맵 또는 FAQ 아코디언 + 깔끔한 푸터
3. 무결성: app.js에서 참조하는 모든 DOM ID(getElementById/querySelector)가 index.html에 정확히 존재해야 하며, 모든 버튼 클릭 시 즉시 눈에 보이는 피드백이 동작해야 합니다.
4. 시각 디자인: 충분한 여백(padding 48~72px), 카드 그림자, 호버 애니메이션, 반응형 그리드(모바일·PC 모두 깨지지 않음)를 styles.css에 세심하게 작성하세요.
5. 블록 편집 확장성: componentGraph.nodes에 최소 4개 이상의 노드(히어로 제목/부제목/CTA, 테마 강조색·배경색, 인터랙티브 위젯 설정값, 푸터 문구 등)를 배치하고 window.__DREAM_CONFIG__와 window.onDreamConfigUpdate에 연결하세요.`;

const SYSTEM_GAME_CODEGEN_PROMPT = `${SYSTEM_CODEGEN_PROMPT}

[게임 제작 전용 필수 요구사항 — 반드시 준수]
1. 학생이 설명한 게임의 테마·배경·플레이어 캐릭터·장애물·수집물·규칙·승패 조건을 100% 충실히 구현하세요. (설명과 무관한 엉뚱한 미니게임이나 단순 클릭 카운터 금지!)
2. HTML5 <canvas> 기반의 2D 게임 루프(requestAnimationFrame + clamp된 deltaTime <= 0.05)를 "game.js"에 작성하세요. <canvas>는 명시적인 width/height(예: 800x480)와 CSS max-width:100%를 가져야 합니다.
3. 시각적 완성도: 단색 네모만 띄우지 말고, Canvas 2D API(그라데이션 배경, 캐릭터 디테일, 아이콘/도형 조합, 충돌 파티클·플래시 피드백, 진행 바)로 테마가 한눈에 느껴지게 그리세요.
4. 조작성 & 버그 방지:
   - 키보드(방향키/WASD/Space) 입력 시 방향키·Space에 e.preventDefault()를 호출해 화면 스크롤을 막으세요.
   - 화면 하단에 터치/마우스 버튼(좌·우·점프/액션 등)을 함께 제공해 모바일에서도 플레이 가능하게 하세요.
   - game.js에서 참조하는 모든 DOM ID가 index.html에 정확히 존재해야 합니다.
5. 게임 흐름: 시작 오버레이(게임 제목 + 조작법 + [게임 시작] 버튼) → 실시간 플레이(상단 HUD: 점수·남은시간/체력·목표) → 승리/게임오버 결과 화면([다시 도전] 버튼으로 모든 상태·배열·타이머를 100% 초기화).
6. componentGraph.nodes에는 gameTitle(text), playerSpeed(number), timeLimit(number), accentColor(color) 등 실제 게임 밸런스에 즉시 반영되는 블록 속성을 반드시 연결하세요.`;

const recommendationCache = new Map<
  string,
  { expiresAt: number; ideas: GameIdeaRecommendation[] }
>();
const RECOMMENDATION_TTL_MS = 10 * 60 * 1000;

const MAX_REPAIRS = 2;

export interface StartGenerationInput {
  kind: ProjectKind;
  prompt: string;
  designIntent: string;
  extraNotes?: string;
  testFixtureMode?: boolean;
}

export class StudioOrchestrator {
  private readonly jobs: GenerationJobStore;
  private readonly injectedProvider?: LLMProvider | null;

  constructor(jobs: GenerationJobStore, injectedProvider?: LLMProvider | null) {
    this.jobs = jobs;
    this.injectedProvider = injectedProvider;
  }

  private getProvider(): LLMProvider | null {
    if (this.injectedProvider !== undefined) return this.injectedProvider;
    return resolveLLMProvider();
  }

  startGenerationJob(input: StartGenerationInput): {
    ok: boolean;
    errorCode?: "AI_NOT_CONFIGURED";
    message?: string;
    jobId?: string;
  } {
    const provider = this.getProvider();
    if (!provider && !input.testFixtureMode) {
      return {
        ok: false,
        errorCode: "AI_NOT_CONFIGURED",
        message:
          "실제 AI API 키가 설정되지 않았습니다. apps/api/.env에 GEMINI_API_KEY, OPENAI_API_KEY 또는 ANTHROPIC_API_KEY를 설정해 주세요."
      };
    }

    const job = this.jobs.create(
      input.kind,
      provider ? `${provider.providerName}/${provider.modelName}` : "dev-fixture-test-mode"
    );

    void this.executeJob(job.jobId, input, provider);
    return { ok: true, jobId: job.jobId };
  }

  private async executeJob(
    jobId: string,
    input: StartGenerationInput,
    provider: LLMProvider | null
  ): Promise<void> {
    try {
      this.jobs.updateStage(jobId, "planning_concept");

      if (input.testFixtureMode) {
        this.jobs.updateStage(jobId, "generating_code");
        const fx = buildDevFixtureProject(input.kind, input.prompt, input.designIntent);
        this.jobs.updateStage(jobId, "validating_build");
        const val = validateGeneratedCode(fx.files, input.kind);
        if (!val.ok) {
          this.jobs.fail(jobId, val.errors.join(" / "));
          return;
        }
        const now = new Date().toISOString();
        const project = this.assembleProject({
          kind: input.kind,
          prompt: input.prompt,
          designIntent: input.designIntent,
          generatorSource: "dev_fixture",
          providerName: "dev-fixture",
          modelName: "deterministic-test",
          repairAttempts: 0,
          data: fx,
          validation: val,
          now
        });
        const previewHtml = buildSandboxedPreviewHtml(project.source.files, project.componentGraph);
        this.jobs.complete(jobId, project, previewHtml);
        return;
      }

      const active = provider!;
      const systemPrompt =
        input.kind === "game" ? SYSTEM_GAME_CODEGEN_PROMPT : SYSTEM_WEBSITE_CODEGEN_PROMPT;
      this.jobs.updateStage(jobId, "generating_code");
      let raw: unknown;
      let genAttempt = 0;
      while (true) {
        try {
          raw = await active.generateJson<unknown>({
            systemPrompt,
            maxOutputTokens: 16384,
            temperature: genAttempt === 0 ? 0.35 : 0.2,
            userPrompt: JSON.stringify({
              kind: input.kind,
              studentPrompt: input.prompt,
              designIntent: input.designIntent,
              extraNotes:
                genAttempt === 0
                  ? (input.extraNotes ?? "")
                  : `${input.extraNotes ?? ""} (중요: 반드시 RFC8259 표준 JSON만 출력하고 문자열 내부 따옴표와 줄바꿈을 정확히 이스케이프하세요.)`
            })
          });
          break;
        } catch (genErr) {
          genAttempt += 1;
          if (genAttempt > 2 || this.jobs.get(jobId)?.status === "cancelled") {
            throw genErr;
          }
          this.jobs.updateStage(jobId, "repairing_code", genAttempt);
        }
      }

      this.jobs.updateStage(jobId, "validating_build");
      let parsed = LLMProjectOutputSchema.safeParse(normalizeLLMProjectOutput(raw, input));
      let val = parsed.success ? validateGeneratedCode(parsed.data.files, input.kind) : null;
      let repairs = 0;

      while ((!parsed.success || !val?.ok) && repairs < MAX_REPAIRS) {
        if (this.jobs.get(jobId)?.status === "cancelled") return;
        repairs += 1;
        this.jobs.updateStage(jobId, "repairing_code", repairs);
        const errors = !parsed.success
          ? parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
          : val!.errors;
        raw = await active.generateJson<unknown>({
          systemPrompt,
          maxOutputTokens: 16384,
          userPrompt: JSON.stringify({
            task: "REPAIR_CODE",
            originalInput: input,
            validationErrors: errors,
            previousOutput: raw
          }),
          temperature: 0.2
        });
        this.jobs.updateStage(jobId, "validating_build", repairs);
        parsed = LLMProjectOutputSchema.safeParse(normalizeLLMProjectOutput(raw, input));
        val = parsed.success ? validateGeneratedCode(parsed.data.files, input.kind) : null;
      }

      if (!parsed.success || !val || !val.ok) {
        const msg = !parsed.success
          ? parsed.error.issues.map((i) => i.message).join(" / ")
          : (val?.errors.join(" / ") ?? "코드 검증 실패");
        this.jobs.fail(jobId, `자동 복구(${repairs}회) 후에도 검증을 통과하지 못했습니다: ${msg}`);
        return;
      }

      const now = new Date().toISOString();
      const project = this.assembleProject({
        kind: input.kind,
        prompt: input.prompt,
        designIntent: input.designIntent,
        generatorSource: "live_ai",
        providerName: active.providerName,
        modelName: active.modelName,
        repairAttempts: repairs,
        data: parsed.data,
        validation: val,
        now
      });
      const previewHtml = buildSandboxedPreviewHtml(project.source.files, project.componentGraph);
      this.jobs.complete(jobId, project, previewHtml);
    } catch (err) {
      this.jobs.fail(jobId, err instanceof Error ? err.message : "생성 중 오류가 발생했습니다.");
    }
  }

  async recommendGameIdeas(
    careerPrompt: string,
    testFixtureMode?: boolean
  ): Promise<{
    ok: boolean;
    errorCode?: "AI_NOT_CONFIGURED" | "FAILED";
    message?: string;
    source?: "live_ai" | "dev_fixture";
    ideas?: GameIdeaRecommendation[];
  }> {
    const provider = this.getProvider();
    if (!provider && !testFixtureMode) {
      return {
        ok: false,
        errorCode: "AI_NOT_CONFIGURED",
        message: "실제 AI API 키가 설정되지 않아 게임 아이디어를 추천할 수 없습니다."
      };
    }
    if (testFixtureMode) {
      return { ok: true, source: "dev_fixture", ideas: buildDevFixtureGameIdeas(careerPrompt) };
    }
    const cacheKey = careerPrompt.trim().toLowerCase();
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { ok: true, source: "live_ai", ideas: cached.ideas };
    }
    try {
      const raw = await provider!.generateJson<unknown>({
        systemPrompt: [
          "학생의 진로/아이디어를 분석해 서로 다른 메커니즘의 실현 가능한 2D 웹 게임 아이디어 3개를 추천하세요. 객관식 퀴즈 게임은 제외하세요.",
          "반드시 아래 정확한 키만 포함하는 순수 JSON 객체로 응답하세요 (추가 키 금지):",
          '{ "ideas": [ { "id": "idea_1", "title": "제목(최대60자)", "genre": "장르", "oneLiner": "한줄설명", "coreGameplay": "핵심 플레이 루프", "controls": "조작법", "goal": "목표", "careerConnection": "진로 연관성", "feasible": true, "difficultyLabel": "쉬움" | "보통" | "도전" } ] }'
        ].join("\n"),
        userPrompt: JSON.stringify({ careerPrompt })
      });
      const parsed = LLMGameIdeasOutputSchema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, errorCode: "FAILED", message: "추천 응답 형식 검증에 실패했습니다." };
      }
      recommendationCache.set(cacheKey, {
        expiresAt: Date.now() + RECOMMENDATION_TTL_MS,
        ideas: parsed.data.ideas
      });
      return { ok: true, source: "live_ai", ideas: parsed.data.ideas };
    } catch (err) {
      return { ok: false, errorCode: "FAILED", message: err instanceof Error ? err.message : "추천 실패" };
    }
  }

  async planConversationalEdit(
    project: DreamProject,
    userRequest: string,
    testFixtureMode?: boolean,
    context?: { runtimeError?: string; recentHistory?: string[] }
  ): Promise<{
    ok: boolean;
    errorCode?: "AI_NOT_CONFIGURED" | "VALIDATION_FAILED" | "FAILED";
    message: string;
    pendingChange?: PendingCodeChange;
  }> {
    const provider = this.getProvider();
    if (!provider && !testFixtureMode) {
      return {
        ok: false,
        errorCode: "AI_NOT_CONFIGURED",
        message: "실제 AI API 키가 설정되지 않아 AI 코드 수정을 실행할 수 없습니다."
      };
    }

    const now = new Date().toISOString();

    if (!provider && testFixtureMode) {
      const nextFiles = structuredClone(project.source.files);
      const nextGraph = structuredClone(project.componentGraph);
      const changedFiles: string[] = [];
      const diffItems: string[] = [];

      if (userRequest.includes("구름")) {
        nextFiles["styles.css"] = `${nextFiles["styles.css"] ?? ""}\n.v2-clouds{position:fixed;top:6px;left:0;right:0;pointer-events:none;font-size:24px;opacity:.55;animation:v2Cloud 12s linear infinite}@keyframes v2Cloud{0%{transform:translateX(-10%)}100%{transform:translateX(100%)}}\n`;
        nextFiles["index.html"] = (nextFiles["index.html"] ?? "").replace(
          /<body([^>]*)>/i,
          `<body$1><div class="v2-clouds">☁️ &nbsp;&nbsp;&nbsp; ☁️ &nbsp;&nbsp;&nbsp; ☁️</div>`
        );
        changedFiles.push("index.html", "styles.css");
        diffItems.push("index.html: 배경에 움직이는 구름 레이어 추가", "styles.css: 구름 이동 애니메이션 추가");
      } else {
        const safeText = userRequest.replace(/</g, "").slice(0, 60);
        nextFiles["index.html"] = (nextFiles["index.html"] ?? "").replace(
          /<\/body>/i,
          `<div style="margin:12px auto;max-width:760px;padding:10px 14px;border-radius:12px;background:#6858F5;color:#fff;font-size:12px;font-weight:700">✨ 반영된 기능 요청: ${safeText}</div>\n</body>`
        );
        nextGraph.nodes.push({
          id: `node_ai_${Date.now().toString(36).slice(-3)}`,
          name: "AIGeneratedFeature",
          labelKo: `추가 기능: ${safeText.slice(0, 20)}`,
          kind: "component",
          parentId: null,
          childrenIds: [],
          sourceFile: "index.html",
          editableVia: "block",
          editableProperties: [{ key: "featureActive", labelKo: "기능 표시", type: "boolean", value: true }]
        });
        nextFiles["manifest.json"] = JSON.stringify(nextGraph, null, 2);
        changedFiles.push("index.html", "manifest.json");
        diffItems.push(`index.html: '${safeText}' 기능 요소 추가`, "manifest.json: 새 편집 블록 노드 등록");
      }

      const val = validateGeneratedCode(nextFiles, project.kind);
      if (!val.ok) {
        return { ok: false, errorCode: "VALIDATION_FAILED", message: val.errors.join(" / ") };
      }

      const nextRev = project.revision + 1;
      const candidate: DreamProject = {
        ...project,
        revision: nextRev,
        updatedAt: now,
        contentHash: computeDreamProjectHash(nextFiles, nextGraph),
        source: { ...project.source, files: nextFiles, validationResult: val },
        componentGraph: nextGraph,
        versions: [
          ...project.versions.slice(-29),
          {
            revision: nextRev,
            sourceSnapshot: structuredClone(nextFiles),
            graphSnapshot: structuredClone(nextGraph),
            changeDescription: `코드 수정: ${diffItems[0]}`,
            createdAt: now,
            validationStatus: "valid"
          }
        ]
      };
      const previewHtml = buildSandboxedPreviewHtml(nextFiles, nextGraph);
      return {
        ok: true,
        message: "변경 미리보기가 준비되었습니다.",
        pendingChange: {
          requestId: `req_${Date.now().toString(36)}`,
          baseRevision: project.revision,
          summaryKo: diffItems.join(" / "),
          diffItems,
          changedFiles,
          requiresGameRestart: project.kind === "game",
          generatorSource: "dev_fixture",
          candidateProject: candidate,
          previewHtml
        }
      };
    }

    try {
      const existingFileNames = Object.keys(project.source.files).filter(
        (k) => k !== "manifest.json"
      );
      const existingJsFile = existingFileNames.find((k) => k.endsWith(".js")) ?? null;

      const normalizePatches = (rawPatches: Record<string, unknown>): Record<string, string> => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawPatches)) {
          if (typeof v !== "string" || !v.trim()) continue;
          if (k.endsWith(".js") && existingJsFile && !existingFileNames.includes(k)) {
            out[existingJsFile] = v;
          } else {
            out[k] = v;
          }
        }
        return out;
      };

      const callEditModel = async (repairErrors?: string[]) => {
        return provider!.generateJson<unknown>({
          systemPrompt: SYSTEM_EDIT_PROMPT,
          maxOutputTokens: 16384,
          userPrompt: JSON.stringify({
            userRequest,
            kind: project.kind,
            existingFileNames,
            runtimeError: context?.runtimeError ?? null,
            recentHistory: context?.recentHistory ?? [],
            previousValidationErrors: repairErrors ?? [],
            files: project.source.files,
            componentGraph: project.componentGraph
          }),
          temperature: repairErrors ? 0.15 : 0.25
        });
      };

      let raw = await callEditModel();
      let parsed: ReturnType<typeof LLMEditOutputSchema.safeParse>;
      let mergedFiles: Record<string, string> = {};
      let val: ReturnType<typeof validateGeneratedCode> | null = null;
      let diagnosis = "";

      for (let attempt = 0; attempt < 2; attempt++) {
        const rawRec = asRecord(raw);
        diagnosis = asString(rawRec["rootCauseDiagnosisKo"], "", 240);
        const normalizedPatches = normalizePatches(
          asRecord(rawRec["filePatches"] ?? rawRec["files"])
        );
        const normalizedEdit = {
          summaryKo: asString(rawRec["summaryKo"] ?? rawRec["summary"], userRequest, 200),
          diffItems: asStringArray(rawRec["diffItems"], [userRequest], 10, 200),
          requiresGameRestart: Boolean(rawRec["requiresGameRestart"]),
          filePatches: normalizedPatches,
          componentGraph: normalizeComponentGraph(
            rawRec["componentGraph"] ?? project.componentGraph
          )
        };
        parsed = LLMEditOutputSchema.safeParse(normalizedEdit);
        const hasPatches = parsed.success && Object.keys(parsed.data.filePatches).length > 0;
        if (parsed.success && hasPatches) {
          mergedFiles = {
            ...project.source.files,
            ...parsed.data.filePatches,
            "manifest.json": JSON.stringify(parsed.data.componentGraph, null, 2)
          };
          val = validateGeneratedCode(mergedFiles, project.kind);
          if (val.ok) break;
        }
        if (attempt === 0) {
          const errs = !parsed.success
            ? parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
            : !hasPatches
              ? [
                  `filePatches가 비어 있습니다. 반드시 existingFileNames(${existingFileNames.join(", ")}) 중 수정된 전체 코드를 반환하세요.`
                ]
              : (val?.errors ?? ["코드 검증 실패"]);
          raw = await callEditModel(errs);
        }
      }

      if (!parsed!.success) {
        return { ok: false, errorCode: "VALIDATION_FAILED", message: "AI 수정 응답 형식 오류" };
      }
      if (Object.keys(parsed!.data.filePatches).length === 0) {
        return {
          ok: false,
          errorCode: "VALIDATION_FAILED",
          message: "AI가 실제 코드 변경(filePatches)을 생성하지 못했습니다. 조금 더 구체적으로 요청해 주세요."
        };
      }
      if (!val || !val.ok) {
        return {
          ok: false,
          errorCode: "VALIDATION_FAILED",
          message: val?.errors.join(" / ") ?? "코드 검증에 실패했습니다."
        };
      }
      const nextRev = project.revision + 1;
      const summaryWithDiag = diagnosis
        ? `[원인 분석] ${diagnosis} → ${parsed!.data.summaryKo}`
        : parsed!.data.summaryKo;
      const candidate: DreamProject = {
        ...project,
        revision: nextRev,
        updatedAt: now,
        contentHash: computeDreamProjectHash(mergedFiles, parsed!.data.componentGraph),
        source: { ...project.source, files: mergedFiles, validationResult: val },
        componentGraph: parsed!.data.componentGraph,
        versions: [
          ...project.versions.slice(-29),
          {
            revision: nextRev,
            sourceSnapshot: structuredClone(mergedFiles),
            graphSnapshot: structuredClone(parsed!.data.componentGraph),
            changeDescription: `AI 수정: ${parsed!.data.summaryKo}`.slice(0, 180),
            createdAt: now,
            validationStatus: "valid"
          }
        ]
      };
      return {
        ok: true,
        message: "AI 변경 미리보기가 준비되었습니다.",
        pendingChange: {
          requestId: `req_${Date.now().toString(36)}`,
          baseRevision: project.revision,
          summaryKo: summaryWithDiag,
          diffItems: parsed!.data.diffItems,
          changedFiles: Object.keys(parsed!.data.filePatches),
          requiresGameRestart: parsed!.data.requiresGameRestart,
          generatorSource: "live_ai",
          candidateProject: candidate,
          previewHtml: buildSandboxedPreviewHtml(mergedFiles, parsed!.data.componentGraph)
        }
      };
    } catch (err) {
      return { ok: false, errorCode: "FAILED", message: err instanceof Error ? err.message : "AI 수정 실패" };
    }
  }

  private assembleProject(params: {
    kind: ProjectKind;
    prompt: string;
    designIntent: string;
    generatorSource: "live_ai" | "dev_fixture";
    providerName: string;
    modelName: string;
    repairAttempts: number;
    data: z.infer<typeof LLMProjectOutputSchema>;
    validation: DreamProject["source"]["validationResult"];
    now: string;
  }): DreamProject {
    const files = {
      ...params.data.files,
      "manifest.json": JSON.stringify(params.data.componentGraph, null, 2)
    };
    const project: DreamProject = {
      id: `proj2_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      ownerId: null,
      title: params.data.title,
      kind: params.kind,
      careerGoal: params.data.careerGoal,
      creationPrompt: params.prompt,
      designIntent: params.designIntent,
      revision: 1,
      contentHash: computeDreamProjectHash(files, params.data.componentGraph),
      schemaVersion: SCHEMA_VERSION_V2,
      publishState: "draft",
      publishedSlug: null,
      generatorSource: params.generatorSource,
      providerInfo: {
        provider: params.providerName,
        model: params.modelName,
        repairAttempts: params.repairAttempts
      },
      blueprint: params.data.blueprint,
      source: {
        files,
        entrypoints: ["index.html"],
        dependencyManifest: [],
        assetReferences: [
          { id: "generated_ui", kind: params.kind === "game" ? "canvas" : "svg", source: "generated_code", license: "User-Generated" }
        ],
        validationResult: params.validation
      },
      componentGraph: params.data.componentGraph,
      ...(params.data.gameDefinition ? { gameDefinition: params.data.gameDefinition } : {}),
      versions: [
        {
          revision: 1,
          sourceSnapshot: structuredClone(files),
          graphSnapshot: structuredClone(params.data.componentGraph),
          changeDescription: "최초 생성",
          createdAt: params.now,
          validationStatus: params.repairAttempts > 0 ? "repaired" : "valid"
        }
      ],
      createdAt: params.now,
      updatedAt: params.now
    };
    return DreamProjectSchema.parse(project);
  }
}
