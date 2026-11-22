import { useEffect, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import {
  Cloud,
  Compass,
  FolderKanban,
  HelpCircle,
  Home,
  PlusCircle,
  Shield,
  Sparkles,
  User
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { useAuthStore } from "../../store/authStore";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

const mainNav = [
  { to: "/app", label: "대시보드", icon: Home, end: true },
  { to: "/app/create", label: "새 작품 만들기", icon: PlusCircle, end: false },
  { to: "/app/projects", label: "내 프로젝트", icon: FolderKanban, end: false }
];

const secondaryNav = [
  { to: "/explore", label: "작품 갤러리", icon: Compass },
  { to: "/guide", label: "사용 가이드", icon: Sparkles },
  { to: "/help", label: "도움말", icon: HelpCircle },
  { to: "/account", label: "내 계정", icon: User }
];

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { user, initialized, refreshAuth } = useAuthStore();

  useEffect(() => {
    if (!initialized) void refreshAuth();
  }, [initialized, refreshAuth]);

  return (
    <div className="flex min-h-screen bg-[#F7F8FC]">
      {/* Desktop Sidebar (248px) */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[#E6E8F0] bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-[#E6E8F0] px-5">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 space-y-6 p-4" aria-label="스튜디오 메뉴">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#70758B]">
              크리에이티브 스튜디오
            </p>
            {mainNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#EEF0FF] text-[#5544E4]"
                        : "text-[#70758B] hover:bg-[#F7F8FC] hover:text-[#17182B]"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#70758B]">
              둘러보기 및 지원
            </p>
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#EEF0FF] text-[#5544E4]"
                        : "text-[#70758B] hover:bg-[#F7F8FC] hover:text-[#17182B]"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            {user?.role === "admin" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[#6858F5] text-white"
                      : "text-[#5544E4] hover:bg-[#EEF0FF]"
                  }`
                }
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span>관리자 대시보드</span>
              </NavLink>
            )}
          </div>
        </nav>

        <div className="border-t border-[#E6E8F0] p-4">
          {user ? (
            <Link
              to="/account"
              className="block rounded-xl border border-[#BCEAD8] bg-[#E8F8F2] p-3 text-xs text-[#14795C] hover:bg-[#DDF4EB]"
            >
              <p className="flex items-center gap-1.5 font-bold">
                <Cloud className="h-3.5 w-3.5 text-[#1EA882]" />
                {user.displayName} (클라우드)
              </p>
              <p className="mt-1 truncate text-[11px] opacity-85">{user.email}</p>
            </Link>
          ) : (
            <Link
              to="/login"
              className="block rounded-xl bg-[#F7F8FC] p-3 text-xs text-[#70758B] hover:bg-[#EEF0FF] hover:text-[#5544E4]"
            >
              <p className="font-semibold text-[#17182B]">게스트 모드 · 로그인하기 →</p>
              <p className="mt-1 leading-relaxed">
                로그인하면 다른 기기에서도 작품을 동기화할 수 있어요.
              </p>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-[#E6E8F0] bg-white px-4 lg:hidden">
          <Link to="/">
            <Logo compact />
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  isActive ? "bg-[#EEF0FF] text-[#5544E4]" : "text-[#70758B]"
                }`
              }
            >
              홈
            </NavLink>
            <NavLink
              to="/app/create"
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  isActive ? "bg-[#EEF0FF] text-[#5544E4]" : "text-[#70758B]"
                }`
              }
            >
              만들기
            </NavLink>
            <NavLink
              to="/app/projects"
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  isActive ? "bg-[#EEF0FF] text-[#5544E4]" : "text-[#70758B]"
                }`
              }
            >
              프로젝트
            </NavLink>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
