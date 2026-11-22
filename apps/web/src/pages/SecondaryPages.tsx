import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Cloud,
  Compass,
  HelpCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  User
} from "lucide-react";
import { PublicHeader } from "../components/layout/PublicHeader";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  listPublished,
  syncLocalProjectsToCloud,
  type PublishedSnapshot
} from "../db/projectDb";
import { useAuthStore } from "../store/authStore";

export function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <Badge tone="brand">Dream Studio 2.0 철학</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#17182B]">
          학생은 아이디어를 만들고, AI는 구현합니다
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#70758B]">
          Dream Studio 2.0은 기존 템플릿에 문구만 채워 넣는 도구가 아니라, 학생이 한국어로 설명한
          장래희망과 아이디어를 AI가 직접 설계·구현하고, 격리된 샌드박스에서 안전하게 실행하며,
          블록 편집과 AI 대화로 끝까지 발전시킬 수 있도록 만든 AI-Native 창작 플랫폼입니다.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {[
            {
              title: "템플릿 한계 제거",
              desc: "AI가 주제에 맞는 HTML/CSS/JS와 편집 가능한 Component Graph를 매번 새로 생성합니다."
            },
            {
              title: "이중 편집 경험",
              desc: "14종 블록 추가·속성 수정은 즉시 반영하고, 구조·규칙 변경은 AI Diff 승인으로 처리합니다."
            },
            {
              title: "정적 보안 검증 + 격리 샌드박스",
              desc: "외부 네트워크와 위험 API를 정적 검사로 차단하고 sandbox=\"allow-scripts\" 격리 프레임에서 실행합니다."
            },
            {
              title: "클라우드 계정 동기화 & 공유 URL",
              desc: "로그인하면 어떤 기기에서도 내 작품을 이어서 편집하고, 게시 링크(/p/:slug, /g/:slug)로 친구에게 공유할 수 있습니다."
            }
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-[#E6E8F0] bg-white p-6">
              <h2 className="text-base font-bold text-[#17182B]">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#70758B]">{card.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function GuidePage() {
  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <div className="flex items-center gap-2 text-[#6858F5]">
          <BookOpen className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">USER GUIDE</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[#17182B]">Dream Studio 2.0 사용 가이드</h1>
        <ol className="mt-8 space-y-4">
          {[
            {
              title: "1. 작품 종류 선택 (/app/create)",
              body: "웹사이트와 2D 웹 게임 중 만들고 싶은 형태를 고릅니다."
            },
            {
              title: "2. 한국어로 아이디어 입력",
              body: "장래희망, 원하는 분위기, 넣고 싶은 인터랙션을 편하게 설명합니다. 게임은 AI 추천 모드도 지원합니다."
            },
            {
              title: "3. 블록 추가 & 속성 편집",
              body: "에디터 왼쪽 '+ 추가' 탭에서 퀴즈·카드·배너·게임 규칙 블록을 자유롭게 추가하고, 오른쪽 패널에서 즉시 꾸밉니다."
            },
            {
              title: "4. 클라우드 저장 & 친구에게 공유",
              body: "로그인하면 다른 컴퓨터에서도 작품을 이어서 작업할 수 있고, '게시하기'를 누르면 공유 링크로 누구나 실행해 볼 수 있습니다."
            }
          ].map((step) => (
            <li key={step.title} className="rounded-2xl border border-[#E6E8F0] bg-white p-6">
              <h2 className="text-base font-bold text-[#17182B]">{step.title}</h2>
              <p className="mt-1.5 text-sm text-[#70758B]">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Link to="/app/create">
            <Button>
              지금 바로 만들어 보기 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export function ExplorePage() {
  const [items, setItems] = useState<PublishedSnapshot[]>([]);

  useEffect(() => {
    void listPublished().then(setItems);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-center gap-2 text-[#6858F5]">
          <Compass className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">GALLERY</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[#17182B]">게시된 작품 갤러리</h1>
        <p className="mt-2 text-sm text-[#70758B]">
          서버에 게시되어 다른 기기에서도 바로 열어볼 수 있는 학생 창작 작품 목록입니다.
        </p>

        {items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D5D8E5] bg-white p-12 text-center">
            <p className="text-sm font-semibold text-[#17182B]">아직 게시된 작품이 없습니다.</p>
            <p className="mt-1 text-xs text-[#70758B]">
              에디터에서 작품을 만들고 &apos;게시하기&apos;를 누르면 이곳과 공유 링크에서 바로 열 수 있습니다.
            </p>
            <div className="mt-5">
              <Link to="/app/create">
                <Button>첫 작품 만들고 게시하기</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.slug}
                to={`/${item.kind === "game" ? "g" : "p"}/${item.slug}`}
                className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={item.kind === "game" ? "mint" : "brand"}>
                      {item.kind === "game" ? "게임" : "웹사이트"}
                    </Badge>
                    {item.isDevFixture && <Badge tone="amber">Fixture</Badge>}
                  </div>
                  {item.authorName && (
                    <span className="text-[11px] font-medium text-[#70758B]">
                      by {item.authorName}
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-base font-bold text-[#17182B]">{item.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-[#70758B]">{item.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export function HelpPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <div className="flex items-center gap-2 text-[#6858F5]">
          <HelpCircle className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">HELP &amp; FAQ</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[#17182B]">자주 묻는 질문</h1>
        <div className="mt-8 space-y-4">
          {[
            {
              q: "다른 컴퓨터나 스마트폰에서도 내 작품을 이어서 편집할 수 있나요?",
              a: "네! 이메일로 회원가입/로그인하면 작품이 서버 클라우드 DB에 자동 동기화되어 어느 기기에서든 이어서 편집할 수 있습니다."
            },
            {
              q: "만든 작품을 친구에게 공유하려면 어떻게 하나요?",
              a: "에디터 상단의 '게시하기'를 누르면 서버에 불변 스냅샷이 저장되며, 발급된 /p/:slug 또는 /g/:slug 링크를 복사해 다른 기기에서도 바로 열 수 있습니다."
            },
            {
              q: "생성된 코드가 브라우저 보안에 안전한가요?",
              a: "정적 보안 검사기가 외부 네트워크 호출과 위험 API를 차단하며, 실행은 opaque origin(sandbox=\"allow-scripts\") iframe 내부에서만 이루어집니다."
            }
          ].map((faq) => (
            <div key={faq.q} className="rounded-2xl border border-[#E6E8F0] bg-white p-6">
              <h2 className="text-sm font-bold text-[#17182B]">{faq.q}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#70758B]">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTarget =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/app";

  const { user, login, register } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(redirectTarget, { replace: true });
  }, [user, navigate, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await login(email, password)
          : await register(email, password, displayName);
      if (!res.ok) {
        setError(res.message ?? "인증에 실패했습니다.");
        return;
      }
      await syncLocalProjectsToCloud();
      navigate(redirectTarget, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <PublicHeader />
      <main className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-3xl border border-[#E6E8F0] bg-white p-8 shadow-xs">
          <div className="flex items-center justify-between">
            <Badge tone="brand">
              <Cloud className="h-3.5 w-3.5" />
              클라우드 동기화 계정
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-[#17182B]">
            {mode === "login" ? "내 스튜디오 로그인" : "새 계정 만들기"}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#70758B]">
            작품을 만들고 클라우드에 안전하게 저장하려면 먼저 로그인하거나 새 계정을 만들어 주세요.
          </p>

          {redirectParam && (
            <div className="mt-4 rounded-xl border border-[#DCDFFF] bg-[#EEF0FF]/70 px-3.5 py-2.5 text-xs font-medium text-[#5544E4]">
              로그인 또는 회원가입을 완료하면 바로 작품 제작 화면으로 이동합니다.
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl bg-[#F7F8FC] p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`rounded-lg py-2 ${
                mode === "login" ? "bg-white text-[#5544E4] shadow-2xs" : "text-[#70758B]"
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`rounded-lg py-2 ${
                mode === "register" ? "bg-white text-[#5544E4] shadow-2xs" : "text-[#70758B]"
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-3.5">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-[#17182B]">닉네임 / 이름</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="예: 민수 (코딩 동아리)"
                  className="mt-1 h-10 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3 text-sm focus:border-[#6858F5] focus:bg-white focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#17182B]">이메일</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.kr"
                className="mt-1 h-10 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3 text-sm focus:border-[#6858F5] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17182B]">
                비밀번호 {mode === "register" && "(6자 이상)"}
              </label>
              <input
                type="password"
                required
                minLength={mode === "register" ? 6 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 h-10 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3 text-sm focus:border-[#6858F5] focus:bg-white focus:outline-none"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[#FBC9D0] bg-[#FEECEF] px-3.5 py-2.5 text-xs font-medium text-[#B82839]"
              >
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting
                ? "처리 중..."
                : mode === "login"
                  ? "로그인하고 클라우드 열기"
                  : "회원가입하고 시작하기"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

export function AccountPage() {
  const navigate = useNavigate();
  const { user, refreshAuth, logout } = useAuthStore();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const count = await syncLocalProjectsToCloud();
      setSyncMsg(
        count > 0
          ? `로컬 작품 ${count}개를 클라우드 계정으로 동기화했습니다.`
          : "동기화할 새 로컬 작품이 없습니다."
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#E6E8F0] bg-white p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6858F5]">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17182B]">
                {user ? user.displayName : "게스트 크리에이터"}
              </h1>
              <p className="text-xs text-[#70758B]">
                {user ? user.email : "로컬 브라우저 IndexedDB 저장소 사용 중"}
              </p>
            </div>
          </div>
          <Badge tone={user ? "success" : "neutral"}>
            {user ? "클라우드 동기화 활성" : "게스트 모드"}
          </Badge>
        </div>

        {user ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-[#E8F8F2] p-4 text-xs leading-relaxed text-[#14795C]">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="h-4 w-4 text-[#1EA882]" />
                클라우드 DB 자동 동기화 중
              </div>
              <p className="mt-1">
                모든 작품 저장·편집·게시가 서버 데이터베이스에 실시간 반영되어 다른 기기에서도
                그대로 이어서 작업할 수 있습니다.
              </p>
            </div>

            {syncMsg && (
              <p className="rounded-xl bg-[#EEF0FF] px-3.5 py-2.5 text-xs font-semibold text-[#5544E4]">
                {syncMsg}
              </p>
            )}

            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" size="sm" onClick={() => void handleManualSync()} disabled={syncing}>
                <RefreshCw className="h-3.5 w-3.5" />
                {syncing ? "동기화 중..." : "로컬 작품 클라우드로 가져오기"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-[#F7F8FC] p-4 text-xs leading-relaxed text-[#575C72]">
              <p className="font-bold text-[#17182B]">로그인하면 이런 점이 좋아집니다</p>
              <p className="mt-1">
                지금 만든 로컬 작품이 클라우드 계정에 안전하게 백업되며, 집이나 학교 다른 컴퓨터에서
                로그인해도 그대로 이어서 편집할 수 있습니다.
              </p>
            </div>
            <Link to="/login">
              <Button>
                로그인 / 회원가입하기 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
