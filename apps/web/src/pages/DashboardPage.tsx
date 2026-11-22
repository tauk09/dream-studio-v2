import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Copy,
  ExternalLink,
  Gamepad2,
  Globe,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2
} from "lucide-react";
import type { DreamProject } from "@dream-studio-v2/core";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { deleteProject, duplicateProject, listProjects } from "../db/projectDb";

export function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DreamProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "website" | "game">("all");
  const [deleteTarget, setDeleteTarget] = useState<DreamProject | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await listProjects());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = projects.filter((p) => {
    if (kindFilter !== "all" && p.kind !== kindFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.blueprint.creativeGoal.toLowerCase().includes(q) ||
        p.creationPrompt.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDuplicate = async (id: string) => {
    const copy = await duplicateProject(id);
    if (copy) await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  return (
    <WorkspaceLayout>
      {/* Welcome Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold text-[#6858F5]">DREAM STUDIO 2.0 WORKSPACE</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17182B] sm:text-3xl">
            오늘은 어떤 꿈을 만들어 볼까?
          </h1>
          <p className="mt-1.5 text-sm text-[#70758B]">
            새 아이디어를 AI와 함께 웹사이트나 게임으로 만들고, 내 작품을 이어서 발전시켜 보세요.
          </p>
        </div>
        <Link to="/app/create">
          <Button>
            <Plus className="h-4 w-4" />
            새 작품 만들기
          </Button>
        </Link>
      </div>

      {/* Quick Create 2 Cards */}
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <Link
          to="/app/create/website"
          className="group flex items-center gap-4 rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6858F5]/60 hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6858F5] transition-transform duration-200 group-hover:scale-105">
            <Globe className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-[#17182B]">새 웹사이트 만들기</h2>
            <p className="mt-0.5 text-xs text-[#70758B]">
              포트폴리오, 인터랙티브 실험실, 소개 페이지를 AI로 생성
            </p>
          </div>
        </Link>

        <Link
          to="/app/create/game"
          className="group flex items-center gap-4 rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#32CDB5] hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6FAF6] text-[#117A69] transition-transform duration-200 group-hover:scale-105">
            <Gamepad2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-[#17182B]">새 게임 만들기</h2>
            <p className="mt-0.5 text-xs text-[#70758B]">
              진로 기반 게임 추천 또는 직접 설명으로 2D 웹 게임 생성
            </p>
          </div>
        </Link>
      </div>

      {/* Projects Section */}
      <section className="mt-10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-bold text-[#17182B]">
            최근 내 작품 <span className="text-sm font-medium text-[#70758B]">({projects.length})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70758B]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="작품 검색..."
                className="h-9 rounded-xl border border-[#E6E8F0] bg-white pl-9 pr-3 text-xs text-[#17182B] placeholder:text-[#70758B] focus:border-[#6858F5] focus:outline-none"
              />
            </div>
            <div className="inline-flex rounded-xl border border-[#E6E8F0] bg-white p-0.5 text-xs">
              {(["all", "website", "game"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKindFilter(k)}
                  className={`rounded-lg px-2.5 py-1 font-semibold ${
                    kindFilter === k ? "bg-[#EEF0FF] text-[#5544E4]" : "text-[#70758B]"
                  }`}
                >
                  {k === "all" ? "전체" : k === "website" ? "웹사이트" : "게임"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 animate-pulse rounded-2xl border border-[#E6E8F0] bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-[#D5D8E5] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6858F5]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#17182B]">
              {projects.length === 0
                ? "아직 만든 작품이 없어요"
                : "조건에 맞는 작품을 찾지 못했어요"}
            </h3>
            <p className="mt-1.5 text-sm text-[#70758B]">
              {projects.length === 0
                ? "첫 번째 웹사이트나 게임을 만들고 나만의 스튜디오를 채워 보세요."
                : "검색어나 필터를 초기화하면 모든 작품을 볼 수 있습니다."}
            </p>
            <div className="mt-6">
              <Link to="/app/create">
                <Button>첫 작품 만들기</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => {
              const isFixture = project.generatorSource === "dev_fixture";
              return (
                <article
                  key={project.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={project.kind === "game" ? "mint" : "brand"}>
                        {project.kind === "game" ? "게임" : "웹사이트"}
                      </Badge>
                      <Badge tone={project.publishState === "published" ? "success" : "neutral"}>
                        {project.publishState === "published" ? "게시됨" : "초안"}
                      </Badge>
                      {isFixture && <Badge tone="amber">개발 테스트 Fixture</Badge>}
                    </div>
                    <h3 className="mt-3 line-clamp-1 text-base font-bold text-[#17182B]">
                      {project.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#70758B]">
                      {project.blueprint.creativeGoal}
                    </p>
                    <p className="mt-3 text-[11px] text-[#70758B]">
                      수정일: {new Date(project.updatedAt).toLocaleString("ko-KR")}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#F0F1F6] pt-3">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/app/projects/${project.id}/edit`)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      편집하기
                    </Button>
                    <div className="flex items-center gap-1">
                      {project.publishedSlug && (
                        <Link
                          to={`/${project.kind === "game" ? "g" : "p"}/${project.publishedSlug}`}
                          className="rounded-lg p-2 text-[#70758B] hover:bg-[#F7F8FC] hover:text-[#17182B]"
                          title="게시 페이지 열기"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDuplicate(project.id)}
                        className="rounded-lg p-2 text-[#70758B] hover:bg-[#F7F8FC] hover:text-[#17182B]"
                        title="복제"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(project)}
                        className="rounded-lg p-2 text-[#70758B] hover:bg-[#FEECEF] hover:text-[#E75566]"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17182B]/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#17182B]">작품을 삭제할까요?</h3>
            <p className="mt-2 text-sm text-[#70758B]">
              <strong className="text-[#17182B]">{deleteTarget.title}</strong> 작품과 연결된
              로컬 게시 스냅샷이 삭제되며 되돌릴 수 없습니다.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
                취소
              </Button>
              <Button variant="danger" size="sm" onClick={() => void confirmDelete()}>
                삭제하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
