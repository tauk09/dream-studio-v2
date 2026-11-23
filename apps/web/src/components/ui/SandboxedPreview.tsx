import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldCheck, Terminal, Trash2 } from "lucide-react";
import type { ComponentGraph } from "@dream-studio-v2/core";

export interface SandboxConsoleEntry {
  id: number;
  level: "log" | "warn" | "error";
  message: string;
  time: string;
}

interface SandboxedPreviewProps {
  previewHtml: string;
  configMap?: Record<string, string | number | boolean>;
  componentGraph?: ComponentGraph;
  title?: string;
  heightClass?: string;
  showSecurityBar?: boolean;
  onRuntimeError?: (message: string) => void;
}

export function SandboxedPreview({
  previewHtml,
  configMap,
  componentGraph,
  title = "작품 실행 미리보기",
  heightClass = "h-[600px]",
  showSecurityBar = true,
  onRuntimeError
}: SandboxedPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<SandboxConsoleEntry[]>([]);
  const logSeqRef = useRef(0);

  useEffect(() => {
    setReady(false);
    setRuntimeError(null);
    setLogs([]);
  }, [previewHtml, reloadNonce]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data as { type?: string; message?: string; level?: string } | null;
      if (!data || typeof data !== "object") return;
      if (data.type === "DREAM_PREVIEW_READY") {
        setReady(true);
      } else if (data.type === "DREAM_RUNTIME_ERROR") {
        const msg = data.message ?? "실행 중 오류가 발생했습니다.";
        setRuntimeError(msg);
        setLogs((prev) => [
          ...prev.slice(-49),
          {
            id: ++logSeqRef.current,
            level: "error",
            message: msg,
            time: new Date().toLocaleTimeString("ko-KR")
          }
        ]);
        onRuntimeError?.(msg);
      } else if (data.type === "DREAM_CONSOLE_LOG") {
        const level: "log" | "warn" | "error" =
          data.level === "error" || data.level === "warn" ? data.level : "log";
        const msg = data.message ?? "";
        setLogs((prev) => [
          ...prev.slice(-49),
          {
            id: ++logSeqRef.current,
            level,
            message: msg,
            time: new Date().toLocaleTimeString("ko-KR")
          }
        ]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onRuntimeError]);

  useEffect(() => {
    if ((!configMap && !componentGraph) || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "DREAM_MANIFEST_UPDATE", config: configMap, graph: componentGraph },
      "*"
    );
  }, [configMap, componentGraph, ready]);

  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#E6E8F0] bg-white shadow-sm">
      {showSecurityBar && (
        <div className="flex items-center justify-between border-b border-[#E6E8F0] bg-[#F7F8FC] px-3.5 py-2 text-xs text-[#70758B]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#1EA882]" />
            <span className="font-medium text-[#17182B]">격리 샌드박스 실행</span>
            <span className="hidden text-[11px] text-[#70758B] sm:inline">
              외부 네트워크 차단 · 폼/스크립트 안전 실행
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConsoleOpen((o) => !o)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                errorCount > 0
                  ? "bg-[#FEECEF] text-[#B82839]"
                  : consoleOpen
                    ? "bg-[#EEF0FF] text-[#5544E4]"
                    : "text-[#70758B] hover:bg-white hover:text-[#17182B]"
              }`}
              title="실행 콘솔 열기/닫기"
            >
              <Terminal className="h-3 w-3" />
              콘솔 ({logs.length})
            </button>
            <span
              className={`h-2 w-2 rounded-full ${
                runtimeError ? "bg-[#E75566]" : ready ? "bg-[#1EA882]" : "bg-[#FFB66D]"
              }`}
              title={runtimeError ? "오류" : ready ? "실행 준비 완료" : "로딩 중"}
            />
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#70758B] hover:bg-white hover:text-[#17182B]"
              title="미리보기 새로고침"
            >
              <RefreshCw className="h-3 w-3" />
              새로고침
            </button>
          </div>
        </div>
      )}

      {runtimeError && (
        <div className="flex items-start gap-2.5 border-b border-[#FBC9D0] bg-[#FEECEF] px-4 py-2.5 text-xs text-[#B82839]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">샌드박스 실행 오류가 감지되었습니다</p>
            <p className="mt-0.5 break-all font-mono text-[11px]">{runtimeError}</p>
          </div>
        </div>
      )}

      <div className={`relative w-full flex-1 bg-white ${heightClass}`}>
        <iframe
          key={reloadNonce}
          ref={iframeRef}
          title={title}
          srcDoc={previewHtml}
          sandbox="allow-scripts allow-forms allow-modals"
          className="h-full w-full border-0 bg-white"
        />
      </div>

      {consoleOpen && (
        <div className="max-h-44 shrink-0 overflow-y-auto border-t border-[#2A2D46] bg-[#17182B] p-3 font-mono text-[11px] text-[#E6E8F0]">
          <div className="mb-2 flex items-center justify-between text-[10px] text-[#9EA4BE]">
            <span>SANDBOX CONSOLE ({logs.length})</span>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="inline-flex items-center gap-1 hover:text-white"
            >
              <Trash2 className="h-3 w-3" />
              지우기
            </button>
          </div>
          {logs.length === 0 ? (
            <p className="text-[#70758B]">출력된 콘솔 로그나 오류가 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className={`break-all ${
                    entry.level === "error"
                      ? "text-[#FF8594]"
                      : entry.level === "warn"
                        ? "text-[#FFB66D]"
                        : "text-[#D4D9EE]"
                  }`}
                >
                  <span className="mr-2 opacity-50">[{entry.time}]</span>
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
