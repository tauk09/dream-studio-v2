# Dream Studio 2.0 — Design System

## 1. 컬러 토큰 (`apps/web/src/index.css`)
| 토큰 | HEX | 용도 |
| :--- | :--- | :--- |
| `--color-brand` | `#6858F5` | 핵심 CTA, 활성 탭, 브랜드 마크 |
| `--color-brand-hover` | `#5544E4` | 버튼 호버, 강조 텍스트 |
| `--color-brand-soft` | `#EEF0FF` | 활성 배경, 소프트 배지 |
| `--color-ink` | `#17182B` | 본문 제목 및 주 텍스트 |
| `--color-ink-muted` | `#70758B` | 보조 설명, 메타 정보 |
| `--color-canvas` | `#F7F8FC` | 페이지 기본 배경 |
| `--color-surface` | `#FFFFFF` | 카드, 패널, 툴바 표면 |
| `--color-line` | `#E6E8F0` | 1px 경계선 및 구분선 |
| `--color-mint` | `#32CDB5` | 게임 카테고리 강조 및 포인트 |
| `--color-amber` | `#FFB66D` | 경고 및 개발 테스트 Fixture 배지 |
| `--color-danger` | `#E75566` | 삭제, 오류 알림 |
| `--color-success` | `#1EA882` | 보안 검증 완료, 게시 상태 |

## 2. 타이포그래피 & 모션
- **본문 폰트**: `Pretendard Variable`, `Pretendard`, Apple SD Gothic Neo, Noto Sans KR, Inter, system-ui.
- **코드/수치 폰트**: `ui-monospace`, SFMono-Regular, Menlo, Consolas.
- **접근성 모션**: `@media (prefers-reduced-motion: reduce)` 선언으로 애니메이션 및 스크롤 모션 최소화.

## 3. 핵심 UI 컴포넌트
- `Logo`: 스파클 심볼 + 민트 도트 액센트 (`compact` 모드 지원)
- `Button`: `primary | secondary | ghost | danger | mint`, `sm | md | lg`
- `Badge`: `brand | mint | amber | danger | success | neutral`
- `SandboxedPreview`: 격리 보안 바 + 런타임 오류 배너 + `sandbox="allow-scripts"` iframe
- `AIStatusBanner`: `/api/ai/status` 실시간 상태 표시 + opt-in 개발 테스트 Fixture 토글
