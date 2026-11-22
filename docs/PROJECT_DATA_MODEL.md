# Dream Studio 2.0 — Project Data Model (`@dream-studio-v2/core`)

## 1. 스키마 버전 및 무결성
- **Schema Version**: `"2.0.0"` (`SCHEMA_VERSION_V2`)
- **결정적 해시**: `computeDreamProjectHash(files, componentGraph)` — Canonical JSON 기반 동기 SHA-256 16자 해시(`contentHash`).

## 2. 핵심 엔티티 (`packages/core/src/models.ts`)
- **`DreamProject`**:
  - 식별 및 메타: `id`, `ownerId`, `title`, `kind` (`"website" | "game"`), `careerGoal`, `creationPrompt`, `designIntent`
  - 버전 및 상태: `revision`, `contentHash`, `schemaVersion`, `publishState` (`"draft" | "published" | "unpublished"`), `publishedSlug`
  - 생성 출처 투명성: `generatorSource` (`"live_ai" | "dev_fixture"`), `providerInfo` (`provider`, `model`, `repairAttempts`)
  - 기획·코드·편집 명세: `blueprint` (`ProjectBlueprint`), `source` (`GeneratedSource`), `componentGraph` (`ComponentGraph`), `gameDefinition?` (`GameDefinition`)
  - 이력: `versions` (`ProjectVersion[]`, 최대 30개 보존)
- **`ComponentNode`**: `id`, `name`, `labelKo`, `kind`, `parentId`, `childrenIds`, `sourceFile`, `editableVia` (`"block" | "ai_only"`), `editableProperties` (`EditableProperty[]`)
- **`GenerationJob`**: `jobId`, `status`, `progressStage`, `stageLabelKo`, `kind`, `provider`, `retryCount`, `error`, `project?`, `previewHtml?`
- **`PendingCodeChange`**: `requestId`, `baseRevision`, `summaryKo`, `diffItems`, `changedFiles`, `requiresGameRestart`, `generatorSource`, `candidateProject`, `previewHtml`

## 3. 클라이언트 저장소 (`apps/web/src/db/projectDb.ts`)
- **Dexie IndexedDB (`DreamStudioV2DB`)**:
  - `projects` 테이블: `DreamProject` 전체 객체 저장
  - `published` 테이블: `/p/:slug`, `/g/:slug` 독립 실행을 위한 불변 `PublishedSnapshot` 저장
