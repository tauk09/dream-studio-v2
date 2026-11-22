import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Globe, Sparkles } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { Button } from "../components/ui/Button";
import { AIStatusBanner } from "../components/ui/AIStatusBanner";
import { startGenerationJob } from "../api/studioApi";

const STYLE_OPTIONS = [
  { id: "AI에게 추천받기", label: "AI에게 추천받기", desc: "주제에 가장 잘 어울리는 스타일 자동 설계" },
  { id: "깔끔하고 모던", label: "깔끔하고 모던", desc: "정돈된 화이트·인디고 레이아웃" },
  { id: "밝고 친근한", label: "밝고 친근한", desc: "둥근 카드와 따뜻한 포인트 컬러" },
  { id: "다크 테크", label: "다크 테크", desc: "네온 포인트와 깊이감 있는 다크 UI" },
  { id: "따뜻한 에디토리얼", label: "따뜻한 에디토리얼", desc: "매거진처럼 읽기 편한 감성 타이포그래피" },
  { id: "생동감 있는 일러스트", label: "생동감 있는 일러스트", desc: "활기차고 다채로운 컬러 조합" }
];

const EXAMPLE_PROMPTS = [
  "컴퓨터 교사가 꿈이라 이진수 스위치를 직접 눌러볼 수 있는 인터랙티브 학습 웹사이트를 만들고 싶어",
  "요리사가 되고 싶어서 인원수를 바꾸면 재료가 자동 계산되는 나만의 레시피 북 사이트를 만들고 싶어",
  "건축가가 꿈이라 낮과 밤 조명을 전환하며 친환경 주택 설계를 보여주는 포트폴리오 웹사이트를 만들고 싶어"
];

export function CreateWebsitePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [designIntent, setDesignIntent] = useState("AI에게 추천받기");
  const [extraNotes, setExtraNotes] = useState("");
  const [testFixtureMode, setTestFixtureMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length < 2) {
      setErrorMsg("만들고 싶은 웹사이트 아이디어를 2글자 이상 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await startGenerationJob({
        kind: "website",
        prompt: prompt.trim(),
        designIntent,
        extraNotes: extraNotes.trim() || undefined,
        testFixtureMode
      });
      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }
      navigate(`/app/generating/${res.jobId}`);
    } catch {
      setErrorMsg("생성 요청 중 네트워크 오류가 발생했습니다.");
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
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6858F5]">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#17182B]">웹사이트 만들기</h1>
            <p className="text-sm text-[#70758B]">
              3가지 질문에 답하면 AI가 아이디어를 실제 동작하는 웹사이트로 구현합니다.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <AIStatusBanner
            testFixtureMode={testFixtureMode}
            onToggleTestFixtureMode={setTestFixtureMode}
          />
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-6">
          {/* Q1 */}
          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6">
            <label htmlFor="website-prompt" className="block text-sm font-bold text-[#17182B]">
              1. 어떤 웹사이트를 만들고 싶나요?
            </label>
            <p className="mt-1 text-xs text-[#70758B]">
              장래희망, 주제, 들어가면 좋을 인터랙션을 자유롭게 적어 주세요.
            </p>
            <textarea
              id="website-prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 컴퓨터 교사가 꿈인데, 학생들이 이진수 스위치를 직접 눌러보며 10진수로 바뀌는 과정을 배울 수 있는 웹사이트를 만들고 싶어."
              className="mt-3 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] p-3.5 text-sm text-[#17182B] placeholder:text-[#70758B]/80 focus:border-[#6858F5] focus:bg-white focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setPrompt(sample)}
                  className="rounded-full border border-[#E6E8F0] bg-[#F7F8FC] px-3 py-1 text-left text-[11px] font-medium text-[#575C72] hover:border-[#6858F5]/50 hover:bg-[#EEF0FF] hover:text-[#5544E4]"
                >
                  {sample.slice(0, 34)}...
                </button>
              ))}
            </div>
          </div>

          {/* Q2 */}
          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6">
            <p className="text-sm font-bold text-[#17182B]">2. 어떤 분위기로 만들까요?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {STYLE_OPTIONS.map((style) => {
                const selected = designIntent === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setDesignIntent(style.id)}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      selected
                        ? "border-[#6858F5] bg-[#EEF0FF]/70 ring-1 ring-[#6858F5]"
                        : "border-[#E6E8F0] bg-white hover:border-[#D5D8E5]"
                    }`}
                  >
                    <p className="text-xs font-bold text-[#17182B]">{style.label}</p>
                    <p className="mt-1 text-[11px] leading-snug text-[#70758B]">{style.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q3 */}
          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6">
            <label htmlFor="website-notes" className="block text-sm font-bold text-[#17182B]">
              3. 꼭 넣고 싶은 섹션이나 요청사항 (선택)
            </label>
            <input
              id="website-notes"
              type="text"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="예: 퀴즈 섹션 포함, 모바일에서도 보기 편하게 구성"
              className="mt-3 h-11 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3.5 text-sm text-[#17182B] placeholder:text-[#70758B]/80 focus:border-[#6858F5] focus:bg-white focus:outline-none"
            />
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
            <Button type="submit" size="lg" disabled={submitting}>
              <Sparkles className="h-4 w-4" />
              {submitting
                ? "생성 작업 시작 중..."
                : testFixtureMode
                  ? "개발 테스트 모드로 웹사이트 검증"
                  : "실제 AI로 웹사이트 만들기"}
            </Button>
          </div>
        </form>
      </div>
    </WorkspaceLayout>
  );
}
