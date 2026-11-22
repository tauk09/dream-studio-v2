import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  ExternalLink,
  FolderKanban,
  Gauge,
  Globe,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Users
} from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { authHeaders, useAuthStore } from "../store/authStore";

interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  createdAt: string;
  projectCount: number;
  aiCallCount: number;
}

interface AdminUsageLog {
  id: string;
  userId: string | null;
  userEmail: string;
  action: "generate_website" | "generate_game" | "recommend_games" | "ai_edit";
  provider: string;
  model: string;
  status: "success" | "failed";
  errorMessage: string | null;
  durationMs: number;
  createdAt: string;
}

interface AdminPublishedRow {
  slug: string;
  projectId: string;
  authorName: string;
  kind: "website" | "game";
  title: string;
  summary: string;
  publishedAt: string;
  isDevFixture: boolean;
}

interface SlotStatusRow {
  id: string;
  provider: string;
  model: string;
  status: "ready" | "cooldown";
  cooldownRemainingSec: number;
}

interface AdminOverviewResponse {
  ok: boolean;
  message?: string;
  aiStatus?: {
    configured: boolean;
    provider: string | null;
    model: string | null;
    activeSlotCount: number;
    providers: string[];
  };
  quotaTelemetry?: {
    dailyLimit: number;
    usedToday: number;
    estimatedRemainingToday: number;
    rpmLastMinute: number;
    maxConcurrent: number;
    slots: SlotStatusRow[];
  };
  overview?: {
    summary: {
      totalUsers: number;
      adminUsers: number;
      totalProjects: number;
      websiteProjects: number;
      gameProjects: number;
      totalPublished: number;
      totalAiCalls: number;
      todayAiCalls: number;
      successRatePercent: number;
    };
    users: AdminUserRow[];
    recentLogs: AdminUsageLog[];
    published: AdminPublishedRow[];
  };
}

const ACTION_LABELS: Record<AdminUsageLog["action"], string> = {
  generate_website: "웹사이트 생성",
  generate_game: "게임 생성",
  recommend_games: "게임 추천",
  ai_edit: "AI 대화 수정"
};

export function AdminPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<"usage" | "users" | "published">("usage");
  const [userSearch, setUserSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Admin password re-verification gate for sensitive Account Management tab
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [verifiedAdminPw, setVerifiedAdminPw] = useState("");
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Password reset modal state
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleUnlockAdminAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await fetch("/api/admin/verify-password", {
        method: "POST",
        credentials: "include",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ password: unlockInput })
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setUnlockError(json.message ?? "관리자 비밀번호가 일치하지 않습니다.");
        return;
      }
      setVerifiedAdminPw(unlockInput);
      setUnlockInput("");
      setAdminUnlocked(true);
    } finally {
      setUnlocking(false);
    }
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview", {
        credentials: "include",
        headers: authHeaders()
      });
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        return;
      }
      const json = (await res.json()) as AdminOverviewResponse;
      setData(json);
      setForbidden(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleToggleRole = async (target: AdminUserRow) => {
    const nextRole = target.role === "admin" ? "user" : "admin";
    setBusyId(target.id);
    try {
      await fetch(`/api/admin/users/${encodeURIComponent(target.id)}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ role: nextRole })
      });
      await loadOverview();
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (newPassword.length < 6) {
      setResetError("새 비밀번호는 6자 이상 입력해 주세요.");
      return;
    }
    setBusyId(resetTarget.id);
    setResetError(null);
    setResetMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(resetTarget.id)}/password`, {
        method: "PATCH",
        credentials: "include",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ adminPassword: verifiedAdminPw, newPassword })
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setResetError(json.message ?? "비밀번호 변경에 실패했습니다.");
        return;
      }
      setResetMsg(
        `'${resetTarget.displayName}' 계정의 비밀번호가 '${newPassword}'로 재설정되었습니다. (기존 세션은 자동 로그아웃됨)`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (target: AdminUserRow) => {
    if (!window.confirm(`'${target.displayName} (${target.email})' 계정과 모든 작품을 삭제할까요?`)) {
      return;
    }
    setBusyId(target.id);
    try {
      await fetch(`/api/admin/users/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders()
      });
      await loadOverview();
    } finally {
      setBusyId(null);
    }
  };

  const handleTakeDownPublished = async (slug: string) => {
    if (!window.confirm(`게시된 작품 '/${slug}'의 공개를 중단할까요?`)) return;
    setBusyId(slug);
    try {
      await fetch(`/api/admin/published/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders()
      });
      await loadOverview();
    } finally {
      setBusyId(null);
    }
  };

  if (forbidden) {
    return (
      <WorkspaceLayout>
        <div className="mx-auto max-w-lg rounded-3xl border border-[#FBC9D0] bg-white p-10 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#E75566]" />
          <h1 className="mt-4 text-xl font-bold text-[#17182B]">관리자 권한이 필요합니다</h1>
          <p className="mt-2 text-sm text-[#70758B]">
            이 페이지는 관리자 계정만 접근할 수 있습니다. (최초 가입 계정 또는 환경변수
            ADMIN_EMAILS에 등록된 계정)
          </p>
          <div className="mt-6">
            <Link to="/app">
              <Button>내 스튜디오로 돌아가기</Button>
            </Link>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  const overview = data?.overview;
  const aiStatus = data?.aiStatus;
  const quota = data?.quotaTelemetry;
  const usedPct = quota
    ? Math.min(100, Math.round((quota.usedToday / Math.max(1, quota.dailyLimit)) * 100))
    : 0;

  const filteredUsers = (overview?.users ?? []).filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
  });

  return (
    <WorkspaceLayout>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="brand">
            <Shield className="h-3.5 w-3.5" />
            ADMIN CONSOLE
          </Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#17182B] sm:text-3xl">
            관리자 대시보드
          </h1>
          <p className="mt-1 text-sm text-[#70758B]">
            실시간 AI 남은 사용량, 가입된 학생 계정, 공개 게시 작품을 한곳에서 관리합니다.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void loadOverview()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#70758B]">
              <span>총 가입 계정</span>
              <Users className="h-4 w-4 text-[#6858F5]" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#17182B]">
              {overview.summary.totalUsers}명
            </p>
            <p className="mt-1 text-[11px] text-[#70758B]">
              관리자 {overview.summary.adminUsers}명 · 학생{" "}
              {overview.summary.totalUsers - overview.summary.adminUsers}명
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#70758B]">
              <span>클라우드 저장 작품</span>
              <FolderKanban className="h-4 w-4 text-[#32CDB5]" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#17182B]">
              {overview.summary.totalProjects}개
            </p>
            <p className="mt-1 text-[11px] text-[#70758B]">
              웹 {overview.summary.websiteProjects} · 게임 {overview.summary.gameProjects} · 게시{" "}
              {overview.summary.totalPublished}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#70758B]">
              <span>오늘 예상 남은 사용량</span>
              <Gauge className="h-4 w-4 text-[#1EA882]" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#17182B]">
              {quota ? `${quota.estimatedRemainingToday}회` : "-"}
            </p>
            <p className="mt-1 text-[11px] text-[#70758B]">
              오늘 {quota?.usedToday ?? 0} / 일일 기준 {quota?.dailyLimit ?? 250}회 ({usedPct}% 사용)
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#70758B]">
              <span>AI 호출 성공률 / RPM</span>
              <Activity className="h-4 w-4 text-[#6858F5]" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#17182B]">
              {overview.summary.successRatePercent}%
            </p>
            <p className="mt-1 text-[11px] text-[#70758B]">
              누적 {overview.summary.totalAiCalls}회 · 최근 1분 {quota?.rpmLastMinute ?? 0}회
            </p>
          </div>
        </div>
      )}

      {/* Real-time Quota & Fallback Slot Monitor */}
      {quota && (
        <section className="mt-5 rounded-2xl border border-[#E6E8F0] bg-white p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#17182B]">
                <Globe className="h-4 w-4 text-[#6858F5]" />
                실시간 AI 사용량 한도 &amp; 자동 폴백 슬롯 ({aiStatus?.activeSlotCount ?? 0}개)
              </h2>
              <p className="mt-0.5 text-[11px] text-[#70758B]">
                일일 기준 한도는 `.env`의 `AI_DAILY_QUOTA_LIMIT`으로 조정할 수 있으며, 공급자 공식
                청구·잔여 한도는 외부 콘솔에서 최종 확인할 수 있습니다.
              </p>
            </div>
            <a
              href="https://aistudio.google.com/usage"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3 py-1.5 text-xs font-semibold text-[#5544E4] hover:bg-[#EEF0FF]"
            >
              Google AI Studio 공식 사용량 보기
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Daily Quota Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[#17182B]">
                오늘 사용: {quota.usedToday}회 · 예상 남음: {quota.estimatedRemainingToday}회
              </span>
              <span className="font-mono text-[#6858F5]">{usedPct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#EEF0FF]">
              <div
                className={`h-full rounded-full transition-all ${
                  usedPct >= 85 ? "bg-[#E75566]" : usedPct >= 60 ? "bg-[#FFB66D]" : "bg-[#1EA882]"
                }`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>

          {/* Per-slot Live Health */}
          <div className="mt-4 flex flex-wrap gap-2">
            {quota.slots.map((slot) => (
              <div
                key={slot.id}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3 py-1.5 text-[11px]"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    slot.status === "ready" ? "bg-[#1EA882]" : "bg-[#FFB66D]"
                  }`}
                />
                <span className="font-mono font-semibold text-[#17182B]">
                  {slot.provider}/{slot.model}
                </span>
                <span className="text-[#70758B]">
                  {slot.status === "ready" ? "대기 정상" : `쿨다운 ${slot.cooldownRemainingSec}초`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-[#E6E8F0] pb-3">
        {(
          [
            { id: "usage", label: `AI 사용량 로그 (${overview?.recentLogs.length ?? 0})` },
            { id: "users", label: `계정 관리 (${overview?.users.length ?? 0})` },
            { id: "published", label: `게시 작품 (${overview?.published.length ?? 0})` }
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              tab === item.id
                ? "bg-[#6858F5] text-white"
                : "bg-white text-[#70758B] hover:bg-[#EEF0FF] hover:text-[#5544E4]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-5">
        {tab === "usage" && (
          <div className="overflow-x-auto rounded-2xl border border-[#E6E8F0] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E6E8F0] bg-[#F7F8FC] text-[#70758B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">시각</th>
                  <th className="px-4 py-3 font-semibold">사용자</th>
                  <th className="px-4 py-3 font-semibold">작업</th>
                  <th className="px-4 py-3 font-semibold">모델 / 프로바이더</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="px-4 py-3 font-semibold">응답 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {(overview?.recentLogs ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#70758B]">
                      아직 기록된 AI 사용량 로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  overview!.recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F7F8FC]/60">
                      <td className="whitespace-nowrap px-4 py-3 text-[#70758B]">
                        {new Date(log.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#17182B]">{log.userEmail}</td>
                      <td className="px-4 py-3">
                        <Badge tone="brand">{ACTION_LABELS[log.action]}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#575C72]">
                        {log.provider} / {log.model}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={log.status === "success" ? "success" : "danger"}>
                          {log.status === "success" ? "성공" : "실패"}
                        </Badge>
                        {log.errorMessage && (
                          <p className="mt-1 max-w-xs truncate text-[10px] text-[#B82839]">
                            {log.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[#70758B]">
                        {log.durationMs > 0 ? `${(log.durationMs / 1000).toFixed(1)}s` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "users" && !adminUnlocked && (
          <div className="mx-auto max-w-md rounded-3xl border border-[#E6E8F0] bg-white p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6858F5]">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#17182B]">관리자 비밀번호 재확인</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#70758B]">
              계정 목록 조회 및 비밀번호 재설정·권한 변경을 열람하려면 관리자 계정의 비밀번호를 한
              번 더 입력해 주세요.
            </p>
            <form
              onSubmit={(e) => void handleUnlockAdminAccounts(e)}
              className="mt-5 space-y-3 text-left"
            >
              <input
                type="password"
                required
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value)}
                placeholder="관리자 비밀번호 입력"
                className="h-10 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3.5 text-sm focus:border-[#6858F5] focus:bg-white focus:outline-none"
              />
              {unlockError && (
                <p className="rounded-xl bg-[#FEECEF] px-3 py-2 text-xs font-medium text-[#B82839]">
                  {unlockError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={unlocking}>
                {unlocking ? "확인 중..." : "계정 관리 잠금 해제"}
              </Button>
            </form>
          </div>
        )}

        {tab === "users" && adminUnlocked && (
          <div className="space-y-3">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="relative max-w-xs flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70758B]" />
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="닉네임 또는 이메일 검색..."
                  className="h-9 w-full rounded-xl border border-[#E6E8F0] bg-white pl-9 pr-3 text-xs focus:border-[#6858F5] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <p className="inline-flex items-center gap-1.5 text-[11px] text-[#70758B]">
                  <Lock className="h-3.5 w-3.5 text-[#1EA882]" />
                  학생 비밀번호는 단방향 암호화(scrypt) 보호 · 분실 시 재설정 지원
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAdminUnlocked(false);
                    setVerifiedAdminPw("");
                  }}
                >
                  다시 잠그기
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E6E8F0] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E6E8F0] bg-[#F7F8FC] text-[#70758B]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">닉네임</th>
                    <th className="px-4 py-3 font-semibold">이메일</th>
                    <th className="px-4 py-3 font-semibold">비밀번호 상태</th>
                    <th className="px-4 py-3 font-semibold">권한</th>
                    <th className="px-4 py-3 font-semibold">작품</th>
                    <th className="px-4 py-3 font-semibold">AI 호출</th>
                    <th className="px-4 py-3 text-right font-semibold">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F1F6]">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} className="hover:bg-[#F7F8FC]/60">
                        <td className="px-4 py-3 font-bold text-[#17182B]">
                          {u.displayName}{" "}
                          {isSelf && <span className="text-[10px] text-[#6858F5]">(나)</span>}
                        </td>
                        <td className="px-4 py-3 text-[#575C72]">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#70758B]">
                            <Lock className="h-3 w-3 text-[#1EA882]" />
                            암호화됨 (scrypt)
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={u.role === "admin" ? "brand" : "neutral"}>
                            {u.role === "admin" ? "관리자" : "학생"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono">{u.projectCount}개</td>
                        <td className="px-4 py-3 font-mono">{u.aiCallCount}회</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setResetTarget(u);
                                setNewPassword("");
                                setResetMsg(null);
                                setResetError(null);
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              비밀번호 재설정
                            </Button>
                            {!isSelf && (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={busyId === u.id}
                                  onClick={() => void handleToggleRole(u)}
                                >
                                  {u.role === "admin" ? "학생으로" : "관리자 지정"}
                                </Button>
                                <button
                                  type="button"
                                  disabled={busyId === u.id}
                                  onClick={() => void handleDeleteUser(u)}
                                  className="rounded-lg p-2 text-[#70758B] hover:bg-[#FEECEF] hover:text-[#E75566]"
                                  title="계정 삭제"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "published" && (
          <div className="overflow-x-auto rounded-2xl border border-[#E6E8F0] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E6E8F0] bg-[#F7F8FC] text-[#70758B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">작품명</th>
                  <th className="px-4 py-3 font-semibold">종류</th>
                  <th className="px-4 py-3 font-semibold">작성자</th>
                  <th className="px-4 py-3 font-semibold">게시일</th>
                  <th className="px-4 py-3 text-right font-semibold">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {(overview?.published ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#70758B]">
                      게시된 작품이 없습니다.
                    </td>
                  </tr>
                ) : (
                  overview!.published.map((item) => (
                    <tr key={item.slug} className="hover:bg-[#F7F8FC]/60">
                      <td className="px-4 py-3 font-bold text-[#17182B]">{item.title}</td>
                      <td className="px-4 py-3">
                        <Badge tone={item.kind === "game" ? "mint" : "brand"}>
                          {item.kind === "game" ? "게임" : "웹사이트"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[#575C72]">{item.authorName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#70758B]">
                        {new Date(item.publishedAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/${item.kind === "game" ? "g" : "p"}/${item.slug}`}
                            className="inline-flex items-center gap-1 font-semibold text-[#6858F5] hover:underline"
                          >
                            열기 <ExternalLink className="h-3 w-3" />
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={busyId === item.slug}
                            onClick={() => void handleTakeDownPublished(item.slug)}
                          >
                            게시 중단
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17182B]/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#17182B]">비밀번호 재설정</h3>
            <p className="mt-1 text-xs text-[#70758B]">
              <strong className="text-[#17182B]">
                {resetTarget.displayName} ({resetTarget.email})
              </strong>{" "}
              계정의 새 비밀번호를 설정합니다.
            </p>

            <form onSubmit={(e) => void handleResetPasswordSubmit(e)} className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#17182B]">
                    새 비밀번호 (6자 이상)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPassword(`dream-${Math.random().toString(36).slice(2, 8)}`)
                    }
                    className="text-[11px] font-semibold text-[#6858F5] hover:underline"
                  >
                    임시 비밀번호 자동 생성
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="예: dream-7k2x9p"
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#E6E8F0] bg-[#F7F8FC] px-3 font-mono text-sm focus:border-[#6858F5] focus:bg-white focus:outline-none"
                />
              </div>

              {resetError && (
                <p className="rounded-xl bg-[#FEECEF] px-3 py-2 text-xs font-medium text-[#B82839]">
                  {resetError}
                </p>
              )}
              {resetMsg && (
                <p className="rounded-xl bg-[#E8F8F2] px-3 py-2 text-xs font-semibold text-[#14795C]">
                  {resetMsg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setResetTarget(null)}
                >
                  닫기
                </Button>
                <Button type="submit" size="sm" disabled={busyId === resetTarget.id}>
                  새 비밀번호 적용
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
