import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Blocks,
  Code2,
  Gamepad2,
  Globe,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Wand2
} from "lucide-react";
import { PublicHeader } from "../components/layout/PublicHeader";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export function LandingPage() {
  const [heroTab, setHeroTab] = useState<"website" | "game">("website");

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#17182B]">
      <PublicHeader />

      {/* Hero Section */}
      <section className="hero-ambient relative overflow-hidden border-b border-[#E6E8F0]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-18 sm:px-6 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-6">
            <Badge tone="brand" className="mb-5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Native No-Code Creative Studio
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.16] tracking-tight text-[#17182B] sm:text-5xl">
              상상한 아이디어가,
              <br />
              <span className="bg-gradient-to-r from-[#6858F5] via-[#5544E4] to-[#2BB8A3] bg-clip-text text-transparent">
                진짜 작품이 되는 곳.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#70758B] sm:text-lg">
              코딩을 몰라도 괜찮습니다. 장래희망과 만들고 싶은 아이디어를 한국어로 설명하면
              AI가 웹사이트와 실제 플레이 가능한 게임을 새로 설계하고 구현합니다.
              완성된 작품은 블록 편집과 AI 대화로 자유롭게 발전시킬 수 있습니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/app/create">
                <Button size="lg">
                  무료로 첫 작품 만들기
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/app">
                <Button variant="secondary" size="lg">
                  내 스튜디오 열기
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-[#70758B]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#1EA882]" />
                격리 샌드박스 안전 실행
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Blocks className="h-4 w-4 text-[#6858F5]" />
                블록 편집 + AI 대화 수정
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-[#32CDB5]" />
                템플릿이 아닌 맞춤형 코드 생성
              </span>
            </div>
          </div>

          {/* Interactive Preview Card */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-[#E6E8F0] bg-white p-4 shadow-xl shadow-[#17182B]/5 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E75566]/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FFB66D]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1EA882]/80" />
                </div>
                <div className="inline-flex rounded-xl bg-[#F7F8FC] p-1">
                  <button
                    type="button"
                    onClick={() => setHeroTab("website")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      heroTab === "website"
                        ? "bg-white text-[#5544E4] shadow-xs"
                        : "text-[#70758B] hover:text-[#17182B]"
                    }`}
                  >
                    웹사이트 예시
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroTab("game")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      heroTab === "game"
                        ? "bg-white text-[#5544E4] shadow-xs"
                        : "text-[#70758B] hover:text-[#17182B]"
                    }`}
                  >
                    게임 예시
                  </button>
                </div>
              </div>

              {heroTab === "website" ? (
                <div className="rounded-2xl border border-[#E6E8F0] bg-[#F7F8FC] p-5">
                  <div className="flex items-center justify-between">
                    <Badge tone="brand">컴퓨터 교사 꿈 · 인터랙티브 웹</Badge>
                    <span className="text-[11px] font-mono text-[#70758B]">Live DOM + Manifest</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-[#17182B]">
                    이진수 스위치 &amp; 논리 게이트 실험실
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#70758B]">
                    학생이 8비트 스위치를 직접 클릭해 10진수 변환을 체험하고, 퀴즈로 학습할 수 있는
                    맞춤형 교육 웹페이지
                  </p>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {["128", "64", "32", "16"].map((bit, idx) => (
                      <div
                        key={bit}
                        className={`rounded-xl border px-3 py-2.5 text-center ${
                          idx % 2 === 0
                            ? "border-[#6858F5] bg-[#6858F5] text-white"
                            : "border-[#E6E8F0] bg-white text-[#17182B]"
                        }`}
                      >
                        <div className="text-[10px] opacity-80">{bit}</div>
                        <div className="mt-0.5 font-mono text-base font-bold">
                          {idx % 2 === 0 ? "1" : "0"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#1E213A] bg-[#13152A] p-5 text-white">
                  <div className="flex items-center justify-between">
                    <Badge tone="mint">항공우주 공학자 꿈 · 2D 게임</Badge>
                    <span className="text-[11px] font-mono text-white/60">Canvas 60fps</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold">화성 탐사 로버 샘플 수집 작전</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">
                    방향키로 로버를 조종해 운석과 모래폭풍을 피하고 희귀 암석 샘플을 수집하는
                    실시간 웹 게임
                  </p>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-xs">
                    <span>남은 시간 45초</span>
                    <span className="font-mono font-bold text-[#32CDB5]">SCORE 240</span>
                    <span>실드 3/3</span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#EEF0FF]/70 px-4 py-3 text-xs">
                <span className="font-medium text-[#5544E4]">
                  “배경색을 더 따뜻하게 바꾸고 퀴즈 점수를 추가해줘”
                </span>
                <span className="shrink-0 font-semibold text-[#6858F5]">AI Diff 수정 →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Website vs Game 2 Cards */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            무엇이든 원하는 형태로 창작하세요
          </h2>
          <p className="mt-2 text-sm text-[#70758B] sm:text-base">
            정해진 틀에 글자만 채워 넣는 방식이 아니라, 아이디어에 맞는 구조와 상호작용을 새로 만듭니다.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-3xl border border-[#E6E8F0] bg-white p-8 shadow-xs transition-shadow hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6858F5]">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold">맞춤형 웹사이트 창작</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#70758B]">
                진로 포트폴리오, 인터랙티브 학습 실험실, 레시피 계산기, 동아리 소개 페이지까지.
                아이디어에 어울리는 레이아웃과 인터랙션 위젯을 AI가 직접 구성합니다.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-[#575C72]">
                <li>• 텍스트·색상·수치를 즉시 바꾸는 Component Graph 블록 편집</li>
                <li>• PC · 태블릿 · 모바일 반응형 미리보기 지원</li>
              </ul>
            </div>
            <div className="mt-7">
              <Link to="/app/create/website">
                <Button variant="secondary" className="w-full sm:w-auto">
                  웹사이트 만들기 시작
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-3xl border border-[#E6E8F0] bg-white p-8 shadow-xs transition-shadow hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6FAF6] text-[#117A69]">
                <Gamepad2 className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold">플레이 가능한 2D 웹 게임 창작</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#70758B]">
                장래희망을 입력하면 AI가 어울리는 게임 아이디어를 제안하거나, 내가 상상한 규칙대로
                키보드·터치로 바로 플레이할 수 있는 2D 게임을 구현합니다.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-[#575C72]">
                <li>• 이동 속도, 제한 시간, 목표 점수를 블록 편집기로 즉시 밸런싱</li>
                <li>• AI 대화로 새로운 장애물·규칙·이펙트를 안전하게 추가</li>
              </ul>
            </div>
            <div className="mt-7">
              <Link to="/app/create/game">
                <Button variant="mint" className="w-full sm:w-auto">
                  게임 만들기 시작
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Flow */}
      <section className="border-y border-[#E6E8F0] bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              3단계로 완성하는 AI 창작 워크플로우
            </h2>
            <p className="mt-2 text-sm text-[#70758B]">
              학생은 아이디어와 방향을 결정하고, AI가 기술적 구현과 오류 검증을 담당합니다.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Wand2,
                title: "한국어로 아이디어 설명",
                desc: "장래희망, 주제, 원하는 분위기를 간단한 질문에 답하듯 입력합니다."
              },
              {
                step: "02",
                icon: ShieldCheck,
                title: "AI 생성 + 자동 검증·복구",
                desc: "AI가 코드와 편집 명세를 생성하고 문법·보안 검증을 통과한 안전한 결과만 실행합니다."
              },
              {
                step: "03",
                icon: MessageSquareText,
                title: "블록 편집 & AI 대화 수정",
                desc: "단순 수정은 블록 패널에서 바로 바꾸고, 구조·규칙 변경은 Diff를 확인하고 승인합니다."
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl border border-[#E6E8F0] bg-[#F7F8FC] p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6858F5] shadow-xs">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs font-bold text-[#70758B]">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-[#17182B]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#70758B]">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-[#6858F5] to-[#5544E4] px-8 py-12 text-center text-white shadow-lg shadow-[#6858F5]/20">
          <h2 className="text-2xl font-bold sm:text-3xl">
            지금 바로 나만의 꿈을 작품으로 만들어 보세요
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/85 sm:text-base">
            간단한 무료 계정만 만들면 내 작품이 클라우드에 자동 저장되어 어느 기기에서든 이어서 만들고 공유할 수 있습니다.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link to="/app/create">
              <Button variant="secondary" size="lg">
                스튜디오 시작하기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E6E8F0] bg-white py-8 text-xs text-[#70758B]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <p>© 2026 Dream Studio 2.0 — AI-Native No-Code Creative Platform</p>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-[#17182B]">
              소개
            </Link>
            <Link to="/guide" className="hover:text-[#17182B]">
              사용 가이드
            </Link>
            <Link to="/help" className="hover:text-[#17182B]">
              도움말
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
