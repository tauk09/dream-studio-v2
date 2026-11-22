import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Blocks,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FlaskConical,
  Globe,
  History,
  Layers,
  MessageSquareText,
  Monitor,
  Plus,
  Redo2,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Undo2,
  X
} from "lucide-react";
import {
  addComponentBlock,
  applyComponentPropertyUpdate,
  duplicateComponentBlock,
  flattenComponentGraphConfig,
  getBlockPresetsForKind,
  moveComponentBlock,
  removeComponentBlock,
  restoreDreamProjectVersion,
  toggleComponentBlockVisibility,
  type DreamProject,
  type EditableProperty,
  type PendingCodeChange
} from "@dream-studio-v2/core";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { SandboxedPreview } from "../components/ui/SandboxedPreview";
import {
  getProject,
  publishProject,
  saveProject,
  unpublishProject
} from "../db/projectDb";
import { bundlePreviewHtml, requestConversationalEdit } from "../api/studioApi";

type ViewportMode = "desktop" | "tablet" | "mobile";
type LeftTab = "structure" | "library" | "versions" | "files";
type RightTab = "properties" | "ai";

export function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<DreamProject | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<DreamProject[]>([]);
  const [redoStack, setRedoStack] = useState<DreamProject[]>([]);

  // UI state
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [leftTab, setLeftTab] = useState<LeftTab>("structure");
  const [rightTab, setRightTab] = useState<RightTab>("properties");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("index.html");

  // AI conversational edit state
  const [aiRequest, setAiRequest] = useState("");
  const [aiFixtureMode, setAiFixtureMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingCodeChange | null>(null);

  // Publish modal state
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rebuildPreview = useCallback(async (proj: DreamProject) => {
    try {
      const html = await bundlePreviewHtml(proj.source.files, proj.componentGraph);
      setPreviewHtml(html);
    } catch {
      // Keep current previewHtml on transient error
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    void (async () => {
      const loaded = await getProject(id);
      if (!active) return;
      if (!loaded) {
        setProject(null);
        setLoading(false);
        return;
      }
      setProject(loaded);
      setSelectedNodeId(loaded.componentGraph.nodes[0]?.id ?? null);
      setSelectedFile(Object.keys(loaded.source.files)[0] ?? "index.html");
      setAiFixtureMode(loaded.generatorSource === "dev_fixture");
      await rebuildPreview(loaded);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, rebuildPreview]);

  const persistProject = useCallback((next: DreamProject, immediate = false) => {
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const run = async () => {
      await saveProject(next);
      setSaveState("saved");
    };
    if (immediate) {
      void run();
    } else {
      saveTimerRef.current = setTimeout(() => void run(), 350);
    }
  }, []);

  const commitChange = useCallback(
    (next: DreamProject, opts?: { rebuild?: boolean; immediate?: boolean; htmlOverride?: string }) => {
      setProject((prev) => {
        if (prev) {
          setUndoStack((stack) => [...stack.slice(-19), prev]);
          setRedoStack([]);
        }
        return next;
      });
      persistProject(next, opts?.immediate ?? false);
      if (opts?.htmlOverride) {
        setPreviewHtml(opts.htmlOverride);
      } else if (opts?.rebuild) {
        void rebuildPreview(next);
      }
    },
    [persistProject, rebuildPreview]
  );

  const handleUndo = () => {
    if (!project || undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1]!;
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, project]);
    setProject(previous);
    persistProject(previous, true);
    void rebuildPreview(previous);
  };

  const handleRedo = () => {
    if (!project || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, project]);
    setProject(next);
    persistProject(next, true);
    void rebuildPreview(next);
  };

  const handlePropertyChange = (
    nodeId: string,
    propKey: string,
    value: string | number | boolean
  ) => {
    if (!project) return;
    const updated = applyComponentPropertyUpdate(project, nodeId, propKey, value);
    commitChange(updated);
  };

  const handleAddBlock = (presetId: string) => {
    if (!project) return;
    const res = addComponentBlock(project, presetId);
    if (!res) return;
    commitChange(res.project, { immediate: true });
    setSelectedNodeId(res.addedNodeId);
    setLeftTab("structure");
    setRightTab("properties");
  };

  const handleRemoveBlock = (nodeId: string) => {
    if (!project || project.componentGraph.nodes.length <= 1) return;
    const updated = removeComponentBlock(project, nodeId);
    commitChange(updated, { immediate: true });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(updated.componentGraph.nodes[0]?.id ?? null);
    }
  };

  const handleMoveBlock = (nodeId: string, direction: "up" | "down") => {
    if (!project) return;
    const updated = moveComponentBlock(project, nodeId, direction);
    commitChange(updated, { immediate: true });
  };

  const handleDuplicateBlock = (nodeId: string) => {
    if (!project) return;
    const res = duplicateComponentBlock(project, nodeId);
    if (!res) return;
    commitChange(res.project, { immediate: true });
    setSelectedNodeId(res.addedNodeId);
  };

  const handleToggleVisibility = (nodeId: string) => {
    if (!project) return;
    const updated = toggleComponentBlockVisibility(project, nodeId);
    commitChange(updated, { immediate: true });
  };

  const handleTitleChange = (title: string) => {
    if (!project) return;
    commitChange({ ...project, title });
  };

  const handleRequestAiEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !aiRequest.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setPendingChange(null);
    try {
      const res = await requestConversationalEdit(project, aiRequest.trim(), aiFixtureMode);
      if (!res.ok) {
        setAiError(res.message);
        return;
      }
      setPendingChange(res.pendingChange);
    } catch {
      setAiError("AI 수정 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApproveDiff = () => {
    if (!pendingChange) return;
    const approvedProject = pendingChange.candidateProject;
    const approvedHtml = pendingChange.previewHtml;
    setPendingChange(null);
    setAiRequest("");
    commitChange(approvedProject, { immediate: true, htmlOverride: approvedHtml });
  };

  const handleRestoreVersion = (targetRevision: number) => {
    if (!project) return;
    const restored = restoreDreamProjectVersion(project, targetRevision);
    if (!restored) return;
    commitChange(restored, { rebuild: true, immediate: true });
  };

  const handlePublishToggle = async () => {
    if (!project) return;
    setPublishing(true);
    try {
      if (project.publishState === "published") {
        const updated = await unpublishProject(project);
        setProject(updated);
      } else {
        const html =
          previewHtml ||
          (await bundlePreviewHtml(project.source.files, project.componentGraph));
        const { project: updated } = await publishProject(project, html);
        setProject(updated);
      }
    } finally {
      setPublishing(false);
    }
  };

  const configMap = useMemo(
    () => (project ? flattenComponentGraphConfig(project.componentGraph) : undefined),
    [project]
  );

  const selectedNode = useMemo(
    () => project?.componentGraph.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [project, selectedNodeId]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] text-sm text-[#70758B]">
        스튜디오 에디터를 불러오는 중...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F8FC] p-6 text-center">
        <h1 className="text-xl font-bold text-[#17182B]">프로젝트를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-[#70758B]">
          삭제되었거나 현재 브라우저에 저장되지 않은 작품입니다.
        </p>
        <Link to="/app" className="mt-5">
          <Button>대시보드로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  const isFixture = project.generatorSource === "dev_fixture";
  const viewportWidthClass =
    viewport === "mobile"
      ? "max-w-[390px]"
      : viewport === "tablet"
        ? "max-w-[768px]"
        : "max-w-full";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F8FC] text-[#17182B]">
      {/* Top Editor Toolbar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#E6E8F0] bg-white px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/app")}
            className="rounded-lg p-1.5 text-[#70758B] hover:bg-[#F7F8FC] hover:text-[#17182B]"
            title="대시보드로 이동"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <input
            type="text"
            aria-label="프로젝트 제목"
            value={project.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="min-w-0 max-w-[220px] truncate rounded-lg border border-transparent px-2 py-1 text-sm font-bold text-[#17182B] hover:border-[#E6E8F0] focus:border-[#6858F5] focus:outline-none sm:max-w-[320px]"
          />
          <Badge tone={project.kind === "game" ? "mint" : "brand"}>
            {project.kind === "game" ? "게임" : "웹사이트"}
          </Badge>
          {isFixture && <Badge tone="amber">Fixture</Badge>}
        </div>

        {/* Center Viewport Controls */}
        <div className="hidden items-center gap-1 rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] p-1 md:flex">
          {(
            [
              { id: "desktop", icon: Monitor, label: "PC" },
              { id: "tablet", icon: Tablet, label: "태블릿" },
              { id: "mobile", icon: Smartphone, label: "모바일" }
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setViewport(item.id)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  viewport === item.id
                    ? "bg-white text-[#5544E4] shadow-2xs"
                    : "text-[#70758B] hover:text-[#17182B]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="rounded-lg p-2 text-[#70758B] hover:bg-[#F7F8FC] hover:text-[#17182B] disabled:opacity-35"
              title="실행 취소 (Undo)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="rounded-lg p-2 text-[#70758B] hover:bg-[#F7F8FC] hover:text-[#17182B] disabled:opacity-35"
              title="다시 실행 (Redo)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <span className="hidden text-xs text-[#70758B] sm:inline">
            {saveState === "saving" ? "저장 중..." : "저장됨"}
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => persistProject(project, true)}
          >
            <Save className="h-3.5 w-3.5" />
            저장
          </Button>

          <Button size="sm" onClick={() => setPublishOpen(true)}>
            <Globe className="h-3.5 w-3.5" />
            {project.publishState === "published" ? "게시 관리" : "게시하기"}
          </Button>
        </div>
      </header>

      {/* 3-Panel Studio Workspace */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Panel: Structure / Block Library / Versions / Code Files */}
        <aside className="hidden w-[276px] shrink-0 flex-col border-r border-[#E6E8F0] bg-white lg:flex">
          <div className="grid grid-cols-4 border-b border-[#E6E8F0] p-1.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setLeftTab("structure")}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 ${
                leftTab === "structure" ? "bg-[#EEF0FF] text-[#5544E4]" : "text-[#70758B]"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              구조
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("library")}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 ${
                leftTab === "library" ? "bg-[#6858F5] text-white" : "text-[#6858F5] hover:bg-[#EEF0FF]"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              추가
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("versions")}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 ${
                leftTab === "versions" ? "bg-[#EEF0FF] text-[#5544E4]" : "text-[#70758B]"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              버전
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("files")}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 ${
                leftTab === "files" ? "bg-[#EEF0FF] text-[#5544E4]" : "text-[#70758B]"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              코드
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {leftTab === "structure" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 pb-1">
                  <p className="text-[11px] font-semibold text-[#70758B]">
                    구성 블록 ({project.componentGraph.nodes.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setLeftTab("library")}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#EEF0FF] px-2 py-1 text-[11px] font-bold text-[#5544E4] hover:bg-[#6858F5] hover:text-white"
                  >
                    <Plus className="h-3 w-3" />새 블록 추가
                  </button>
                </div>
                {project.componentGraph.nodes.map((node, idx) => {
                  const active = node.id === selectedNodeId;
                  return (
                    <div
                      key={node.id}
                      className={`rounded-xl border p-2.5 transition-colors ${
                        active
                          ? "border-[#6858F5] bg-[#EEF0FF]/70"
                          : "border-[#F0F1F6] hover:bg-[#F7F8FC]"
                      } ${node.hidden ? "opacity-55" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          setRightTab("properties");
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-bold text-[#17182B]">
                            {node.labelKo}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              node.editableVia === "block"
                                ? "bg-[#E8F8F2] text-[#14795C]"
                                : "bg-[#EEF0FF] text-[#5544E4]"
                            }`}
                          >
                            {node.editableVia === "block" ? "블록" : "AI 전용"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#70758B]">
                          {node.kind} · 속성 {node.editableProperties.length}개
                        </p>
                      </button>

                      <div className="mt-2 flex items-center justify-end gap-1 border-t border-[#E6E8F0]/70 pt-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveBlock(node.id, "up")}
                          className="rounded p-1 text-[#70758B] hover:bg-white hover:text-[#17182B] disabled:opacity-30"
                          title="위로 이동"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === project.componentGraph.nodes.length - 1}
                          onClick={() => handleMoveBlock(node.id, "down")}
                          className="rounded p-1 text-[#70758B] hover:bg-white hover:text-[#17182B] disabled:opacity-30"
                          title="아래로 이동"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(node.id)}
                          className="rounded p-1 text-[#70758B] hover:bg-white hover:text-[#17182B]"
                          title={node.hidden ? "표시" : "숨기기"}
                        >
                          {node.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateBlock(node.id)}
                          className="rounded p-1 text-[#70758B] hover:bg-white hover:text-[#17182B]"
                          title="블록 복제"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        {project.componentGraph.nodes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBlock(node.id)}
                            className="rounded p-1 text-[#70758B] hover:bg-[#FEECEF] hover:text-[#E75566]"
                            title="블록 삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {leftTab === "library" && (
              <div className="space-y-2.5">
                <div className="px-1">
                  <p className="text-xs font-bold text-[#17182B]">
                    {project.kind === "game" ? "게임 블록 라이브러리 (6종)" : "웹사이트 블록 라이브러리 (8종)"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#70758B]">
                    클릭하면 작품에 즉시 추가되고 속성을 바로 편집할 수 있습니다.
                  </p>
                </div>
                {getBlockPresetsForKind(project.kind).map((preset) => (
                  <button
                    key={preset.presetId}
                    type="button"
                    onClick={() => handleAddBlock(preset.presetId)}
                    className="group w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] p-3 text-left transition-all hover:border-[#6858F5] hover:bg-[#EEF0FF]/50"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-[#6858F5]">
                        {preset.categoryKo}
                      </span>
                      <Plus className="h-3.5 w-3.5 text-[#6858F5] opacity-70 group-hover:opacity-100" />
                    </div>
                    <p className="mt-1 text-xs font-bold text-[#17182B]">{preset.labelKo}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#70758B]">
                      {preset.descriptionKo}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {leftTab === "versions" && (
              <div className="space-y-2">
                <p className="px-2 pb-1 text-[11px] font-semibold text-[#70758B]">
                  저장된 버전 ({project.versions.length})
                </p>
                {[...project.versions].reverse().map((ver) => (
                  <div
                    key={ver.revision}
                    className="rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] p-3"
                  >
                    <p className="text-xs font-bold text-[#17182B]">
                      v{ver.revision} · {ver.changeDescription}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#70758B]">
                      {new Date(ver.createdAt).toLocaleString("ko-KR")}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(ver.revision)}
                      className="mt-2 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6858F5] shadow-2xs hover:bg-[#EEF0FF]"
                    >
                      이 버전으로 복원
                    </button>
                  </div>
                ))}
              </div>
            )}

            {leftTab === "files" && (
              <div className="space-y-2">
                <p className="px-2 pb-1 text-[11px] font-semibold text-[#70758B]">
                  생성된 소스 파일 (읽기 전용)
                </p>
                {Object.keys(project.source.files).map((fileName) => (
                  <button
                    key={fileName}
                    type="button"
                    onClick={() => setSelectedFile(fileName)}
                    className={`block w-full rounded-lg px-2.5 py-1.5 text-left font-mono text-xs ${
                      selectedFile === fileName
                        ? "bg-[#EEF0FF] font-semibold text-[#5544E4]"
                        : "text-[#575C72] hover:bg-[#F7F8FC]"
                    }`}
                  >
                    {fileName}
                  </button>
                ))}
                <pre className="mt-2 max-h-[340px] overflow-auto rounded-xl bg-[#17182B] p-3 font-mono text-[10px] leading-relaxed text-[#E6E8F0]">
                  {project.source.files[selectedFile] ?? ""}
                </pre>
              </div>
            )}
          </div>
        </aside>

        {/* Center Preview Canvas */}
        <main className="flex min-w-0 flex-1 flex-col items-center overflow-auto p-4 sm:p-5">
          <div className={`flex h-full w-full transition-all duration-200 ${viewportWidthClass}`}>
            <SandboxedPreview
              previewHtml={previewHtml}
              configMap={configMap}
              componentGraph={project.componentGraph}
              title={project.title}
              heightClass="h-full"
            />
          </div>
        </main>

        {/* Right Panel: Block Properties & AI Conversational Edit */}
        <aside className="flex w-[330px] shrink-0 flex-col border-l border-[#E6E8F0] bg-white xl:w-[360px]">
          <div className="grid grid-cols-2 border-b border-[#E6E8F0] p-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setRightTab("properties")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 ${
                rightTab === "properties"
                  ? "bg-[#EEF0FF] text-[#5544E4]"
                  : "text-[#70758B] hover:text-[#17182B]"
              }`}
            >
              <Blocks className="h-3.5 w-3.5" />
              블록 속성 편집
            </button>
            <button
              type="button"
              onClick={() => setRightTab("ai")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 ${
                rightTab === "ai"
                  ? "bg-[#6858F5] text-white"
                  : "text-[#70758B] hover:text-[#17182B]"
              }`}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              AI와 함께 수정
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === "properties" ? (
              selectedNode ? (
                <div className="space-y-4">
                  {/* Mobile node selector */}
                  <div className="lg:hidden">
                    <label className="text-[11px] font-semibold text-[#70758B]">
                      구성요소 선택
                    </label>
                    <select
                      value={selectedNode.id}
                      onChange={(e) => setSelectedNodeId(e.target.value)}
                      className="mt-1 h-9 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-2.5 text-xs font-semibold"
                    >
                      {project.componentGraph.nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.labelKo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-[#17182B]">{selectedNode.labelKo}</h2>
                      <Badge tone={selectedNode.editableVia === "block" ? "success" : "brand"}>
                        {selectedNode.editableVia === "block" ? "즉시 블록 편집" : "AI 코드 제어"}
                      </Badge>
                    </div>
                    {selectedNode.interactionSummary && (
                      <p className="mt-1 text-xs text-[#70758B]">
                        {selectedNode.interactionSummary}
                      </p>
                    )}
                  </div>

                  {selectedNode.editableVia === "ai_only" ? (
                    <div className="rounded-2xl border border-[#DCDFFF] bg-[#EEF0FF]/60 p-4 text-xs text-[#5544E4]">
                      <p className="font-bold">AI 대화로 수정하는 고급 구성요소입니다</p>
                      <p className="mt-1 leading-relaxed text-[#575C72]">
                        {selectedNode.aiEditHintKo ??
                          "이 요소의 동작 로직이나 구조는 AI 수정 탭에서 한국어로 요청하면 Diff를 미리 확인한 뒤 안전하게 바꿀 수 있습니다."}
                      </p>
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          setAiRequest(`'${selectedNode.labelKo}' 구성요소의 기능을 개선해줘`);
                          setRightTab("ai");
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        AI에게 수정 요청하기
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedNode.editableProperties.map((prop) => (
                        <PropertyField
                          key={prop.key}
                          prop={prop}
                          onChange={(val) => handlePropertyChange(selectedNode.id, prop.key, val)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#70758B]">
                  왼쪽 구조 패널에서 편집할 구성요소를 선택하세요.
                </p>
              )
            ) : (
              /* AI Conversational Edit Tab */
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#F7F8FC] p-3.5 text-xs text-[#575C72]">
                  <p className="font-bold text-[#17182B]">자연어로 작품의 구조와 규칙을 수정하세요</p>
                  <p className="mt-1 leading-relaxed">
                    AI가 변경할 코드를 제안하면 Diff를 확인하고 승인할 때만 작품에 반영됩니다.
                  </p>
                  <label className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#5544E4]">
                    <input
                      type="checkbox"
                      checked={aiFixtureMode}
                      onChange={(e) => setAiFixtureMode(e.target.checked)}
                      className="accent-[#6858F5]"
                    />
                    <FlaskConical className="h-3 w-3" />
                    개발 테스트 모드 (Fixture Diff 검증)
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    "분위기를 더 따뜻한 포인트 컬러로 바꿔줘",
                    "상단 안내 배지를 추가해줘",
                    project.kind === "game"
                      ? "플레이어 이동 속도를 더 빠르게 만들어줘"
                      : "설명 문구를 더 친근하게 바꿔줘"
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setAiRequest(chip)}
                      className="rounded-full border border-[#E6E8F0] bg-white px-2.5 py-1 text-[11px] text-[#575C72] hover:border-[#6858F5] hover:text-[#5544E4]"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <form onSubmit={(e) => void handleRequestAiEdit(e)} className="space-y-2.5">
                  <textarea
                    rows={3}
                    value={aiRequest}
                    onChange={(e) => setAiRequest(e.target.value)}
                    placeholder="예: 다크 모드로 바꾸고 상단에 새 안내 배너를 추가해줘"
                    className="w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] p-3 text-xs text-[#17182B] focus:border-[#6858F5] focus:bg-white focus:outline-none"
                  />
                  <Button type="submit" size="sm" className="w-full" disabled={aiLoading}>
                    <Send className="h-3.5 w-3.5" />
                    {aiLoading ? "AI 수정안 생성 중..." : "수정안(Diff) 미리보기 요청"}
                  </Button>
                </form>

                {aiError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#FBC9D0] bg-[#FEECEF] p-3 text-xs text-[#B82839]"
                  >
                    {aiError}
                  </div>
                )}

                {pendingChange && (
                  <div className="rounded-2xl border border-[#6858F5]/40 bg-[#F9F9FF] p-4">
                    <div className="flex items-center justify-between">
                      <Badge tone="brand">Diff 승인 대기</Badge>
                      <span className="text-[11px] font-mono text-[#70758B]">
                        {pendingChange.changedFiles.join(", ")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-[#17182B]">
                      {pendingChange.summaryKo}
                    </p>
                    <ul className="mt-2.5 space-y-1 rounded-xl bg-[#17182B] p-3 font-mono text-[10px] leading-relaxed text-[#E6E8F0]">
                      {pendingChange.diffItems.map((line, idx) => (
                        <li key={idx}>+ {line}</li>
                      ))}
                    </ul>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="flex-1" onClick={handleApproveDiff}>
                        <Check className="h-3.5 w-3.5" />
                        변경 적용하기
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPendingChange(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Publish Modal */}
      {publishOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17182B]/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#17182B]">작품 게시 및 공유</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#70758B]">
              게시하면 편집 도구 없이 깔끔하게 실행되는 독립 스냅샷 페이지가 서버에 저장되어
              다른 기기나 친구에게 링크로 바로 공유할 수 있습니다.
            </p>

            {project.publishState === "published" && project.publishedSlug && (
              <div className="mt-4 rounded-xl border border-[#BCEAD8] bg-[#E8F8F2] p-3.5 text-xs">
                <p className="font-bold text-[#14795C]">현재 게시 중 (타 기기 공유 가능)</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Link
                    to={`/${project.kind === "game" ? "g" : "p"}/${project.publishedSlug}`}
                    className="inline-flex items-center gap-1 truncate font-mono font-semibold text-[#5544E4] underline"
                  >
                    /{project.kind === "game" ? "g" : "p"}/{project.publishedSlug}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/${project.kind === "game" ? "g" : "p"}/${project.publishedSlug}`;
                      void navigator.clipboard?.writeText(shareUrl);
                    }}
                    className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#17182B] shadow-2xs hover:bg-[#EEF0FF]"
                  >
                    링크 복사
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPublishOpen(false)}>
                닫기
              </Button>
              <Button
                variant={project.publishState === "published" ? "danger" : "primary"}
                size="sm"
                disabled={publishing}
                onClick={() => void handlePublishToggle()}
              >
                {publishing
                  ? "처리 중..."
                  : project.publishState === "published"
                    ? "게시 중단"
                    : "지금 게시하기"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyField({
  prop,
  onChange
}: {
  prop: EditableProperty;
  onChange: (val: string | number | boolean) => void;
}) {
  if (prop.type === "boolean") {
    return (
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3.5 py-2.5">
        <span className="text-xs font-semibold text-[#17182B]">{prop.labelKo}</span>
        <input
          type="checkbox"
          checked={Boolean(prop.value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[#6858F5]"
        />
      </label>
    );
  }

  if (prop.type === "color") {
    return (
      <div>
        <label className="block text-xs font-semibold text-[#17182B]">{prop.labelKo}</label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="color"
            value={String(prop.value)}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-[#E6E8F0] bg-white p-0.5"
          />
          <input
            type="text"
            value={String(prop.value)}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 flex-1 rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3 font-mono text-xs"
          />
        </div>
      </div>
    );
  }

  if (prop.type === "number") {
    return (
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[#17182B]">{prop.labelKo}</label>
          <span className="font-mono text-xs font-bold text-[#6858F5]">{String(prop.value)}</span>
        </div>
        <input
          type="range"
          min={prop.min ?? 0}
          max={prop.max ?? 100}
          step={prop.step ?? 1}
          value={Number(prop.value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-2 w-full accent-[#6858F5]"
        />
      </div>
    );
  }

  if (prop.type === "select" && prop.options && prop.options.length > 0) {
    return (
      <div>
        <label className="block text-xs font-semibold text-[#17182B]">{prop.labelKo}</label>
        <select
          value={String(prop.value)}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 h-9 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3 text-xs text-[#17182B] focus:border-[#6858F5] focus:bg-white focus:outline-none"
        >
          {prop.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (prop.type === "textarea") {
    return (
      <div>
        <label className="block text-xs font-semibold text-[#17182B]">{prop.labelKo}</label>
        <textarea
          rows={3}
          value={String(prop.value)}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] p-2.5 text-xs text-[#17182B] focus:border-[#6858F5] focus:bg-white focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-[#17182B]">{prop.labelKo}</label>
      <input
        type="text"
        value={String(prop.value)}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-9 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3 text-xs text-[#17182B] focus:border-[#6858F5] focus:bg-white focus:outline-none"
      />
    </div>
  );
}
