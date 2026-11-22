# Dream Studio 2.0 — Product Requirements Document (PRD)

## 1. 핵심 기능 요구사항 (1차 마일스톤)
| 영역 | 요구사항 | 구현 상태 |
| :--- | :--- | :--- |
| 브랜드 & 랜딩 (`/`) | 신규 브랜드 아이덴티티, 히어로 인터랙티브 예시, 웹사이트/게임 소개, 3단계 플로우 | 구현 및 브라우저 검증 완료 |
| 스튜디오 대시보드 (`/app`) | 최근 프로젝트 목록, 검색·종류 필터, 복제·삭제 확인 모달, 빈 상태 안내 | 구현 및 브라우저 검증 완료 |
| 웹사이트 생성 마법사 (`/app/create/website`) | 3단계 질문(주제·분위기 6종·추가 요청), AI 상태 배너, 503 가드, 개발 테스트 모드(Fixture) 분리 | 구현 및 브라우저 검증 완료 |
| 게임 생성 마법사 (`/app/create/game`) | Mode A(장래희망 기반 AI 게임 추천) + Mode B(직접 설명), 스타일·난이도 선택 | 구현 및 브라우저 검증 완료 |
| 생성 진행 및 완료 프리뷰 (`/app/generating/:jobId`) | 백엔드 실제 단계 폴링, 생성 취소, 자동 IndexedDB 저장, 완료 즉시 샌드박스 실행 프리뷰 | 구현 및 브라우저 검증 완료 |
| 3패널 스튜디오 에디터 (`/app/projects/:id/edit`) | 좌측(구조·버전·코드), 중앙(PC/태블릿/모바일 격리 샌드박스), 우측(블록 속성·AI Diff 수정), Undo/Redo | 구현 및 브라우저 검증 완료 |
| 로컬 영속성 & 게시 (`/p/:slug`, `/g/:slug`) | Dexie IndexedDB 자동 저장, 새로고침 복원, 불변 스냅샷 게시 및 독립 뷰어 | 구현 및 브라우저 검증 완료 |
| 계정/클라우드 동기화 (`/login`, `/account`) | 학교 계정 로그인, 서버 DB 영구 저장, 타 기기 공유 URL | Phase F 로드맵 예정 (안내 페이지 구현) |

## 2. 비기능 요구사항
- **보안**: 생성 코드 내 `eval`, `new Function`, `fetch`, `XMLHttpRequest`, `WebSocket`, `document.cookie`, `window.top`, `localStorage`, 외부 `<script>` 정적 차단 + `sandbox="allow-scripts"` 격리 실행.
- **성능**: 블록 속성 편집 시 `postMessage`로 100ms 이내 실시간 반영.
- **접근성**: 키보드 포커스 링, `prefers-reduced-motion` 존중, 한국어 시맨틱 레이블 및 `role="alert"` 오류 안내.
