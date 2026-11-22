import type { DreamProject, GenerationJob, GenerationStage, ProjectKind } from "@dream-studio-v2/core";

const STAGE_LABELS: Record<GenerationStage, string> = {
  analyzing_intent: "아이디어를 이해하고 있어요",
  planning_concept: "작품 구성을 설계하고 있어요",
  generating_code: "화면과 규칙 코드를 만들고 있어요",
  validating_build: "실제로 실행되는지 확인하고 있어요",
  repairing_code: "발견된 오류를 자동으로 고치고 있어요",
  completed: "작품이 완성되었어요!",
  failed: "작품을 만드는 중 문제가 생겼어요",
  cancelled: "생성이 취소되었어요"
};

export class GenerationJobStore {
  private jobs = new Map<string, GenerationJob>();

  create(kind: ProjectKind, provider: string): GenerationJob {
    const now = new Date().toISOString();
    const job: GenerationJob = {
      jobId: `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      status: "running",
      progressStage: "analyzing_intent",
      stageLabelKo: STAGE_LABELS.analyzing_intent,
      kind,
      provider,
      retryCount: 0,
      error: null,
      createdAt: now,
      updatedAt: now
    };
    this.jobs.set(job.jobId, job);
    return job;
  }

  get(jobId: string): GenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  updateStage(jobId: string, stage: GenerationStage, retryCount?: number): void {
    const job = this.jobs.get(jobId);
    if (!job || job.status === "cancelled") return;
    job.progressStage = stage;
    job.stageLabelKo = STAGE_LABELS[stage];
    if (retryCount !== undefined) job.retryCount = retryCount;
    job.updatedAt = new Date().toISOString();
  }

  complete(jobId: string, project: DreamProject, previewHtml: string): void {
    const job = this.jobs.get(jobId);
    if (!job || job.status === "cancelled") return;
    job.status = "completed";
    job.progressStage = "completed";
    job.stageLabelKo = STAGE_LABELS.completed;
    job.project = project;
    job.previewHtml = previewHtml;
    job.updatedAt = new Date().toISOString();
  }

  fail(jobId: string, errorMessage: string): void {
    const job = this.jobs.get(jobId);
    if (!job || job.status === "cancelled") return;
    job.status = "failed";
    job.progressStage = "failed";
    job.stageLabelKo = STAGE_LABELS.failed;
    job.error = errorMessage;
    job.updatedAt = new Date().toISOString();
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "running") return false;
    job.status = "cancelled";
    job.progressStage = "cancelled";
    job.stageLabelKo = STAGE_LABELS.cancelled;
    job.updatedAt = new Date().toISOString();
    return true;
  }
}
