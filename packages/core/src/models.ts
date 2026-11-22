import { z } from "zod";

export const SCHEMA_VERSION_V2 = "2.0.0" as const;

export const ProjectKindSchema = z.enum(["website", "game"]);
export type ProjectKind = z.infer<typeof ProjectKindSchema>;

export const EditablePropertySchema = z
  .object({
    key: z.string().min(1).max(64),
    labelKo: z.string().min(1).max(64),
    type: z.enum(["text", "textarea", "color", "number", "boolean", "select"]),
    value: z.union([z.string(), z.number(), z.boolean()]),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    options: z.array(z.string()).max(16).optional()
  })
  .strict();
export type EditableProperty = z.infer<typeof EditablePropertySchema>;

export const ComponentNodeSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(64),
    labelKo: z.string().min(1).max(64),
    kind: z.enum(["section", "component", "game_object", "game_rule", "style"]),
    parentId: z.string().nullable(),
    childrenIds: z.array(z.string()),
    sourceFile: z.string().min(1).max(80),
    editableVia: z.enum(["block", "ai_only"]),
    blockPreset: z.string().max(48).optional(),
    hidden: z.boolean().optional(),
    aiEditHintKo: z.string().max(180).optional(),
    interactionSummary: z.string().max(160).optional(),
    editableProperties: z.array(EditablePropertySchema).max(24)
  })
  .strict();
export type ComponentNode = z.infer<typeof ComponentNodeSchema>;

export const ComponentGraphSchema = z
  .object({
    nodes: z.array(ComponentNodeSchema)
  })
  .strict();
export type ComponentGraph = z.infer<typeof ComponentGraphSchema>;

export const ProjectBlueprintSchema = z
  .object({
    creativeGoal: z.string().min(1).max(300),
    targetAudience: z.string().min(1).max(160),
    pagesOrScenes: z.array(z.string().min(1).max(120)).min(1).max(12),
    requiredFeatures: z.array(z.string().min(1).max(160)).min(1).max(12),
    interactionPlan: z.string().min(1).max(300),
    visualDirection: z.string().min(1).max(200),
    acceptanceCriteria: z.array(z.string().min(1).max(160)).min(1).max(10),
    exampleDataDisclaimerKo: z.string().max(240).optional()
  })
  .strict();
export type ProjectBlueprint = z.infer<typeof ProjectBlueprintSchema>;

export const ValidationResultSchema = z
  .object({
    ok: z.boolean(),
    syntaxPassed: z.boolean(),
    securityPassed: z.boolean(),
    checkedFiles: z.array(z.string()),
    errors: z.array(z.string()),
    warnings: z.array(z.string())
  })
  .strict();
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const GeneratedSourceSchema = z
  .object({
    files: z.record(z.string(), z.string()),
    entrypoints: z.array(z.string().min(1)).min(1),
    dependencyManifest: z.array(z.string()),
    assetReferences: z.array(
      z
        .object({
          id: z.string(),
          kind: z.enum(["svg", "canvas", "image", "audio"]),
          source: z.enum(["generated_code", "builtin", "user_upload"]),
          license: z.string()
        })
        .strict()
    ),
    validationResult: ValidationResultSchema
  })
  .strict();
export type GeneratedSource = z.infer<typeof GeneratedSourceSchema>;

export const GameDefinitionSchema = z
  .object({
    gameplayLoop: z.string().min(1).max(260),
    scenes: z.array(z.string().min(1)).min(1),
    objects: z.array(z.string().min(1)).min(1),
    playerActions: z.array(z.string().min(1)).min(1),
    rules: z.array(z.string().min(1)).min(1),
    states: z.array(z.string().min(1)).min(1),
    winConditions: z.array(z.string().min(1)).min(1),
    loseConditions: z.array(z.string().min(1)).min(1)
  })
  .strict();
export type GameDefinition = z.infer<typeof GameDefinitionSchema>;

export const ProjectVersionSchema = z
  .object({
    revision: z.number().int().min(1),
    sourceSnapshot: z.record(z.string(), z.string()),
    graphSnapshot: ComponentGraphSchema,
    changeDescription: z.string().min(1).max(180),
    createdAt: z.string().min(1),
    validationStatus: z.enum(["valid", "repaired", "failed"])
  })
  .strict();
export type ProjectVersion = z.infer<typeof ProjectVersionSchema>;

export const DreamProjectSchema = z
  .object({
    id: z.string().min(1).max(64),
    ownerId: z.string().nullable(),
    title: z.string().min(1).max(80),
    kind: ProjectKindSchema,
    careerGoal: z.string().min(1).max(60),
    creationPrompt: z.string().min(1).max(800),
    designIntent: z.string().min(1).max(120),
    revision: z.number().int().min(1),
    contentHash: z.string().regex(/^[0-9a-f]{16}$/),
    schemaVersion: z.literal(SCHEMA_VERSION_V2),
    publishState: z.enum(["draft", "published", "unpublished"]),
    publishedSlug: z.string().nullable(),
    generatorSource: z.enum(["live_ai", "dev_fixture"]),
    providerInfo: z
      .object({
        provider: z.string().min(1),
        model: z.string().min(1),
        repairAttempts: z.number().int().min(0)
      })
      .strict(),
    blueprint: ProjectBlueprintSchema,
    source: GeneratedSourceSchema,
    componentGraph: ComponentGraphSchema,
    gameDefinition: GameDefinitionSchema.optional(),
    versions: z.array(ProjectVersionSchema).min(1).max(30),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  })
  .strict();
export type DreamProject = z.infer<typeof DreamProjectSchema>;

export const GenerationStageSchema = z.enum([
  "analyzing_intent",
  "planning_concept",
  "generating_code",
  "validating_build",
  "repairing_code",
  "completed",
  "failed",
  "cancelled"
]);
export type GenerationStage = z.infer<typeof GenerationStageSchema>;

export const GenerationJobSchema = z
  .object({
    jobId: z.string().min(1),
    status: z.enum(["running", "completed", "failed", "cancelled"]),
    progressStage: GenerationStageSchema,
    stageLabelKo: z.string().min(1),
    kind: ProjectKindSchema,
    provider: z.string(),
    retryCount: z.number().int().min(0),
    error: z.string().nullable(),
    project: DreamProjectSchema.optional(),
    previewHtml: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict();
export type GenerationJob = z.infer<typeof GenerationJobSchema>;

export const GameIdeaRecommendationSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(60),
    genre: z.string().min(1).max(40),
    oneLiner: z.string().min(1).max(160),
    coreGameplay: z.string().min(1).max(200),
    controls: z.string().min(1).max(120),
    goal: z.string().min(1).max(160),
    careerConnection: z.string().min(1).max(200),
    feasible: z.boolean(),
    difficultyLabel: z.enum(["쉬움", "보통", "도전"])
  })
  .strict();
export type GameIdeaRecommendation = z.infer<typeof GameIdeaRecommendationSchema>;

export interface PendingCodeChange {
  requestId: string;
  baseRevision: number;
  summaryKo: string;
  diffItems: string[];
  changedFiles: string[];
  requiresGameRestart: boolean;
  generatorSource: "live_ai" | "dev_fixture";
  candidateProject: DreamProject;
  previewHtml: string;
}
