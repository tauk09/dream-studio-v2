import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  XCircle
} from "lucide-react";
import type { GenerationJob } from "@dream-studio-v2/core";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { SandboxedPreview } from "../components/ui/SandboxedPreview";
import { cancelGenerationJob, fetchGenerationJob } from "../api/studioApi";
import { saveProject } from "../db/projectDb";

const STAGE_STEPS = [
  { key: "analyzing_intent", label: "아이디어 의도 분석", pct: 20 },
  { key: "planning_concept", label: "구조·디자인 기획", pct: 40 },
  { key: "generating_code", label: "실행 코드 및 편집 명세 생성", pct: 68 },
  { key: "validating_build", label: "문법·보안 정적 검증", pct: 88 },
  { key: "completed", label: "격리 샌드박스 실행 준비 완료", pct: 100 }
];

const STAGE_ORDER: Record<string, number> = {
  analyzing_intent: 0,
  planning_concept: 1,
  generating_code: 2,
  validating_build: 3,
  repairing_code: 3,
  completed: 4
};

export function GeneratingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const savedOnceRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const data = await fetchGenerationJob(jobId);
      if (!active) return;
      if (!data) {
        setNotFound(true);
        return;
      }
      setJob(data);

      if (data.status === "completed" && data.project && !savedOnceRef.current) {
        savedOnceRef.current = true;
        await saveProject(data.project);
        if (active) setSavedProjectId(data.project.id);
        return;
      }

      if (data.status === "running") {
        timer = setTimeout(() => void poll(), 350);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  const handleCancel = async () => {
    if (!jobId) return;
    await cancelGenerationJob(jobId);
    const latest = await fetchGenerationJob(jobId);
    if (latest) setJob(latest);
  };

  if (notFound) {
    return (
      <WorkspaceLayout>
        <div className="mx-auto max-w-lg rounded-3xl border border-[#E6E8F0] bg-white p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-[#FFB66D]" />
          <h1 className="mt-4 text-lg font-bold">생성 작업을 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm text-[#70758B]">
            서버가 재시작되었거나 만료된 작업 ID입니다. 새 작품을 다시 만들어 주세요.
          </p>
          <div className="mt-6">
            <Link to="/app/create">
              <Button>새 작품 만들기</Button>
            </Link>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  if (!job) {
    return (
      <WorkspaceLayout>
        <div className="flex min-h-[360px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6858F5]" />
        </div>
      </WorkspaceLayout>
    );
  }

  const currentIdx = STAGE_ORDER[job.progressStage] ?? 0;
  const progressPercent =
    job.status === "completed" ? 100 : (STAGE_STEPS[currentIdx]?.pct ?? 15);
  const isTerminal = job.status !== "running";

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-5xl">
        {/* Completed State: Rich Preview & Actions */}
        {job.status === "completed" && job.project && job.previewHtml ? (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#BCEAD8] bg-white p-6 shadow-xs sm:flex-row sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    생성 및 보안 검증 완료
                  </Badge>
                  <Badge tone={job.project.kind === "game" ? "mint" : "brand"}>
                    {job.project.kind === "game" ? "게임" : "웹사이트"}
                  </Badge>
                  {job.project.generatorSource === "dev_fixture" && (
                    <Badge tone="amber">개발 테스트 Fixture</Badge>
                  )}
                </div>
                <h1 className="mt-2.5 text-2xl font-bold text-[#17182B]">{job.project.title}</h1>
                <p className="mt-1 text-sm text-[#70758B]">{job.project.blueprint.creativeGoal}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  size="lg"
                  onClick={() =>
                    navigate(`/app/projects/${savedProjectId ?? job.project!.id}/edit`)
                  }
                >
                  <Pencil className="h-4 w-4" />
                  에디터에서 편집하기
                </Button>
                <Link to="/app/create">
                  <Button variant="secondary" size="lg">
                    <RotateCcw className="h-4 w-4" />
                    다른 작품 만들기
                  </Button>
                </Link>
              </div>
            </div>

            <SandboxedPreview
              previewHtml={job.previewHtml}
              title={job.project.title}
              heightClass="h-[580px]"
            />
          </div>
        ) : (
          /* Running / Failed / Cancelled State */
          <div className="mx-auto max-w-2xl rounded-3xl border border-[#E6E8F0] bg-white p-8 shadow-xs">
            <div className="flex items-center justify-between">
              <Badge tone={job.status === "failed" ? "danger" : "brand"}>
                <Sparkles className="h-3.5 w-3.5" />
                {job.kind === "game" ? "게임 생성 파이프라인" : "웹사이트 생성 파이프라인"}
              </Badge>
              <span className="font-mono text-xs text-[#70758B]">{progressPercent}%</span>
            </div>

            <h1 className="mt-4 text-xl font-bold text-[#17182B]">
              {job.status === "failed"
                ? "생성 중 문제가 발생했습니다"
                : job.status === "cancelled"
                  ? "생성 작업이 취소되었습니다"
                  : "작품을 설계하고 안전하게 검증하고 있어요"}
            </h1>
            <p className="mt-1.5 text-sm text-[#70758B]">{job.stageLabelKo}</p>

            {/* Progress Bar */}
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-[#EEF0FF]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  job.status === "failed" ? "bg-[#E75566]" : "bg-[#6858F5]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Real Backend Stage Checklist */}
            <ol className="mt-6 space-y-3">
              {STAGE_STEPS.map((step, idx) => {
                const done = idx < currentIdx || job.status === "completed";
                const active = idx === currentIdx && !isTerminal;
                return (
                  <li
                    key={step.key}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                      done
                        ? "border-[#BCEAD8] bg-[#E8F8F2]/60 text-[#14795C]"
                        : active
                          ? "border-[#6858F5] bg-[#EEF0FF]/70 font-semibold text-[#5544E4]"
                          : "border-[#E6E8F0] bg-[#F7F8FC] text-[#70758B]"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1EA882]" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6858F5]" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-[#D5D8E5]" />
                    )}
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ol>

            {job.error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-[#FBC9D0] bg-[#FEECEF] p-4 text-xs text-[#B82839]">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-bold">오류 상세</p>
                  <p className="mt-1">{job.error}</p>
                </div>
              </div>
            )}

            <div className="mt-7 flex justify-end gap-2.5">
              {!isTerminal ? (
                <Button variant="secondary" onClick={() => void handleCancel()}>
                  생성 취소
                </Button>
              ) : (
                <>
                  <Link to="/app">
                    <Button variant="secondary">대시보드로</Button>
                  </Link>
                  <Link to={`/app/create/${job.kind}`}>
                    <Button>
                      다시 시도하기
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
