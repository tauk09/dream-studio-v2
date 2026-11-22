# Dream Studio 2.0 — AI Generation Architecture

## 1. 멀티 프로바이더 계층 (`apps/api/src/providers/LLMProvider.ts`)
- 환경 변수(`apps/api/.env`)를 읽어 실제 외부 LLM 프로바이더를 자동 선택합니다.
  - `GEMINI_API_KEY` → `GeminiProvider` (`gemini-2.5-flash` 기본)
  - `OPENAI_API_KEY` → `OpenAIProvider` (`gpt-4o-mini` 기본)
  - `ANTHROPIC_API_KEY` → `AnthropicProvider` (`claude-3-5-sonnet-latest` 기본)
- **정직한 미설정 가드**: 키가 하나도 없으면 `resolveLLMProvider()`는 `null`을 반환하며, 기본 생성·추천·수정 API는 모두 `HTTP 503 AI_NOT_CONFIGURED`를 반환합니다.

## 2. 생성 오케스트레이션 파이프라인 (`StudioOrchestrator.ts`)
1. `analyzing_intent`: 사용자 프롬프트와 작품 유형 분석
2. `planning_concept`: `ProjectBlueprint` 및 게임의 경우 `GameDefinition` 기획
3. `generating_code`: 실행 파일(`index.html`, `styles.css`, `app.js`) + `ComponentGraph` 생성
4. `validating_build`: `CodeValidator`로 TypeScript/JS 문법 + 경로 탈출 + 보안 금지 API + 용량 제한 검증
5. `repairing_code`: 검증 실패 시 최대 2회 Repair Agent 자동 복구 시도
6. `completed` / `failed` / `cancelled`: 최종 `DreamProject` 및 `previewHtml` 저장

## 3. 개발 테스트 모드 (`DevFixtureProvider.ts`)의 엄격한 분리
- API 요청에 `testFixtureMode: true`가 명시된 경우에만 로컬 테스트 픽스처를 사용합니다.
- 생성된 프로젝트에는 `generatorSource: "dev_fixture"`가 기록되며, UI 전반에 `개발 테스트 Fixture` 배지가 표시되어 실제 AI 결과와 절대 혼동되지 않습니다.
