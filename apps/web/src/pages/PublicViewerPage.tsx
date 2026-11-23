import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { getPublishedBySlug, type PublishedSnapshot } from "../db/projectDb";

export function PublicViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void getPublishedBySlug(slug).then((data) => {
      setSnapshot(data ?? null);
      if (data?.title) {
        document.title = data.title;
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-sm text-[#70758B]">
        불러오는 중...
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F7F8FC] p-6 text-center">
        <h1 className="text-lg font-bold text-[#17182B]">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-xs text-[#70758B]">
          게시가 중단되었거나 존재하지 않는 주소입니다.
        </p>
      </div>
    );
  }

  return (
    <iframe
      title={snapshot.title}
      srcDoc={snapshot.previewHtml}
      sandbox="allow-scripts allow-forms allow-modals"
      className="block h-screen w-screen border-0 bg-white"
    />
  );
}
