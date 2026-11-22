# Dream Studio 2.0 — User Flows

## 1. 핵심 학생 창작 흐름 (웹사이트)
```mermaid
flowchart LR
  A["/ 랜딩"] --> B["/app/create 종류 선택"]
  B --> C["/app/create/website 3질문 입력"]
  C --> D{"AI 키 설정 여부"}
  D -- "미설정(기본)" --> E["HTTP 503 정직한 오류 안내"]
  D -- "설정됨 / Fixture 모드" --> F["/app/generating/:jobId 단계 폴링"]
  F --> G["완료 프리뷰 + IndexedDB 자동 저장"]
  G --> H["/app/projects/:id/edit 3패널 에디터"]
  H --> I["블록 속성 즉시 수정 / AI Diff 승인"]
  I --> J["게시하기 → /p/:slug 독립 뷰어"]
```

## 2. 핵심 학생 창작 흐름 (게임)
```mermaid
flowchart LR
  A["/app/create/game"] --> B{"모드 선택"}
  B -- "Mode A" --> C["장래희망 입력 → AI 게임 추천 선택"]
  B -- "Mode B" --> D["게임 규칙·조작 직접 설명"]
  C --> E["/app/generating/:jobId"]
  D --> E
  E --> F["완료 프리뷰에서 즉시 플레이 테스트"]
  F --> G["에디터에서 속도·시간 블록 밸런싱 / AI 규칙 확장"]
  G --> H["게시하기 → /g/:slug 독립 플레이 페이지"]
```

## 3. 버전 관리 및 안전 복구 흐름
- 블록 속성 변경 또는 AI Diff 승인 시 자동으로 새 `revision` 스냅샷이 `project.versions`에 기록됩니다.
- 좌측 `버전` 탭에서 과거 버전을 선택해 **이 버전으로 복원**하면 `title`, `source.files`, `componentGraph`가 일괄 동기화되며 새 리비전으로 저장됩니다.
