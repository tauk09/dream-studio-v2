import { useEffect } from "react";
import { Link, NavLink } from "react-router";
import { ArrowRight, User } from "lucide-react";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";
import { useAuthStore } from "../../store/authStore";

const navItems = [
  { to: "/about", label: "소개" },
  { to: "/guide", label: "사용 가이드" },
  { to: "/explore", label: "작품 갤러리" },
  { to: "/help", label: "도움말" }
];

export function PublicHeader() {
  const { user, initialized, refreshAuth } = useAuthStore();

  useEffect(() => {
    if (!initialized) void refreshAuth();
  }, [initialized, refreshAuth]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E6E8F0]/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Dream Studio 홈">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#EEF0FF] text-[#5544E4]"
                    : "text-[#70758B] hover:bg-[#F7F8FC] hover:text-[#17182B]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {user ? (
            <Link to="/account" className="hidden sm:inline-block">
              <Button variant="ghost" size="sm">
                <User className="h-3.5 w-3.5" />
                {user.displayName}
              </Button>
            </Link>
          ) : (
            <Link to="/login" className="hidden sm:inline-block">
              <Button variant="ghost" size="sm">
                로그인
              </Button>
            </Link>
          )}
          <Link to="/app">
            <Button size="sm">
              내 스튜디오
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
