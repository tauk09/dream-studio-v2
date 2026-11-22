import ts from "typescript";
import type { ValidationResult } from "@dream-studio-v2/core";

const MAX_FILES = 14;
const MAX_FILE_BYTES = 120 * 1024;
const MAX_TOTAL_BYTES = 400 * 1024;

const SECURITY_RULES: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\beval\s*\(/, reason: "eval() 동적 실행은 보안상 금지됩니다." },
  { pattern: /\bnew\s+Function\s*\(/, reason: "new Function() 동적 실행은 금지됩니다." },
  { pattern: /\bdocument\.cookie\b/, reason: "document.cookie 접근은 금지됩니다." },
  { pattern: /\bwindow\.top\b/, reason: "window.top 접근은 금지됩니다." },
  { pattern: /\bwindow\.parent\.(?!postMessage\b)/, reason: "부모 창 내부 접근은 금지됩니다(postMessage만 허용)." },
  { pattern: /\b(?:localStorage|sessionStorage|indexedDB)\b/, reason: "생성 코드 내부 스토리지 직접 접근은 금지됩니다." },
  { pattern: /\bfetch\s*\(/, reason: "외부 네트워크 요청(fetch)은 금지됩니다." },
  { pattern: /\bXMLHttpRequest\b/, reason: "XMLHttpRequest 사용은 금지됩니다." },
  { pattern: /\bWebSocket\b/, reason: "WebSocket 연결은 금지됩니다." },
  { pattern: /\bnavigator\.sendBeacon\b/, reason: "sendBeacon 전송은 금지됩니다." },
  { pattern: /<script[^>]+src\s*=\s*["']https?:\/\//i, reason: "외부 CDN 스크립트 로드는 금지됩니다." }
];

function checkFilePathSafe(name: string): boolean {
  if (!name || name.startsWith("/") || name.includes("..") || name.includes("\\")) return false;
  return /^[a-zA-Z0-9._/-]+$/.test(name);
}

function checkSyntax(fileName: string, source: string): string[] {
  const out = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: { allowJs: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  });
  return (out.diagnostics ?? [])
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
    .map((d) => `${fileName}: 구문 오류 — ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
}

export function validateGeneratedCode(
  files: Record<string, string>,
  kind: "website" | "game"
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checkedFiles = Object.keys(files);
  let syntaxPassed = true;
  let securityPassed = true;

  if (checkedFiles.length === 0) {
    return { ok: false, syntaxPassed: false, securityPassed: false, checkedFiles: [], errors: ["생성된 파일이 없습니다."], warnings: [] };
  }
  if (checkedFiles.length > MAX_FILES) {
    errors.push(`파일 개수(${checkedFiles.length})가 한도(${MAX_FILES})를 초과했습니다.`);
  }
  if (!files["index.html"] || files["index.html"].trim().length < 20) {
    errors.push("필수 진입 파일 index.html이 누락되었습니다.");
  }

  let totalBytes = 0;
  let combinedCode = "";

  for (const [name, content] of Object.entries(files)) {
    if (!checkFilePathSafe(name)) {
      securityPassed = false;
      errors.push(`${name}: [보안 위반] 허용되지 않는 파일 경로입니다.`);
      continue;
    }
    const size = Buffer.byteLength(content, "utf8");
    totalBytes += size;
    if (size > MAX_FILE_BYTES) {
      errors.push(`${name}: 단일 파일 크기 한도(${MAX_FILE_BYTES}B)를 초과했습니다.`);
    }

    if (name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".html")) {
      for (const rule of SECURITY_RULES) {
        if (rule.pattern.test(content)) {
          securityPassed = false;
          errors.push(`${name}: [보안 위반] ${rule.reason}`);
        }
      }
    }

    if (name.endsWith(".js") || name.endsWith(".ts")) {
      combinedCode += `\n${content}`;
      const errs = checkSyntax(name, content);
      if (errs.length > 0) {
        syntaxPassed = false;
        errors.push(...errs);
      }
    }
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    errors.push(`전체 크기(${totalBytes}B)가 한도(${MAX_TOTAL_BYTES}B)를 초과했습니다.`);
  }

  if (kind === "game") {
    const hasInput = /addEventListener\s*\(|onkeydown|onclick|onpointerdown/i.test(
      combinedCode + (files["index.html"] ?? "")
    );
    if (!hasInput) {
      errors.push("게임 코드에 사용자 입력 처리(키보드/클릭/터치)가 감지되지 않았습니다.");
    }
  }

  return {
    ok: errors.length === 0,
    syntaxPassed,
    securityPassed,
    checkedFiles,
    errors,
    warnings
  };
}
