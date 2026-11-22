# Dream Studio 2.0 — Development Roadmap

## 완료된 마일스톤 (Phase A ~ E — 1차 마일스톤)
- **Phase A (기반 구축)**: 모노레포(`core`, `api`, `web`), Tailwind v4 디자인 토큰, TypeScript strict, ESLint, Vitest 구성 완료
- **Phase B (AI 생성 & 보안 파이프라인)**: 멀티 프로바이더(`Gemini/OpenAI/Anthropic`), 503 가드, `CodeValidator`, `Repair Agent`, `PreviewBundler`, `GenerationJobStore`, 격리된 `DevFixtureProvider` 구현 완료
- **Phase C (프론트엔드 핵심 흐름)**: 랜딩, 대시보드, 웹사이트/게임 생성 마법사, 실시간 단계 폴링 & 완료 프리뷰 구현 완료
- **Phase D (3패널 스튜디오 에디터)**: `ComponentGraph` 블록 편집, `AI와 함께 수정` Diff 미리보기 및 승인, Undo/Redo, 버전 복원, 반응형 뷰포트 구현 완료
- **Phase E (로컬 영속성 & 게시)**: Dexie IndexedDB 자동 저장, 새로고침 영속성, 불변 스냅샷 게시(`/p/:slug`, `/g/:slug`) 구현 및 브라우저 E2E 검증 완료

## 향후 로드맵 (Phase F — 미구현, 설계/안내 완료)
- 학교/학생 계정 인증(OAuth/이메일) 및 클라우드 PostgreSQL/S3 프로젝트 동기화
- 타 기기·타 사용자와 공유 가능한 서버 기반 퍼블릭 URL 및 모더레이션 갤러리
- 사용자 이미지/오디오 에셋 업로드 및 안전한 정적 CDN 서빙
- 실제 LLM 프로바이더(Gemini/OpenAI/Anthropic) API 키 연동 후 라이브 생성 품질 E2E 벤치마크
