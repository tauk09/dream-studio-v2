import { Link } from "react-router";
import { ArrowRight, Gamepad2, Globe, Sparkles } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { Badge } from "../components/ui/Badge";

export function CreateHubPage() {
  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-4xl">
        <Badge tone="brand">
          <Sparkles className="h-3.5 w-3.5" />새 작품 시작하기
        </Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#17182B] sm:text-3xl">
          오늘은 무엇을 만들어 볼까요?
        </h1>
        <p className="mt-2 text-sm text-[#70758B]">
          만들고 싶은 작품 종류를 고르면 AI가 아이디어를 구체화하고 바로 실행 가능한 작품을 만들어 드립니다.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Link
            to="/app/create/website"
            className="group flex flex-col justify-between rounded-3xl border border-[#E6E8F0] bg-white p-8 shadow-xs transition-all hover:border-[#6858F5] hover:shadow-lg"
          >
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6858F5]">
                <Globe className="h-7 w-7" />
              </div>
              <h2 className="mt-6 text-xl font-bold text-[#17182B]">웹사이트 만들기</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#70758B]">
                장래희망 소개, 인터랙티브 학습 실험실, 계산기, 동아리 홍보 페이지 등
                원하는 주제와 분위기의 웹사이트를 AI가 새로 설계합니다.
              </p>
            </div>
            <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#6858F5] group-hover:translate-x-1 transition-transform">
              웹사이트 마법사 시작 <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            to="/app/create/game"
            className="group flex flex-col justify-between rounded-3xl border border-[#E6E8F0] bg-white p-8 shadow-xs transition-all hover:border-[#32CDB5] hover:shadow-lg"
          >
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6FAF6] text-[#117A69]">
                <Gamepad2 className="h-7 w-7" />
              </div>
              <h2 className="mt-6 text-xl font-bold text-[#17182B]">게임 만들기</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#70758B]">
                진로와 관심사로 어울리는 게임 아이디어를 AI에게 추천받거나,
                직접 상상한 규칙으로 플레이 가능한 2D 웹 게임을 생성합니다.
              </p>
            </div>
            <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#117A69] group-hover:translate-x-1 transition-transform">
              게임 마법사 시작 <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
