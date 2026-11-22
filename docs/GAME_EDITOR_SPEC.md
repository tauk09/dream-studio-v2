# Dream Studio 2.0 — Game Editor Specification

## 1. 게임 생성 및 구조
- 고정된 3종 엔진 템플릿을 강제하지 않고, AI가 주제에 맞는 HTML5 Canvas / DOM 게임 루프와 `GameDefinition`(gameplayLoop, scenes, objects, playerActions, rules, states, winConditions, loseConditions) 및 `ComponentGraph`를 생성합니다.
- 정적 검증기(`CodeValidator`)가 게임 코드에 키보드/포인터 입력 처리(`addEventListener`, `keydown`, `pointerdown` 등)가 포함되어 있는지 점검합니다.

## 2. 게임 밸런스 블록 편집 vs AI 규칙 확장
- **블록 편집 (`editableVia: "block"`)**: 게임 제목, 이동 속도, 제한 시간, 목표 점수, 에너지 소모율 등 수치(`number` 슬라이더 + min/max 클램핑)와 색상·안내 문구를 실시간 조정합니다.
- **AI 대화 수정 (`POST /api/ai/edit`)**: 새로운 장애물 패턴, 콤보 시스템, 난이도 곡선 변경 등 로직 변경은 AI가 수정 코드를 생성하고 Diff를 미리 보여준 뒤 사용자 승인을 거쳐 반영합니다.

## 3. 샌드박스 내 플레이 검증
- 게임은 `sandbox="allow-scripts"` 격리 iframe 내부에서 실행되며, 런타임 예외 발생 시 `DREAM_RUNTIME_ERROR` 메시지로 에디터 상단에 즉시 표시됩니다.
- 브라우저 검증에서 화성 탐사 로버 게임(`760x392` Canvas)이 `탐사 시작` 클릭 후 정상 동작(`탐사 중`, `🔋 99%`)함을 확인했습니다.
