import { describe, expect, it } from "vitest";
import {
  DreamProjectSchema,
  SCHEMA_VERSION_V2,
  applyComponentPropertyUpdate,
  computeDreamProjectHash,
  restoreDreamProjectVersion,
  type DreamProject
} from "../index.js";

function makeSampleProject(): DreamProject {
  const files = {
    "index.html": "<!doctype html><html><body><h1 id='t'>Hello</h1></body></html>",
    "styles.css": "body{margin:0}",
    "app.js": "console.log('ok')"
  };
  const graph: DreamProject["componentGraph"] = {
    nodes: [
      {
        id: "node_hero",
        name: "HeroSection",
        labelKo: "첫 화면 제목",
        kind: "section",
        parentId: null,
        childrenIds: [],
        sourceFile: "index.html",
        editableVia: "block",
        editableProperties: [
          { key: "siteTitle", labelKo: "웹사이트 제목", type: "text", value: "컴퓨터 교사의 코딩 교실" },
          { key: "speed", labelKo: "애니메이션 속도", type: "number", value: 5, min: 1, max: 10, step: 1 }
        ]
      }
    ]
  };
  const now = "2026-11-22T16:50:00+09:00";
  return {
    id: "proj_v2_sample",
    ownerId: null,
    title: "컴퓨터 교사의 코딩 교실",
    kind: "website",
    careerGoal: "컴퓨터 교사",
    creationPrompt: "컴퓨터 교사가 되고 싶어요",
    designIntent: "깔끔하고 모던하게",
    revision: 1,
    contentHash: computeDreamProjectHash(files, graph),
    schemaVersion: SCHEMA_VERSION_V2,
    publishState: "draft",
    publishedSlug: null,
    generatorSource: "live_ai",
    providerInfo: { provider: "gemini", model: "gemini-2.5-flash", repairAttempts: 0 },
    blueprint: {
      creativeGoal: "컴퓨터 원리를 쉽게 체험하는 교육 사이트",
      targetAudience: "학생과 학부모",
      pagesOrScenes: ["메인"],
      requiredFeatures: ["2진수 체험 교구"],
      interactionPlan: "클릭 인터랙션",
      visualDirection: "모던 라이트",
      acceptanceCriteria: ["오류 없이 실행"]
    },
    source: {
      files,
      entrypoints: ["index.html"],
      dependencyManifest: [],
      assetReferences: [],
      validationResult: { ok: true, syntaxPassed: true, securityPassed: true, checkedFiles: ["index.html", "app.js"], errors: [], warnings: [] }
    },
    componentGraph: graph,
    versions: [
      { revision: 1, sourceSnapshot: structuredClone(files), graphSnapshot: structuredClone(graph), changeDescription: "최초 생성", createdAt: now, validationStatus: "valid" }
    ],
    createdAt: now,
    updatedAt: now
  };
}

describe("@dream-studio-v2/core", () => {
  it("validates DreamProject v2 schema, updates component property with bounds, and restores v1 cleanly", () => {
    const proj = makeSampleProject();
    expect(DreamProjectSchema.safeParse(proj).success).toBe(true);

    const v2 = applyComponentPropertyUpdate(proj, "node_hero", "siteTitle", "즐거운 코딩 스튜디오");
    expect(v2.revision).toBe(2);
    expect(v2.title).toBe("즐거운 코딩 스튜디오");
    expect(v2.versions).toHaveLength(2);

    // Out-of-bounds number is safely clamped to max (10)
    const v3 = applyComponentPropertyUpdate(v2, "node_hero", "speed", 999);
    expect(v3.componentGraph.nodes[0]!.editableProperties[1]!.value).toBe(10);

    // Restore v1 restores title & manifest cleanly
    const restored = restoreDreamProjectVersion(v3, 1);
    expect(restored).not.toBeNull();
    expect(restored!.title).toBe("컴퓨터 교사의 코딩 교실");
    expect(restored!.revision).toBe(4);
  });
});
