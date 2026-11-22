export interface LLMJsonRequest {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export type ProviderKind =
  | "gemini"
  | "github"
  | "groq"
  | "openrouter"
  | "openai"
  | "anthropic"
  | "pool";

export interface LLMProvider {
  readonly providerName: ProviderKind;
  readonly modelName: string;
  generateJson<T>(req: LLMJsonRequest): Promise<T>;
}

function repairRawJsonText(input: string): string {
  // 1. Escape raw newlines/tabs inside double-quoted string literals
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === "\\") {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else {
        out += ch;
      }
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  // 2. Remove trailing commas before } or ]
  return out.replace(/,\s*([}\]])/g, "$1");
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; err: Error } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    const repaired = repairRawJsonText(text);
    if (repaired !== text) {
      try {
        return { ok: true, value: JSON.parse(repaired) };
      } catch {
        // fall through
      }
    }
    return { ok: false, err: e instanceof Error ? e : new Error(String(e)) };
  }
}

function parseJsonResponse(rawText: string): unknown {
  const trimmed = rawText.replace(/^\uFEFF/, "").trim();
  const direct = tryParseJson(trimmed);
  if (direct.ok) return direct.value;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const fParsed = tryParseJson(fenced[1].trim());
    if (fParsed.ok) return fParsed.value;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sliced = tryParseJson(trimmed.slice(start, end + 1));
    if (sliced.ok) return sliced.value;
    throw new RetryableProviderError(
      `AI JSON 형식 오류(자동 재시도 대상): ${sliced.err.message}`,
      502
    );
  }
  throw new RetryableProviderError("AI 응답에서 유효한 JSON 객체를 찾을 수 없습니다.", 502);
}

function parseKeyList(single?: string, multi?: string): string[] {
  const raw = [single ?? "", multi ?? ""].join(",");
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    )
  );
}

/**
 * Simple concurrency semaphore so bursts of student requests queue gracefully
 * instead of triggering simultaneous 429 rate-limit storms.
 */
class ConcurrencyLimiter {
  private active = 0;
  private readonly maxConcurrent: number;
  private readonly waitQueue: Array<() => void> = [];

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = Math.max(1, maxConcurrent);
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.waitQueue.push(resolve));
    }
    this.active += 1;
    try {
      return await fn();
    } finally {
      this.active -= 1;
      const next = this.waitQueue.shift();
      if (next) next();
    }
  }
}

const globalLimiter = new ConcurrencyLimiter(
  Number(process.env["AI_MAX_CONCURRENT"] ?? "3") || 3
);

/**
 * Tracks temporary cooldown timestamps per provider/key/model slot when 429/503 occurs.
 */
const slotCooldownUntil = new Map<string, number>();
const recentRequestTimestamps: number[] = [];

function recordOutboundAttempt(): void {
  const now = Date.now();
  recentRequestTimestamps.push(now);
  while (recentRequestTimestamps.length > 0 && now - recentRequestTimestamps[0]! > 60_000) {
    recentRequestTimestamps.shift();
  }
}

export interface SlotTelemetry {
  id: string;
  provider: string;
  model: string;
  status: "ready" | "cooldown";
  cooldownRemainingSec: number;
}

export interface ProviderQuotaTelemetry {
  dailyLimit: number;
  rpmLastMinute: number;
  maxConcurrent: number;
  slots: SlotTelemetry[];
}

export function getProviderRuntimeTelemetry(
  env: NodeJS.ProcessEnv = process.env
): ProviderQuotaTelemetry {
  const now = Date.now();
  while (recentRequestTimestamps.length > 0 && now - recentRequestTimestamps[0]! > 60_000) {
    recentRequestTimestamps.shift();
  }
  const built = buildProviderSlots(env);
  const dailyLimit = Number(env["AI_DAILY_QUOTA_LIMIT"] ?? "250") || 250;
  const maxConcurrent = Number(env["AI_MAX_CONCURRENT"] ?? "3") || 3;

  const slots: SlotTelemetry[] = built.map((s) => {
    const until = slotCooldownUntil.get(s.id) ?? 0;
    const remMs = Math.max(0, until - now);
    return {
      id: s.id,
      provider: s.provider.providerName,
      model: s.provider.modelName,
      status: remMs > 0 ? "cooldown" : "ready",
      cooldownRemainingSec: Math.ceil(remMs / 1000)
    };
  });

  return {
    dailyLimit,
    rpmLastMinute: recentRequestTimestamps.length,
    maxConcurrent,
    slots
  };
}

function isSlotCoolingDown(slotId: string): boolean {
  const until = slotCooldownUntil.get(slotId);
  if (!until) return false;
  if (Date.now() >= until) {
    slotCooldownUntil.delete(slotId);
    return false;
  }
  return true;
}

function markSlotCooldown(slotId: string, durationMs: number): void {
  slotCooldownUntil.set(slotId, Date.now() + durationMs);
}

export class RetryableProviderError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class GeminiProvider implements LLMProvider {
  readonly providerName = "gemini" as const;
  readonly modelName: string;
  private readonly apiKey: string;

  constructor(apiKey: string, modelName = "gemini-3-flash-preview") {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async generateJson<T>(req: LLMJsonRequest): Promise<T> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.modelName)}:generateContent`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 90000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: req.userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: req.temperature ?? 0.7,
            maxOutputTokens: req.maxOutputTokens ?? 16384
          }
        })
      });
      if (!res.ok) {
        const errText = (await res.text()).slice(0, 220);
        const msg = `Gemini(${this.modelName}) 오류 (HTTP ${res.status}): ${errText}`;
        if (res.status === 429 || res.status === 503 || res.status === 404 || res.status === 500) {
          throw new RetryableProviderError(msg, res.status);
        }
        throw new Error(msg);
      }
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini API가 빈 응답을 반환했습니다.");
      return parseJsonResponse(text) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly providerName: "openai" | "github" | "groq" | "openrouter";
  readonly modelName: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly extraHeaders: Record<string, string>;

  constructor(opts: {
    providerName: "openai" | "github" | "groq" | "openrouter";
    apiKey: string;
    modelName: string;
    baseUrl: string;
    extraHeaders?: Record<string, string>;
  }) {
    this.providerName = opts.providerName;
    this.apiKey = opts.apiKey;
    this.modelName = opts.modelName;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.extraHeaders = opts.extraHeaders ?? {};
  }

  async generateJson<T>(req: LLMJsonRequest): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 90000);
    const endpoint = `${this.baseUrl}/chat/completions`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...this.extraHeaders
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.modelName,
          response_format: { type: "json_object" },
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxOutputTokens ?? 8192,
          messages: [
            { role: "system", content: req.systemPrompt },
            { role: "user", content: req.userPrompt }
          ]
        })
      });
      if (!res.ok) {
        const errText = (await res.text()).slice(0, 220);
        const msg = `${this.providerName}(${this.modelName}) 오류 (HTTP ${res.status}): ${errText}`;
        if (res.status === 429 || res.status === 503 || res.status === 404 || res.status === 500) {
          throw new RetryableProviderError(msg, res.status);
        }
        throw new Error(msg);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content;
      if (!text) throw new Error(`${this.providerName} API가 빈 응답을 반환했습니다.`);
      return parseJsonResponse(text) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, modelName = "gpt-4.1-mini", baseUrl = "https://api.openai.com/v1") {
    super({ providerName: "openai", apiKey, modelName, baseUrl });
  }
}

export class AnthropicProvider implements LLMProvider {
  readonly providerName = "anthropic" as const;
  readonly modelName: string;
  private readonly apiKey: string;

  constructor(apiKey: string, modelName = "claude-sonnet-4-20250514") {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async generateJson<T>(req: LLMJsonRequest): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 90000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.modelName,
          max_tokens: req.maxOutputTokens ?? 8192,
          temperature: req.temperature ?? 0.7,
          system: req.systemPrompt,
          messages: [{ role: "user", content: req.userPrompt }]
        })
      });
      if (!res.ok) {
        const errText = (await res.text()).slice(0, 220);
        const msg = `Anthropic 오류 (HTTP ${res.status}): ${errText}`;
        if (res.status === 429 || res.status === 503 || res.status === 529) {
          throw new RetryableProviderError(msg, res.status);
        }
        throw new Error(msg);
      }
      const json = (await res.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const text = json.content?.find((c) => c.type === "text")?.text;
      if (!text) throw new Error("Anthropic API가 빈 응답을 반환했습니다.");
      return parseJsonResponse(text) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

interface ProviderSlot {
  id: string;
  provider: LLMProvider;
}

/**
 * High-availability pool with automatic failover across multiple providers,
 * multiple API keys (round-robin), and temporary cooldown on 429/503.
 */
export class FailoverLLMProvider implements LLMProvider {
  readonly providerName: ProviderKind;
  readonly modelName: string;
  private readonly slots: ProviderSlot[];
  private cursor = 0;

  constructor(slots: ProviderSlot[]) {
    this.slots = slots;
    this.providerName = slots[0]?.provider.providerName ?? "pool";
    this.modelName =
      slots.length > 1
        ? `${slots[0]!.provider.modelName} (+${slots.length - 1} 폴백)`
        : (slots[0]?.provider.modelName ?? "unknown");
  }

  async generateJson<T>(req: LLMJsonRequest): Promise<T> {
    return globalLimiter.run(async () => {
      let lastError: Error | null = null;
      const total = this.slots.length;
      const start = this.cursor % total;
      this.cursor = (this.cursor + 1) % total;

      // Order slots starting from round-robin cursor, putting non-cooling slots first
      const ordered: ProviderSlot[] = [];
      for (let i = 0; i < total; i++) {
        ordered.push(this.slots[(start + i) % total]!);
      }
      const ready = ordered.filter((s) => !isSlotCoolingDown(s.id));
      const candidates = ready.length > 0 ? ready : ordered;

      for (const slot of candidates) {
        try {
          recordOutboundAttempt();
          return await slot.provider.generateJson<T>(req);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (err instanceof RetryableProviderError) {
            if (err.status === 429 || err.status === 503 || err.status === 404) {
              const cooldownMs = err.status === 429 ? 60_000 : 30_000;
              markSlotCooldown(slot.id, cooldownMs);
            }
            continue;
          }
          // AbortError / transient network error -> try next provider slot
          if (lastError.name === "AbortError" || lastError.message.includes("fetch failed")) {
            markSlotCooldown(slot.id, 15_000);
            continue;
          }
          throw lastError;
        }
      }

      throw lastError ?? new Error("모든 AI 프로바이더 호출에 실패했습니다.");
    });
  }
}

export interface AIStatusPayload {
  configured: boolean;
  provider: ProviderKind | null;
  model: string | null;
  activeSlotCount: number;
  providers: string[];
  setupGuideKo: string;
}

function buildProviderSlots(env: NodeJS.ProcessEnv): ProviderSlot[] {
  const slots: ProviderSlot[] = [];
  const pref = (env["AI_PROVIDER"] ?? "").toLowerCase().trim();
  const customModel = env["AI_MODEL"]?.trim() || undefined;

  const addGithub = () => {
    const keys = parseKeyList(env["GITHUB_TOKEN"], env["GITHUB_TOKENS"]);
    const models = env["GITHUB_MODEL"]?.trim()
      ? [env["GITHUB_MODEL"].trim()]
      : ["openai/gpt-4.1-mini", "openai/gpt-4.1"];
    for (const model of models) {
      keys.forEach((key, idx) => {
        slots.push({
          id: `github:${model}:k${idx}`,
          provider: new OpenAICompatibleProvider({
            providerName: "github",
            apiKey: key,
            modelName: model,
            baseUrl: "https://models.github.ai/inference"
          })
        });
      });
    }
  };

  const addGemini = () => {
    const keys = parseKeyList(env["GEMINI_API_KEY"], env["GEMINI_API_KEYS"]);
    const models = Array.from(
      new Set([
        ...(customModel && (pref === "gemini" || !pref) ? [customModel] : []),
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-flash-latest"
      ])
    );
    for (const model of models) {
      keys.forEach((key, idx) => {
        slots.push({
          id: `gemini:${model}:k${idx}`,
          provider: new GeminiProvider(key, model)
        });
      });
    }
  };

  const addGroq = () => {
    const keys = parseKeyList(env["GROQ_API_KEY"], env["GROQ_API_KEYS"]);
    const model = env["GROQ_MODEL"]?.trim() || "llama-3.3-70b-versatile";
    keys.forEach((key, idx) => {
      slots.push({
        id: `groq:${model}:k${idx}`,
        provider: new OpenAICompatibleProvider({
          providerName: "groq",
          apiKey: key,
          modelName: model,
          baseUrl: "https://api.groq.com/openai/v1"
        })
      });
    });
  };

  const addOpenRouter = () => {
    const keys = parseKeyList(env["OPENROUTER_API_KEY"], env["OPENROUTER_API_KEYS"]);
    const model = env["OPENROUTER_MODEL"]?.trim() || "qwen/qwen3-coder:free";
    keys.forEach((key, idx) => {
      slots.push({
        id: `openrouter:${model}:k${idx}`,
        provider: new OpenAICompatibleProvider({
          providerName: "openrouter",
          apiKey: key,
          modelName: model,
          baseUrl: "https://openrouter.ai/api/v1",
          extraHeaders: {
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Dream Studio 2.0"
          }
        })
      });
    });
  };

  const addOpenAI = () => {
    const keys = parseKeyList(env["OPENAI_API_KEY"], env["OPENAI_API_KEYS"]);
    const baseUrl = env["OPENAI_BASE_URL"]?.trim() || "https://api.openai.com/v1";
    const model = (pref === "openai" && customModel) || env["OPENAI_MODEL"]?.trim() || "gpt-4.1-mini";
    keys.forEach((key, idx) => {
      slots.push({
        id: `openai:${model}:k${idx}`,
        provider: new OpenAIProvider(key, model, baseUrl)
      });
    });
  };

  const addAnthropic = () => {
    const keys = parseKeyList(env["ANTHROPIC_API_KEY"], env["ANTHROPIC_API_KEYS"]);
    const model = (pref === "anthropic" && customModel) || "claude-sonnet-4-20250514";
    keys.forEach((key, idx) => {
      slots.push({
        id: `anthropic:${model}:k${idx}`,
        provider: new AnthropicProvider(key, model)
      });
    });
  };

  // Priority order: preferred provider first, then all other configured providers as automatic failover
  const builders: Array<{ name: string; fn: () => void }> = [
    { name: "github", fn: addGithub },
    { name: "gemini", fn: addGemini },
    { name: "openrouter", fn: addOpenRouter },
    { name: "groq", fn: addGroq },
    { name: "openai", fn: addOpenAI },
    { name: "anthropic", fn: addAnthropic }
  ];

  if (pref) {
    builders.sort((a, b) => (a.name === pref ? -1 : b.name === pref ? 1 : 0));
  }
  for (const b of builders) b.fn();

  return slots;
}

export function resolveLLMProvider(env: NodeJS.ProcessEnv = process.env): LLMProvider | null {
  const slots = buildProviderSlots(env);
  if (slots.length === 0) return null;
  if (slots.length === 1) return slots[0]!.provider;
  return new FailoverLLMProvider(slots);
}

export function getAIStatus(env: NodeJS.ProcessEnv = process.env): AIStatusPayload {
  const slots = buildProviderSlots(env);
  const p = resolveLLMProvider(env);
  if (p) {
    const uniqueProviders = Array.from(new Set(slots.map((s) => s.provider.providerName)));
    return {
      configured: true,
      provider: p.providerName,
      model: p.modelName,
      activeSlotCount: slots.length,
      providers: uniqueProviders,
      setupGuideKo: `실제 AI(${uniqueProviders.join(" → ")} / 총 ${slots.length}개 자동 폴백 슬롯)가 연결되어 있습니다.`
    };
  }
  return {
    configured: false,
    provider: null,
    model: null,
    activeSlotCount: 0,
    providers: [],
    setupGuideKo:
      "실제 AI 생성을 활성화하려면 apps/api/.env 파일에 GITHUB_TOKEN, GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요."
  };
}
