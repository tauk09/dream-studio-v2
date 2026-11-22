# Dream Studio 2.0 — Website Editor Specification

## 1. Component Graph 기반 이중 편집 모델
- AI가 웹사이트를 생성할 때 `index.html`, `styles.css`, `app.js`와 함께 편집 명세 `ComponentGraph`를 생성합니다.
- 각 노드는 `editableVia: "block" | "ai_only"` 속성을 가집니다.
  - **`block` 노드**: 우측 `블록 속성 편집` 탭에서 `text`, `textarea`, `color`, `number`, `boolean` 컨트롤로 즉시 수정 가능합니다.
  - **`ai_only` 노드**: 복잡한 인터랙션 로직(예: 4비트 이진수 계산기 회로)은 블록 편집을 강제하지 않고, `AI에게 수정 요청하기` 버튼으로 자연어 수정 탭에 연결합니다.

## 2. 무새로고침 실시간 반영 (`DREAM_MANIFEST_UPDATE`)
- 속성 변경 시 `@dream-studio-v2/core`의 `applyComponentPropertyUpdate()`가 불변 상태를 갱신하고 `flattenComponentGraphConfig()` 결과를 `SandboxedPreview`의 `postMessage`로 전달합니다.
- 프리뷰 내부 런타임이 `window.__DREAM_CONFIG__`와 `onDreamConfigUpdate` 콜백을 호출하여 DOM 텍스트·색상·수치를 즉시 반영합니다.

## 3. 반응형 뷰포트 및 버전 관리
- 상단 툴바에서 PC(`100%`), 태블릿(`768px`), 모바일(`390px`) 폭으로 즉시 전환해 레이아웃을 검증합니다.
- 모든 블록 수정·AI Diff 승인·제목 변경은 Undo/Redo 스택과 Dexie IndexedDB에 자동 저장됩니다.
