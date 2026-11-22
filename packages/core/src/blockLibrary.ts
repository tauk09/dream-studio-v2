import type { ComponentNode, ProjectKind } from "./models.js";

export interface BlockPresetDefinition {
  presetId: string;
  targetKind: ProjectKind;
  categoryKo: string;
  labelKo: string;
  descriptionKo: string;
  createNode: (uniqueSuffix: string) => ComponentNode;
}

export const WEBSITE_BLOCK_PRESETS: BlockPresetDefinition[] = [
  {
    presetId: "web_theme",
    targetKind: "website",
    categoryKo: "디자인 · 테마",
    labelKo: "전체 테마 & 스타일",
    descriptionKo: "배경색, 강조색, 글자 크기, 모서리 둥글기, 다크 모드를 한 번에 조절",
    createNode: (s) => ({
      id: `blk_theme_${s}`,
      name: "GlobalThemeBlock",
      labelKo: "전체 테마 & 스타일",
      kind: "style",
      parentId: null,
      childrenIds: [],
      sourceFile: "styles.css",
      editableVia: "block",
      blockPreset: "web_theme",
      interactionSummary: "사이트 전체의 색상, 글자 크기, 카드 둥글기를 실시간으로 변경합니다.",
      editableProperties: [
        { key: `theme_accent_${s}`, labelKo: "포인트 강조색", type: "color", value: "#6858F5" },
        { key: `theme_bg_${s}`, labelKo: "페이지 배경색", type: "color", value: "#F7F8FC" },
        { key: `theme_fontScale_${s}`, labelKo: "글자 크기(%)", type: "number", value: 100, min: 85, max: 130, step: 5 },
        { key: `theme_radius_${s}`, labelKo: "카드 둥글기(px)", type: "number", value: 18, min: 4, max: 32, step: 2 },
        { key: `theme_dark_${s}`, labelKo: "다크 모드 전환", type: "boolean", value: false }
      ]
    })
  },
  {
    presetId: "web_notice",
    targetKind: "website",
    categoryKo: "상단 · 안내",
    labelKo: "공지 / 이벤트 배너",
    descriptionKo: "사이트 상단 또는 본문에 눈에 띄는 공지 띠 배너 추가",
    createNode: (s) => ({
      id: `blk_notice_${s}`,
      name: "NoticeBannerBlock",
      labelKo: "공지 / 이벤트 배너",
      kind: "section",
      parentId: null,
      childrenIds: [],
      sourceFile: "index.html",
      editableVia: "block",
      blockPreset: "web_notice",
      interactionSummary: "중요한 소식이나 환영 문구를 강조 배너로 표시합니다.",
      editableProperties: [
        { key: `notice_badge_${s}`, labelKo: "배지 문구", type: "text", value: "NEW" },
        { key: `notice_text_${s}`, labelKo: "공지 내용", type: "text", value: "동아리 전시회 방문을 환영합니다! 아래 체험 기능을 직접 눌러보세요." },
        { key: `notice_bg_${s}`, labelKo: "배너 배경색", type: "color", value: "#EEF0FF" },
        { key: `notice_fg_${s}`, labelKo: "글자색", type: "color", value: "#3B2FD1" }
      ]
    })
  },
  {
    presetId: "web_cards",
    targetKind: "website",
    categoryKo: "콘텐츠",
    labelKo: "핵심 특징 카드 (3열)",
    descriptionKo: "주제의 핵심 포인트 3가지를 깔끔한 카드 그리드로 배치",
    createNode: (s) => ({
      id: `blk_cards_${s}`,
      name: "FeatureCardsBlock",
      labelKo: "핵심 특징 카드",
      kind: "section",
      parentId: null,
      childrenIds: [],
      sourceFile: "index.html",
      editableVia: "block",
      blockPreset: "web_cards",
      interactionSummary: "3개의 핵심 특징 카드를 반응형 그리드로 표시합니다.",
      editableProperties: [
        { key: `cards_title_${s}`, labelKo: "섹션 제목", type: "text", value: "핵심 포인트 한눈에 보기" },
        { key: `cards_c1_title_${s}`, labelKo: "카드 1 제목", type: "text", value: "창의적인 아이디어" },
        { key: `cards_c1_desc_${s}`, labelKo: "카드 1 설명", type: "textarea", value: "장래희망과 관심사에서 출발한 나만의 프로젝트입니다." },
        { key: `cards_c2_title_${s}`, labelKo: "카드 2 제목", type: "text", value: "직접 체험하는 인터랙션" },
        { key: `cards_c2_desc_${s}`, labelKo: "카드 2 설명", type: "textarea", value: "방문자가 버튼을 누르고 결과를 바로 확인할 수 있어요." },
        { key: `cards_c3_title_${s}`, labelKo: "카드 3 제목", type: "text", value: "계속 발전하는 작품" },
        { key: `cards_c3_desc_${s}`, labelKo: "카드 3 설명", type: "textarea", value: "블록 편집과 AI 대화로 언제든 기능을 추가할 수 있습니다." },
        { key: `cards_accent_${s}`, labelKo: "강조색", type: "color", value: "#6858F5" },
        { key: `cards_cols_${s}`, labelKo: "열 배치", type: "select", value: "3열", options: ["2열", "3열"] }
      ]
    })
  },
  {
    presetId: "web_quiz",
    targetKind: "website",
    categoryKo: "인터랙션",
    labelKo: "인터랙티브 미니 퀴즈",
    descriptionKo: "방문자가 보기를 클릭하면 즉시 정답 여부를 알려주는 참여형 퀴즈",
    createNode: (s) => ({
      id: `blk_quiz_${s}`,
      name: "InteractiveQuizBlock",
      labelKo: "인터랙티브 미니 퀴즈",
      kind: "component",
      parentId: null,
      childrenIds: [],
      sourceFile: "app.js",
      editableVia: "block",
      blockPreset: "web_quiz",
      interactionSummary: "보기 버튼을 누르면 즉시 정답/오답 피드백을 제공합니다.",
      editableProperties: [
        { key: `quiz_title_${s}`, labelKo: "퀴즈 제목", type: "text", value: "잠깐! O/X 미니 퀴즈" },
        { key: `quiz_q_${s}`, labelKo: "질문 내용", type: "textarea", value: "이 분야의 전문가가 되기 위해 가장 중요한 역량은 무엇일까요?" },
        { key: `quiz_opt1_${s}`, labelKo: "보기 1", type: "text", value: "호기심과 꾸준한 실험 정신" },
        { key: `quiz_opt2_${s}`, labelKo: "보기 2", type: "text", value: "무조건 암기만 하기" },
        { key: `quiz_opt3_${s}`, labelKo: "보기 3", type: "text", value: "혼자서만 고민하기" },
        { key: `quiz_answer_${s}`, labelKo: "정답 번호", type: "select", value: "1", options: ["1", "2", "3"] },
        { key: `quiz_feedback_${s}`, labelKo: "정답 축하 메시지", type: "text", value: "정답입니다! 직접 부딪히며 배우는 태도가 가장 중요해요." }
      ]
    })
  },
  {
    presetId: "web_stats",
    targetKind: "website",
    categoryKo: "콘텐츠",
    labelKo: "숫자 통계 / 성과 보드",
    descriptionKo: "핵심 지표 3개를 강조 숫자로 보여주는 대시보드 카드",
    createNode: (s) => ({
      id: `blk_stats_${s}`,
      name: "StatsBoardBlock",
      labelKo: "숫자 통계 보드",
      kind: "section",
      parentId: null,
      childrenIds: [],
      sourceFile: "index.html",
      editableVia: "block",
      blockPreset: "web_stats",
      interactionSummary: "3개의 핵심 숫자와 라벨을 강조 카드 형태로 보여줍니다.",
      editableProperties: [
        { key: `stats_s1_val_${s}`, labelKo: "지표 1 수치", type: "text", value: "100%" },
        { key: `stats_s1_lbl_${s}`, labelKo: "지표 1 라벨", type: "text", value: "직접 기획한 아이디어" },
        { key: `stats_s2_val_${s}`, labelKo: "지표 2 수치", type: "text", value: "3단계" },
        { key: `stats_s2_lbl_${s}`, labelKo: "지표 2 라벨", type: "text", value: "목표 달성 로드맵" },
        { key: `stats_s3_val_${s}`, labelKo: "지표 3 수치", type: "text", value: "24/7" },
        { key: `stats_s3_lbl_${s}`, labelKo: "지표 3 라벨", type: "text", value: "열려 있는 체험 공간" },
        { key: `stats_color_${s}`, labelKo: "숫자 강조색", type: "color", value: "#32CDB5" }
      ]
    })
  },
  {
    presetId: "web_timeline",
    targetKind: "website",
    categoryKo: "콘텐츠",
    labelKo: "진로 / 활동 타임라인",
    descriptionKo: "단계별 성장 계획이나 프로젝트 과정을 시간순으로 정리",
    createNode: (s) => ({
      id: `blk_timeline_${s}`,
      name: "TimelineBlock",
      labelKo: "진로 / 활동 타임라인",
      kind: "section",
      parentId: null,
      childrenIds: [],
      sourceFile: "index.html",
      editableVia: "block",
      blockPreset: "web_timeline",
      interactionSummary: "3단계 여정을 시각적 타임라인으로 표시합니다.",
      editableProperties: [
        { key: `tl_title_${s}`, labelKo: "타임라인 제목", type: "text", value: "나의 성장 로드맵" },
        { key: `tl_1_tag_${s}`, labelKo: "1단계 시기", type: "text", value: "STEP 01 · 지금" },
        { key: `tl_1_text_${s}`, labelKo: "1단계 목표", type: "text", value: "기초 원리를 익히고 작은 작품으로 직접 실험하기" },
        { key: `tl_2_tag_${s}`, labelKo: "2단계 시기", type: "text", value: "STEP 02 · 내년" },
        { key: `tl_2_text_${s}`, labelKo: "2단계 목표", type: "text", value: "동아리 친구들과 협업 프로젝트 완성 및 발표하기" },
        { key: `tl_3_tag_${s}`, labelKo: "3단계 시기", type: "text", value: "STEP 03 · 미래" },
        { key: `tl_3_text_${s}`, labelKo: "3단계 목표", type: "text", value: "세상에 도움이 되는 나만의 전문 분야 개척하기" }
      ]
    })
  },
  {
    presetId: "web_faq",
    targetKind: "website",
    categoryKo: "인터랙션",
    labelKo: "FAQ 접이식 아코디언",
    descriptionKo: "질문을 클릭하면 답변이 부드럽게 펼쳐지는 Q&A 섹션",
    createNode: (s) => ({
      id: `blk_faq_${s}`,
      name: "FaqAccordionBlock",
      labelKo: "FAQ 아코디언",
      kind: "component",
      parentId: null,
      childrenIds: [],
      sourceFile: "index.html",
      editableVia: "block",
      blockPreset: "web_faq",
      interactionSummary: "HTML details/summary 기반 접이식 Q&A를 제공합니다.",
      editableProperties: [
        { key: `faq_title_${s}`, labelKo: "섹션 제목", type: "text", value: "자주 묻는 질문 (Q&A)" },
        { key: `faq_q1_${s}`, labelKo: "질문 1", type: "text", value: "이 웹사이트는 어떤 계기로 만들게 되었나요?" },
        { key: `faq_a1_${s}`, labelKo: "답변 1", type: "textarea", value: "평소 관심 있던 장래희망을 친구들에게 쉽고 재미있게 소개하고 싶어서 만들었습니다." },
        { key: `faq_q2_${s}`, labelKo: "질문 2", type: "text", value: "앞으로 어떤 기능을 더 추가할 예정인가요?" },
        { key: `faq_a2_${s}`, labelKo: "답변 2", type: "textarea", value: "더 다양한 체험 위젯과 나만의 기록 갤러리를 계속 업데이트할 계획입니다." }
      ]
    })
  },
  {
    presetId: "web_cta",
    targetKind: "website",
    categoryKo: "마무리",
    labelKo: "응원 / 행동 유도 (CTA) 박스",
    descriptionKo: "방문자가 좋아요·응원 버튼을 누를 수 있는 화려한 마무리 섹션",
    createNode: (s) => ({
      id: `blk_cta_${s}`,
      name: "CtaCalloutBlock",
      labelKo: "응원 / CTA 박스",
      kind: "section",
      parentId: null,
      childrenIds: [],
      sourceFile: "index.html",
      editableVia: "block",
      blockPreset: "web_cta",
      interactionSummary: "응원 버튼을 누르면 카운트가 올라가고 감사 메시지가 표시됩니다.",
      editableProperties: [
        { key: `cta_title_${s}`, labelKo: "제목", type: "text", value: "나의 꿈을 응원해 주세요!" },
        { key: `cta_desc_${s}`, labelKo: "설명 문구", type: "textarea", value: "방문해 주셔서 감사합니다. 아래 버튼을 눌러 응원을 남겨 주세요." },
        { key: `cta_btn_${s}`, labelKo: "버튼 문구", type: "text", value: "응원하기 👏" },
        { key: `cta_bg_${s}`, labelKo: "배경 강조색", type: "color", value: "#6858F5" }
      ]
    })
  }
];

export const GAME_BLOCK_PRESETS: BlockPresetDefinition[] = [
  {
    presetId: "game_rules",
    targetKind: "game",
    categoryKo: "핵심 규칙",
    labelKo: "게임 밸런스 & 난이도",
    descriptionKo: "플레이어 속도, 제한 시간, 목표 점수, 생명력을 슬라이더로 즉시 조정",
    createNode: (s) => ({
      id: `blk_grules_${s}`,
      name: "GameBalanceBlock",
      labelKo: "게임 밸런스 & 난이도",
      kind: "game_rule",
      parentId: null,
      childrenIds: [],
      sourceFile: "game.js",
      editableVia: "block",
      blockPreset: "game_rules",
      interactionSummary: "게임 속도·시간·목표 점수를 실시간으로 조정합니다.",
      editableProperties: [
        { key: "playerSpeed", labelKo: "플레이어 이동 속도", type: "number", value: 6, min: 2, max: 15, step: 1 },
        { key: "timeLimit", labelKo: "제한 시간 (초)", type: "number", value: 45, min: 15, max: 120, step: 5 },
        { key: "targetScore", labelKo: "목표 클리어 점수", type: "number", value: 100, min: 30, max: 500, step: 10 },
        { key: "maxLives", labelKo: "최대 생명(하트)", type: "number", value: 3, min: 1, max: 10, step: 1 }
      ]
    })
  },
  {
    presetId: "game_obstacles",
    targetKind: "game",
    categoryKo: "핵심 규칙",
    labelKo: "장애물 / 적 패턴 조절",
    descriptionKo: "장애물 이동 속도, 등장 빈도, 난이도 가속 여부를 제어",
    createNode: (s) => ({
      id: `blk_gobs_${s}`,
      name: "ObstaclePatternBlock",
      labelKo: "장애물 / 적 패턴",
      kind: "game_rule",
      parentId: null,
      childrenIds: [],
      sourceFile: "game.js",
      editableVia: "block",
      blockPreset: "game_obstacles",
      interactionSummary: "장애물 속도와 등장 간격을 조절합니다.",
      editableProperties: [
        { key: "obstacleSpeed", labelKo: "장애물 속도", type: "number", value: 5, min: 1, max: 15, step: 1 },
        { key: "spawnRate", labelKo: "등장 빈도 (초당)", type: "number", value: 2, min: 1, max: 6, step: 1 },
        { key: "escalateDifficulty", labelKo: "시간 경과 시 난이도 상승", type: "boolean", value: true }
      ]
    })
  },
  {
    presetId: "game_combo",
    targetKind: "game",
    categoryKo: "재미 요소",
    labelKo: "콤보 & 보너스 피버",
    descriptionKo: "연속 성공 시 점수 배율과 보너스 아이템 등장 확률 설정",
    createNode: (s) => ({
      id: `blk_gcombo_${s}`,
      name: "ComboBonusBlock",
      labelKo: "콤보 & 보너스 피버",
      kind: "game_rule",
      parentId: null,
      childrenIds: [],
      sourceFile: "game.js",
      editableVia: "block",
      blockPreset: "game_combo",
      interactionSummary: "보너스 점수 배율과 피버 모드를 제어합니다.",
      editableProperties: [
        { key: "comboMultiplier", labelKo: "콤보 점수 배율", type: "number", value: 2, min: 1, max: 5, step: 1 },
        { key: "bonusChance", labelKo: "보너스 등장 확률(%)", type: "number", value: 25, min: 0, max: 80, step: 5 },
        { key: "feverEnabled", labelKo: "피버 타임 활성화", type: "boolean", value: true }
      ]
    })
  },
  {
    presetId: "game_hud",
    targetKind: "game",
    categoryKo: "화면 · HUD",
    labelKo: "상단 미션 배너 & 조작 힌트",
    descriptionKo: "게임 화면 위에 목표 미션 배너와 키보드/터치 조작 안내를 표시",
    createNode: (s) => ({
      id: `blk_ghud_${s}`,
      name: "GameHudOverlayBlock",
      labelKo: "상단 미션 배너 & 힌트",
      kind: "component",
      parentId: null,
      childrenIds: [],
      sourceFile: "index.html",
      editableVia: "block",
      blockPreset: "game_hud",
      interactionSummary: "게임 상단에 미션 목표와 조작 가이드를 띄웁니다.",
      editableProperties: [
        { key: `ghud_mission_${s}`, labelKo: "미션 안내 문구", type: "text", value: "장애물을 피하고 목표 점수를 달성하세요!" },
        { key: `ghud_controls_${s}`, labelKo: "조작 힌트", type: "text", value: "방향키 / WASD 이동 · 스페이스바 액션" },
        { key: `ghud_badgeColor_${s}`, labelKo: "배너 강조색", type: "color", value: "#32CDB5" },
        { key: `ghud_show_${s}`, labelKo: "미션 배너 표시", type: "boolean", value: true }
      ]
    })
  },
  {
    presetId: "game_fx",
    targetKind: "game",
    categoryKo: "디자인 · 연출",
    labelKo: "테마 색상 & 시각 연출",
    descriptionKo: "게임 프레임 테두리, 강조색, 화면 글로우 효과를 즉시 변경",
    createNode: (s) => ({
      id: `blk_gfx_${s}`,
      name: "GameVisualFxBlock",
      labelKo: "테마 색상 & 시각 연출",
      kind: "style",
      parentId: null,
      childrenIds: [],
      sourceFile: "styles.css",
      editableVia: "block",
      blockPreset: "game_fx",
      interactionSummary: "게임 배경 톤과 네온 글로우 효과를 조절합니다.",
      editableProperties: [
        { key: "accentColor", labelKo: "메인 포인트 색상", type: "color", value: "#32CDB5" },
        { key: `gfx_bg_${s}`, labelKo: "외곽 배경색", type: "color", value: "#0F1226" },
        { key: `gfx_glow_${s}`, labelKo: "네온 글로우 효과", type: "boolean", value: true }
      ]
    })
  },
  {
    presetId: "game_audio",
    targetKind: "game",
    categoryKo: "사운드",
    labelKo: "효과음 (Web Audio)",
    descriptionKo: "버튼 클릭 및 플레이 중 간단한 신디사이저 효과음 ON/OFF",
    createNode: (s) => ({
      id: `blk_gaudio_${s}`,
      name: "GameAudioBlock",
      labelKo: "효과음 (Web Audio)",
      kind: "component",
      parentId: null,
      childrenIds: [],
      sourceFile: "game.js",
      editableVia: "block",
      blockPreset: "game_audio",
      interactionSummary: "간단한 브라우저 내장 효과음을 활성화합니다.",
      editableProperties: [
        { key: "soundEnabled", labelKo: "효과음 켜기", type: "boolean", value: true },
        { key: "soundVolume", labelKo: "효과음 크기(%)", type: "number", value: 60, min: 0, max: 100, step: 10 }
      ]
    })
  }
];

export function getBlockPresetsForKind(kind: ProjectKind): BlockPresetDefinition[] {
  return kind === "game" ? GAME_BLOCK_PRESETS : WEBSITE_BLOCK_PRESETS;
}
