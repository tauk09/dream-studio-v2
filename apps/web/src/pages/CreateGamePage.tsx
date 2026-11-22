import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Gamepad2, Sparkles, Wand2 } from "lucide-react";
import type { GameIdeaRecommendation } from "@dream-studio-v2/core";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { AIStatusBanner } from "../components/ui/AIStatusBanner";
import { recommendGameIdeas, startGenerationJob } from "../api/studioApi";

const VISUAL_STYLES = ["네온 아케이드", "귀여운 파스텔", "픽셀 레트로", "AI에게 추천받기"];

export function CreateGamePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"recommend" | "custom">("recommend");
  const [careerInput, setCareerInput] = useState("항공우주 공학자");
  const [recommendations, setRecommendations] = useState<GameIdeaRecommendation[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<GameIdeaRecommendation | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [visualStyle, setVisualStyle] = useState("네온 아케이드");
  const [difficulty, setDifficulty] = useState("보통");
  const [testFixtureMode, setTestFixtureMode] = useState(false);
  const [loadingRec, setLoadingRec] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRecommend = async () => {
    if (!careerInput.trim()) {
      setErrorMsg("장래희망이나 관심 주제를 입력해 주세요.");
      return;
    }
    setLoadingRec(true);
    setErrorMsg(null);
    try {
      const res = await recommendGameIdeas(careerInput.trim(), testFixtureMode);
      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }
      setRecommendations(res.ideas ?? []);
      setSelectedIdea(res.ideas?.[0] ?? null);
    } catch {
      setErrorMsg("게임 아이디어 추천 중 오류가 발생했습니다.");
    } finally {
      setLoadingRec(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrompt =
      mode === "recommend" && selectedIdea
        ? `${careerInput} 테마 게임 '${selectedIdea.title}': ${selectedIdea.coreGameplay} (${selectedIdea.oneLiner})`
        : customPrompt.trim();

    if (finalPrompt.length < 2) {
      setErrorMsg(
        mode === "recommend"
          ? "먼저 게임 아이디어를 추천받고 하나를 선택해 주세요."
          : "만들고 싶은 게임 규칙과 아이디어를 입력해 주세요."
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await startGenerationJob({
        kind: "game",
        prompt: finalPrompt,
        designIntent: visualStyle,
        extraNotes: `난이도: ${difficulty}`,
        testFixtureMode
      });
      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }
      navigate(`/app/generating/${res.jobId}`);
    } catch {
      setErrorMsg("게임 생성 요청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate("/app/create")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#70758B] hover:text-[#17182B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          작품 종류 선택으로 돌아가기
        </button>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E6FAF6] text-[#117A69]">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#17182B]">게임 만들기</h1>
            <p className="text-sm text-[#70758B]">
              장래희망에 어울리는 게임을 AI에게 추천받거나, 내가 상상한 규칙을 직접 설명하세요.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <AIStatusBanner
            testFixtureMode={testFixtureMode}
            onToggleTestFixtureMode={setTestFixtureMode}
          />
        </div>

        {/* Mode Tabs */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-[#E6E8F0] bg-white p-1.5">
          <button
            type="button"
            onClick={() => setMode("recommend")}
            className={`rounded-xl py-2.5 text-sm font-bold transition-colors ${
              mode === "recommend"
                ? "bg-[#6858F5] text-white shadow-xs"
                : "text-[#70758B] hover:text-[#17182B]"
            }`}
          >
            Mode A · AI 게임 아이디어 추천
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`rounded-xl py-2.5 text-sm font-bold transition-colors ${
              mode === "custom"
                ? "bg-[#6858F5] text-white shadow-xs"
                : "text-[#70758B] hover:text-[#17182B]"
            }`}
          >
            Mode B · 내가 직접 설명하기
          </button>
        </div>

        <form onSubmit={(e) => void handleGenerate(e)} className="mt-6 space-y-6">
          {mode === "recommend" ? (
            <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6">
              <label htmlFor="career-input" className="block text-sm font-bold text-[#17182B]">
                장래희망 또는 관심 분야를 알려주세요
              </label>
              <div className="mt-3 flex gap-2">
                <input
                  id="career-input"
                  type="text"
                  value={careerInput}
                  onChange={(e) => setCareerInput(e.target.value)}
                  placeholder="예: 항공우주 공학자, 수의사, 해양생물학자, 요리사"
                  className="h-11 flex-1 rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3.5 text-sm text-[#17182B] focus:border-[#6858F5] focus:bg-white focus:outline-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleRecommend()}
                  disabled={loadingRec}
                >
                  <Wand2 className="h-4 w-4" />
                  {loadingRec ? "추천 중..." : "아이디어 추천"}
                </Button>
              </div>

              {recommendations.length > 0 && (
                <div className="mt-5 grid gap-3">
                  {recommendations.map((rec) => {
                    const active = selectedIdea?.id === rec.id;
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setSelectedIdea(rec)}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          active
                            ? "border-[#6858F5] bg-[#EEF0FF]/60 ring-1 ring-[#6858F5]"
                            : "border-[#E6E8F0] bg-[#F7F8FC] hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-[#17182B]">{rec.title}</h3>
                          <Badge tone="mint">
                            {rec.genre} · {rec.difficultyLabel}
                          </Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-[#575C72]">{rec.oneLiner}</p>
                        <p className="mt-2 text-[11px] font-medium text-[#70758B]">
                          조작: {rec.controls} · 목표: {rec.goal}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6">
              <label htmlFor="custom-game-prompt" className="block text-sm font-bold text-[#17182B]">
                만들고 싶은 게임의 규칙과 조작을 설명해 주세요
              </label>
              <textarea
                id="custom-game-prompt"
                rows={4}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="예: 화성 탐사 로버를 방향키로 조종해서 운석을 피하고 60초 동안 암석 샘플을 모으는 2D 아케이드 게임"
                className="mt-3 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] p-3.5 text-sm text-[#17182B] focus:border-[#6858F5] focus:bg-white focus:outline-none"
              />
            </div>
          )}

          {/* Style & Difficulty */}
          <div className="grid gap-4 rounded-2xl border border-[#E6E8F0] bg-white p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-[#17182B]">비주얼 스타일</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {VISUAL_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setVisualStyle(style)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                      visualStyle === style
                        ? "border-[#6858F5] bg-[#EEF0FF] text-[#5544E4]"
                        : "border-[#E6E8F0] text-[#70758B]"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#17182B]">기본 난이도</p>
              <div className="mt-2.5 flex gap-2">
                {["쉬움", "보통", "도전"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold ${
                      difficulty === d
                        ? "border-[#6858F5] bg-[#EEF0FF] text-[#5544E4]"
                        : "border-[#E6E8F0] text-[#70758B]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl border border-[#FBC9D0] bg-[#FEECEF] px-4 py-3.5 text-sm font-medium text-[#B82839]"
            >
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate("/app")}>
              취소
            </Button>
            <Button type="submit" size="lg" variant="mint" disabled={submitting}>
              <Sparkles className="h-4 w-4" />
              {submitting
                ? "게임 생성 시작 중..."
                : testFixtureMode
                  ? "개발 테스트 모드로 게임 검증"
                  : "실제 AI로 게임 만들기"}
            </Button>
          </div>
        </form>
      </div>
    </WorkspaceLayout>
  );
}
