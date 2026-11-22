import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getPublishedBySlug, type PublishedSnapshot } from "../db/projectDb";
import { SandboxedPreview } from "../components/ui/SandboxedPreview";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";

export function PublicViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void getPublishedBySlug(slug).then((data) => {
      setSnapshot(data ?? null);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] text-sm text-[#70758B]">
        게시된 작품을 불러오는 중...
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F8FC] p-6 text-center">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-[#17182B]">게시된 작품을 찾을 수 없습니다</h1>
        <p className="mt-2 max-w-md text-sm text-[#70758B]">
          게시가 중단되었거나 현재 브라우저에 저장된 스냅샷이 아닙니다.
        </p>
        <Link to="/app" className="mt-6">
          <Button>내 스튜디오로 이동</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FC]">
      <header className="flex h-14 items-center justify-between border-b border-[#E6E8F0] bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Dream Studio 홈">
            <Logo compact />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-[#17182B]">{snapshot.title}</h1>
            <p className="hidden text-[11px] text-[#70758B] sm:block">{snapshot.summary}</p>
          </div>
          <Badge tone={snapshot.kind === "game" ? "mint" : "brand"}>
            {snapshot.kind === "game" ? "게임" : "웹사이트"}
          </Badge>
          {snapshot.isDevFixture && <Badge tone="amber">Fixture</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/create">
            <Button size="sm" variant="secondary">
              <Sparkles className="h-3.5 w-3.5 text-[#6858F5]" />
              나도 만들기
            </Button>
          </Link>
          <Link to="/app">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="h-3.5 w-3.5" />
              스튜디오
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 p-4 sm:p-6">
        <SandboxedPreview
          previewHtml={snapshot.previewHtml}
          title={snapshot.title}
          heightClass="h-[calc(100vh-130px)]"
        />
      </main>
    </div>
  );
}
