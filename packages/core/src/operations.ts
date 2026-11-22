import { getBlockPresetsForKind } from "./blockLibrary.js";
import { sha256Short } from "./hash.js";
import type { ComponentGraph, DreamProject } from "./models.js";

export function computeDreamProjectHash(
  files: Record<string, string>,
  graph: ComponentGraph
): string {
  return sha256Short({ files, graph });
}

export function flattenComponentGraphConfig(
  graph: ComponentGraph
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const node of graph.nodes) {
    if (node.hidden) continue;
    for (const prop of node.editableProperties) {
      out[prop.key] = prop.value;
    }
  }
  return out;
}

function finalizeMutation(project: DreamProject, changeDescription: string): DreamProject {
  project.source.files["manifest.json"] = JSON.stringify(project.componentGraph, null, 2);
  project.revision += 1;
  project.updatedAt = new Date().toISOString();
  project.contentHash = computeDreamProjectHash(project.source.files, project.componentGraph);
  project.versions = [
    ...project.versions.slice(-29),
    {
      revision: project.revision,
      sourceSnapshot: structuredClone(project.source.files),
      graphSnapshot: structuredClone(project.componentGraph),
      changeDescription,
      createdAt: project.updatedAt,
      validationStatus: "valid"
    }
  ];
  return project;
}

function cloneProjectForEdit(project: DreamProject): DreamProject {
  const cloned = structuredClone(project);
  cloned.componentGraph = structuredClone(cloned.componentGraph);
  cloned.source.files = structuredClone(cloned.source.files);
  return cloned;
}

export function applyComponentPropertyUpdate(
  project: DreamProject,
  nodeId: string,
  propKey: string,
  nextValue: string | number | boolean
): DreamProject {
  const cloned = cloneProjectForEdit(project);
  const node = cloned.componentGraph.nodes.find((n) => n.id === nodeId);
  if (!node || node.editableVia !== "block") return project;

  const prop = node.editableProperties.find((p) => p.key === propKey);
  if (!prop) return project;

  if (prop.type === "number") {
    const num = Number(nextValue);
    if (!Number.isFinite(num)) return project;
    prop.value = Math.min(
      prop.max ?? Number.MAX_SAFE_INTEGER,
      Math.max(prop.min ?? Number.MIN_SAFE_INTEGER, num)
    );
  } else if (prop.type === "boolean") {
    prop.value = Boolean(nextValue);
  } else {
    prop.value = String(nextValue);
  }

  if (propKey === "siteTitle" || propKey === "gameTitle") {
    cloned.title = String(prop.value).trim() || cloned.title;
  }

  return finalizeMutation(cloned, `블록 수정: ${prop.labelKo}`);
}

export function addComponentBlock(
  project: DreamProject,
  presetId: string
): { project: DreamProject; addedNodeId: string } | null {
  const preset = getBlockPresetsForKind(project.kind).find((p) => p.presetId === presetId);
  if (!preset) return null;
  const cloned = cloneProjectForEdit(project);
  const suffix = Math.random().toString(36).slice(2, 6);
  const newNode = preset.createNode(suffix);
  cloned.componentGraph.nodes.push(newNode);
  return {
    project: finalizeMutation(cloned, `블록 추가: ${newNode.labelKo}`),
    addedNodeId: newNode.id
  };
}

export function removeComponentBlock(project: DreamProject, nodeId: string): DreamProject {
  const idx = project.componentGraph.nodes.findIndex((n) => n.id === nodeId);
  if (idx < 0 || project.componentGraph.nodes.length <= 1) return project;
  const cloned = cloneProjectForEdit(project);
  const [removed] = cloned.componentGraph.nodes.splice(idx, 1);
  return finalizeMutation(cloned, `블록 삭제: ${removed?.labelKo ?? nodeId}`);
}

export function moveComponentBlock(
  project: DreamProject,
  nodeId: string,
  direction: "up" | "down"
): DreamProject {
  const idx = project.componentGraph.nodes.findIndex((n) => n.id === nodeId);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || targetIdx < 0 || targetIdx >= project.componentGraph.nodes.length) return project;
  const cloned = cloneProjectForEdit(project);
  const nodes = cloned.componentGraph.nodes;
  const [item] = nodes.splice(idx, 1);
  nodes.splice(targetIdx, 0, item!);
  return finalizeMutation(cloned, `블록 순서 변경: ${item!.labelKo}`);
}

export function duplicateComponentBlock(
  project: DreamProject,
  nodeId: string
): { project: DreamProject; addedNodeId: string } | null {
  const original = project.componentGraph.nodes.find((n) => n.id === nodeId);
  if (!original) return null;
  const cloned = cloneProjectForEdit(project);
  const suffix = Math.random().toString(36).slice(2, 6);
  const copy = structuredClone(original);
  copy.id = `${original.id.slice(0, 48)}_${suffix}`;
  copy.labelKo = `${original.labelKo} (복제)`.slice(0, 64);
  copy.editableProperties = copy.editableProperties.map((p) => ({
    ...p,
    key: copy.blockPreset ? `${p.key.slice(0, 50)}_${suffix}` : p.key
  }));
  const idx = cloned.componentGraph.nodes.findIndex((n) => n.id === nodeId);
  cloned.componentGraph.nodes.splice(idx + 1, 0, copy);
  return {
    project: finalizeMutation(cloned, `블록 복제: ${original.labelKo}`),
    addedNodeId: copy.id
  };
}

export function toggleComponentBlockVisibility(
  project: DreamProject,
  nodeId: string
): DreamProject {
  const cloned = cloneProjectForEdit(project);
  const node = cloned.componentGraph.nodes.find((n) => n.id === nodeId);
  if (!node) return project;
  node.hidden = !node.hidden;
  return finalizeMutation(
    cloned,
    `블록 ${node.hidden ? "숨김" : "표시"}: ${node.labelKo}`
  );
}

export function restoreDreamProjectVersion(
  project: DreamProject,
  targetRevision: number
): DreamProject | null {
  const target = project.versions.find((v) => v.revision === targetRevision);
  if (!target) return null;
  const nowIso = new Date().toISOString();
  const nextRevision = project.revision + 1;
  const flat = flattenComponentGraphConfig(target.graphSnapshot);
  const restoredTitle = String(flat["siteTitle"] ?? flat["gameTitle"] ?? project.title);

  return {
    ...project,
    title: restoredTitle,
    revision: nextRevision,
    updatedAt: nowIso,
    source: {
      ...project.source,
      files: structuredClone(target.sourceSnapshot)
    },
    componentGraph: structuredClone(target.graphSnapshot),
    contentHash: computeDreamProjectHash(target.sourceSnapshot, target.graphSnapshot),
    versions: [
      ...project.versions.slice(-29),
      {
        revision: nextRevision,
        sourceSnapshot: structuredClone(target.sourceSnapshot),
        graphSnapshot: structuredClone(target.graphSnapshot),
        changeDescription: `v${targetRevision} 버전으로 복원`,
        createdAt: nowIso,
        validationStatus: "valid"
      }
    ]
  };
}
