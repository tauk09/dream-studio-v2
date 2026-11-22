# Dream Studio 2.0 — Information Architecture (IA)

## 1. 사이트맵 및 라우트 구조
```text
/                           # 퍼블릭 랜딩 페이지
├── /about                  # 서비스 철학 및 아키텍처 소개
├── /guide                  # 학생용 4단계 사용 가이드
├── /explore                # 게시된 작품 갤러리 (로컬 IndexedDB 스냅샷)
├── /help                   # 자주 묻는 질문 (API 키 설정, 보안, 저장)
├── /login                  # 로그인 안내 (Phase F 클라우드 동기화 예정, 게스트 바로 시작)
│
├── /app                    # 크리에이티브 스튜디오 대시보드
│   ├── /app/create         # 작품 종류 선택 허브 (웹사이트 vs 게임)
│   │   ├── /app/create/website   # 웹사이트 3질문 생성 마법사
│   │   └── /app/create/game      # 게임 생성 마법사 (Mode A 추천 / Mode B 직접 설명)
│   ├── /app/generating/:jobId    # 실시간 생성 진행 상태 + 완료 프리뷰
│   ├── /app/projects             # 내 프로젝트 전체 목록 (검색·필터·관리)
│   └── /app/projects/:id/edit    # 3패널 통합 스튜디오 에디터
│
├── /account                # 게스트 계정 및 데이터 안내
├── /p/:slug                # 게시된 웹사이트 독립 뷰어
└── /g/:slug                # 게시된 게임 독립 뷰어
```

## 2. 네비게이션 계층
- **퍼블릭 영역 (`PublicHeader`)**: 로고, 소개, 사용 가이드, 작품 갤러리, 도움말, 로그인, 내 스튜디오 CTA.
- **스튜디오 영역 (`WorkspaceLayout`)**: 248px 고정 사이드바(대시보드, 새 작품 만들기, 내 프로젝트 / 둘러보기 및 지원) + 모바일 상단 콤팩트 내비게이션.
- **에디터 영역 (`ProjectEditorPage`)**: 집중 편집을 위해 사이드바를 숨기고 상단 툴바 + 좌/중/우 3패널 전체 화면(`h-screen`)으로 전환.
