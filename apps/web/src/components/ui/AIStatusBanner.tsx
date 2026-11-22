import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FlaskConical } from "lucide-react";
import { fetchAIStatus, type AIStatusResponse } from "../../api/studioApi";

interface AIStatusBannerProps {
  testFixtureMode: boolean;
  onToggleTestFixtureMode: (enabled: boolean) => void;
}

export function AIStatusBanner({
  testFixtureMode,
  onToggleTestFixtureMode
}: AIStatusBannerProps) {
  const [status, setStatus] = useState<AIStatusResponse | null>(null);

  useEffect(() => {
    void fetchAIStatus().then(setStatus);
  }, []);

  if (!status) return null;

  return (
    <div
      className={`rounded-2xl border p-4 text-xs ${
        status.configured
          ? "border-[#BCEAD8] bg-[#E8F8F2] text-[#14795C]"
          : "border-[#FFE0B8] bg-[#FFF8EE] text-[#8F4D00]"
      }`}
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-2.5">
          {status.configured ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1EA882]" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
          )}
          <div>
            <p className="font-bold">
              {status.configured
                ? `실제 AI 생성 연결됨 (${status.provider} · ${status.model})`
                : "실제 AI API 키가 설정되지 않았습니다 (HTTP 503 보호 모드)"}
            </p>
            <p className="mt-1 leading-relaxed opacity-90">
              {status.setupGuideKo ?? status.message}
            </p>
          </div>
        </div>

        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[#E6E8F0] bg-white px-3 py-2 text-[#17182B] shadow-2xs">
          <input
            type="checkbox"
            checked={testFixtureMode}
            onChange={(e) => onToggleTestFixtureMode(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#6858F5]"
          />
          <FlaskConical className="h-3.5 w-3.5 text-[#6858F5]" />
          <span className="font-semibold">개발 테스트 모드 (Fixture)</span>
        </label>
      </div>
      {testFixtureMode && (
        <p className="mt-2.5 rounded-lg bg-white/80 px-3 py-2 text-[11px] font-medium text-[#575C72]">
          개발 테스트 모드가 켜져 있습니다. 외부 LLM 대신 로컬 테스트용 픽스처 코드로 생성·검증·샌드박스·편집
          파이프라인을 검증합니다. 실제 AI 생성 결과로 표시되지 않습니다.
        </p>
      )}
    </div>
  );
}
