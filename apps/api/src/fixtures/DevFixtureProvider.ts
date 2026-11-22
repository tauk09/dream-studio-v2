import type {
  ComponentGraph,
  GameDefinition,
  GameIdeaRecommendation,
  ProjectBlueprint,
  ProjectKind
} from "@dream-studio-v2/core";

export interface FixtureGenerationResult {
  title: string;
  careerGoal: string;
  blueprint: ProjectBlueprint;
  files: Record<string, string>;
  componentGraph: ComponentGraph;
  gameDefinition?: GameDefinition;
}

/**
 * Strictly isolated development/test fixture generator (NEVER used on the default live AI path).
 * Demonstrates real multi-file custom code execution inside the opaque-origin sandbox.
 */
export function buildDevFixtureProject(
  kind: ProjectKind,
  prompt: string,
  designIntent: string
): FixtureGenerationResult {
  const lower = prompt.toLowerCase();

  if (kind === "website") {
    const isTeacher = lower.includes("교사") || lower.includes("컴퓨터") || lower.includes("코딩");
    const isChef = lower.includes("요리") || lower.includes("셰프");

    if (isTeacher) {
      const graph: ComponentGraph = {
        nodes: [
          {
            id: "node_hero",
            name: "ClassroomHero",
            labelKo: "첫 화면 제목 & 디자인 색상",
            kind: "section",
            parentId: null,
            childrenIds: ["node_binary"],
            sourceFile: "index.html",
            editableVia: "block",
            editableProperties: [
              { key: "siteTitle", labelKo: "웹사이트 제목", type: "text", value: "컴퓨터 교사의 인터랙티브 코딩 교실" },
              { key: "subtitle", labelKo: "소개 문구", type: "textarea", value: "직접 스위치를 눌러 보며 컴퓨터가 0과 1로 생각하는 원리를 배우는 공간입니다." },
              { key: "accentColor", labelKo: "대표 색상", type: "color", value: "#6858F5" }
            ]
          },
          {
            id: "node_binary",
            name: "InteractiveBinaryLab",
            labelKo: "4비트 2진수 체험 교구 (커스텀 컴포넌트)",
            kind: "component",
            parentId: "node_hero",
            childrenIds: [],
            sourceFile: "app.js",
            editableVia: "ai_only",
            aiEditHintKo: "새로운 체험 교구(논리 게이트, 픽셀 아트 등) 추가는 AI 대화로 요청하세요.",
            interactionSummary: "4개의 비트 스위치를 클릭하면 실시간 10진수 및 문자 코드가 계산됩니다.",
            editableProperties: []
          }
        ]
      };
      const html = `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><title>컴퓨터 교사</title></head><body>
        <main class="wrap">
          <header class="hero">
            <span class="pill">💻 컴퓨터 교사 · 개발용 테스트 Fixture</span>
            <h1 id="site-title">컴퓨터 교사의 인터랙티브 코딩 교실</h1>
            <p id="site-sub"></p>
          </header>
          <section class="panel">
            <h2>💡 4비트 2진수 스위치 체험 교구</h2>
            <p class="muted">스위치를 눌러 0과 1이 어떻게 숫자가 되는지 직접 확인해 보세요! (예시 교구)</p>
            <div id="bit-row" class="bits"></div>
            <div class="result-bar">계산된 10진수: <strong id="dec-out">0</strong></div>
          </section>
        </main>
      </body></html>`;
      const css = `
*{box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}
body{margin:0;background:#F7F8FC;color:#17182B;padding:20px}
.wrap{max-width:780px;margin:0 auto;display:grid;gap:16px}
.hero{background:linear-gradient(135deg,var(--accent,#6858F5),#17182B);color:#fff;padding:30px;border-radius:20px}
.pill{background:rgba(255,255,255,.18);padding:5px 12px;border-radius:99px;font-size:12px;font-weight:700}
h1{margin:12px 0 8px;font-size:28px}
.panel{background:#fff;border:1px solid #E6E8F0;border-radius:20px;padding:24px}
.muted{font-size:13px;color:#70758B}
.bits{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
.bit{padding:16px 8px;border-radius:14px;border:2px solid #E6E8F0;background:#F7F8FC;font-size:16px;font-weight:800;cursor:pointer;transition:.15s}
.bit.on{background:var(--accent,#6858F5);color:#fff;border-color:transparent}
.result-bar{background:#F7F8FC;border-radius:12px;padding:12px 16px;font-size:16px}
`;
      const js = `
let bits=[0,1,0,1];
const row=document.getElementById('bit-row');
const out=document.getElementById('dec-out');
function render(){
  const cfg=window.__DREAM_CONFIG__||{};
  document.getElementById('site-title').textContent=cfg.siteTitle||'컴퓨터 교사의 인터랙티브 코딩 교실';
  document.getElementById('site-sub').textContent=cfg.subtitle||'';
  document.documentElement.style.setProperty('--accent',cfg.accentColor||'#6858F5');
  row.innerHTML='';
  bits.forEach(function(v,i){
    const b=document.createElement('button');
    b.type='button';
    b.className='bit'+(v?' on':'');
    b.textContent=v+' ('+Math.pow(2,3-i)+')';
    b.addEventListener('click',function(){ bits[i]=bits[i]?0:1; render(); });
    row.appendChild(b);
  });
  out.textContent=String(bits[0]*8+bits[1]*4+bits[2]*2+bits[3]);
}
if(typeof window.onDreamConfigUpdate==='function') window.onDreamConfigUpdate(render);
render();
`;
      return {
        title: "컴퓨터 교사의 인터랙티브 코딩 교실",
        careerGoal: "컴퓨터 교사",
        blueprint: {
          creativeGoal: "컴퓨터 교사의 수업 철학을 2진수 인터랙티브 체험 교구로 보여 주는 웹사이트",
          targetAudience: "학생, 친구, 동아리 구성원",
          pagesOrScenes: ["히어로 배너", "4비트 2진수 스위치 교구"],
          requiredFeatures: ["실시간 2진수→10진수 변환", "제목/소개/대표 색상 블록 편집"],
          interactionPlan: "비트 스위치를 클릭할 때마다 10진수 결과가 즉시 갱신됩니다.",
          visualDirection: designIntent,
          acceptanceCriteria: ["샌드박스에서 오류 없이 실행", "비트 클릭 시 합계 갱신"],
          exampleDataDisclaimerKo: "예시 수업 교구 콘텐츠이며 실제 개인 경력은 포함하지 않았습니다."
        },
        files: { "index.html": html, "styles.css": css, "app.js": js, "manifest.json": JSON.stringify(graph, null, 2) },
        componentGraph: graph
      };
    }

    if (isChef) {
      const graph: ComponentGraph = {
        nodes: [
          {
            id: "node_chef_hero",
            name: "ChefHero",
            labelKo: "요리 매거진 헤더 & 색상",
            kind: "section",
            parentId: null,
            childrenIds: [],
            sourceFile: "index.html",
            editableVia: "block",
            editableProperties: [
              { key: "siteTitle", labelKo: "매거진 제목", type: "text", value: "셰프의 계절 레시피 아틀리에" },
              { key: "accentColor", labelKo: "대표 색상", type: "color", value: "#EA580C" }
            ]
          }
        ]
      };
      const html = `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><title>요리사</title></head><body>
        <main class="wrap">
          <header class="cover"><span class="tag">🍳 요리사 · 개발용 테스트 Fixture</span><h1 id="site-title">셰프의 계절 레시피 아틀리에</h1><p>인분 수를 클릭하면 재료 계량이 실시간으로 바뀝니다. (예시 레시피)</p></header>
          <section class="card"><div class="row"><h2>토마토 바질 파스타</h2><div class="btns"><button type="button" data-s="1">1인분</button><button type="button" data-s="2">2인분</button><button type="button" data-s="4">4인분</button></div></div><ul id="list"></ul></section>
        </main></body></html>`;
      const css = `*{box-sizing:border-box;font-family:Georgia,serif}body{margin:0;background:#FFF7ED;color:#1C1917;padding:20px}.wrap{max-width:760px;margin:0 auto;display:grid;gap:16px}.cover{background:var(--accent,#EA580C);color:#fff;padding:28px;border-radius:20px}.card{background:#fff;padding:22px;border-radius:18px;border:1px solid #FED7AA}.row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.btns{display:flex;gap:6px}button{background:var(--accent,#EA580C);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer}`;
      const js = `let s=2;const items=[['파스타 면',90,'g'],['완숙 토마토',150,'g'],['올리브오일',15,'ml']];function render(){const cfg=window.__DREAM_CONFIG__||{};document.getElementById('site-title').textContent=cfg.siteTitle||'셰프의 계절 레시피 아틀리에';document.documentElement.style.setProperty('--accent',cfg.accentColor||'#EA580C');const ul=document.getElementById('list');ul.innerHTML='';items.forEach(function(it){const li=document.createElement('li');li.textContent=it[0]+': '+(it[1]*s)+it[2];ul.appendChild(li);});}document.querySelectorAll('[data-s]').forEach(function(b){b.addEventListener('click',function(){s=Number(b.getAttribute('data-s'));render();});});if(typeof window.onDreamConfigUpdate==='function')window.onDreamConfigUpdate(render);render();`;
      return {
        title: "셰프의 계절 레시피 아틀리에",
        careerGoal: "요리사",
        blueprint: {
          creativeGoal: "인분 수에 따라 재료 계량이 바뀌는 인터랙티브 요리 매거진",
          targetAudience: "요리에 관심 있는 학생과 친구",
          pagesOrScenes: ["매거진 커버", "인분 계량 레시피 카드"],
          requiredFeatures: ["인분 스케일러", "색상/제목 블록 편집"],
          interactionPlan: "1/2/4인분 버튼을 누르면 재료 수량이 자동 계산됩니다.",
          visualDirection: designIntent,
          acceptanceCriteria: ["오류 없이 실행", "인분 버튼 작동"],
          exampleDataDisclaimerKo: "예시 레시피입니다."
        },
        files: { "index.html": html, "styles.css": css, "app.js": js, "manifest.json": JSON.stringify(graph, null, 2) },
        componentGraph: graph
      };
    }

    // Architect futuristic website with interactive day/night lighting simulator
    const graph: ComponentGraph = {
      nodes: [
        {
          id: "node_arc_hero",
          name: "ArchitectHero",
          labelKo: "건축 스튜디오 헤더 & 색상",
          kind: "section",
          parentId: null,
          childrenIds: ["node_light"],
          sourceFile: "index.html",
          editableVia: "block",
          editableProperties: [
            { key: "siteTitle", labelKo: "스튜디오 제목", type: "text", value: "미래 공간 아키텍처 스튜디오" },
            { key: "subtitle", labelKo: "비전 문구", type: "textarea", value: "자연 채광과 구조적 아름다움이 공존하는 지속 가능한 미래 건축을 탐구합니다." },
            { key: "accentColor", labelKo: "포인트 색상", type: "color", value: "#6858F5" }
          ]
        },
        {
          id: "node_light",
          name: "DayNightLightingSim",
          labelKo: "낮/밤 채광 시뮬레이터 (커스텀 컴포넌트)",
          kind: "component",
          parentId: "node_arc_hero",
          childrenIds: [],
          sourceFile: "app.js",
          editableVia: "ai_only",
          aiEditHintKo: "새 건축 프로젝트 비교 카드나 인터랙티브 지도는 AI 대화로 추가하세요.",
          editableProperties: []
        }
      ]
    };
    const html = `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><title>건축가</title></head><body>
      <main class="wrap">
        <header class="hero"><span class="pill">🏛️ 건축가 · 개발용 테스트 Fixture</span><h1 id="site-title">미래 공간 아키텍처 스튜디오</h1><p id="site-sub"></p></header>
        <section class="sim"><div class="head"><h2>☀️ 낮 / 밤 자연 채광 시뮬레이션</h2><input id="sl" type="range" min="0" max="100" value="75"></div><div id="stage" class="stage"><div class="bldg"><div class="w"></div><div class="w"></div><div class="w"></div></div></div><p id="cap" class="cap"></p></section>
      </main></body></html>`;
    const css = `*{box-sizing:border-box;font-family:system-ui,sans-serif}body{margin:0;background:#0F1021;color:#F8FAFC;padding:20px}.wrap{max-width:780px;margin:0 auto;display:grid;gap:16px}.hero{background:linear-gradient(135deg,#17182B,var(--accent,#6858F5));padding:28px;border-radius:20px}.pill{font-size:12px;font-weight:700;background:rgba(255,255,255,.16);padding:4px 10px;border-radius:99px}.sim{background:#17182B;border:1px solid #2D314F;border-radius:20px;padding:22px}.head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.stage{height:160px;border-radius:14px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:14px;margin-top:12px}.bldg{width:220px;height:105px;background:#1E293B;border:2px solid #94A3B8;border-radius:10px 10px 0 0;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px}.w{border-radius:4px;background:#FDE047}.cap{font-size:12px;color:#94A3B8;margin:10px 0 0}`;
    const js = `const sl=document.getElementById('sl'),st=document.getElementById('stage'),cap=document.getElementById('cap');function render(){const cfg=window.__DREAM_CONFIG__||{};document.getElementById('site-title').textContent=cfg.siteTitle||'미래 공간 아키텍처 스튜디오';document.getElementById('site-sub').textContent=cfg.subtitle||'';document.documentElement.style.setProperty('--accent',cfg.accentColor||'#6858F5');const v=Number(sl.value);st.style.background=v>50?'linear-gradient(#38BDF8,#E0F2FE)':'linear-gradient(#0F172A,#1E1B4B)';cap.textContent='채광량 '+v+'% · '+(v>50?'자연 채광 모드':'야간 경관 조명 모드');}sl.addEventListener('input',render);if(typeof window.onDreamConfigUpdate==='function')window.onDreamConfigUpdate(render);render();`;
    return {
      title: "미래 공간 아키텍처 스튜디오",
      careerGoal: "건축가",
      blueprint: {
        creativeGoal: "낮/밤 채광 변화 슬라이더가 포함된 미래지향적 건축가 포트폴리오",
        targetAudience: "건축에 관심 있는 방문자",
        pagesOrScenes: ["미래형 히어로", "낮/밤 채광 시뮬레이터"],
        requiredFeatures: ["실시간 채광 슬라이더", "제목/비전/색상 블록 편집"],
        interactionPlan: "슬라이더로 건물의 주간/야간 조명 변화를 확인합니다.",
        visualDirection: designIntent,
        acceptanceCriteria: ["오류 없이 실행", "슬라이더 인터랙션 작동"],
        exampleDataDisclaimerKo: "예시 건축 시뮬레이션이며 실제 수주 이력이 아닙니다."
      },
      files: { "index.html": html, "styles.css": css, "app.js": js, "manifest.json": JSON.stringify(graph, null, 2) },
      componentGraph: graph
    };
  }

  // Game Fixture: Space Rover Exploration (distinct from timing/order/grid)
  const graph: ComponentGraph = {
    nodes: [
      {
        id: "node_game_meta",
        name: "RoverMissionHeader",
        labelKo: "게임 제목 & 테마 색상",
        kind: "style",
        parentId: null,
        childrenIds: [],
        sourceFile: "index.html",
        editableVia: "block",
        editableProperties: [
          { key: "gameTitle", labelKo: "게임 제목", type: "text", value: "화성 탐사 로버: 에너지 미션" },
          { key: "accentColor", labelKo: "로버 색상", type: "color", value: "#6858F5" }
        ]
      },
      {
        id: "node_rover_rules",
        name: "RoverMechanics",
        labelKo: "이동 속도 · 목표 광물 · 배터리 규칙",
        kind: "game_rule",
        parentId: null,
        childrenIds: [],
        sourceFile: "game.js",
        editableVia: "block",
        editableProperties: [
          { key: "roverSpeed", labelKo: "로버 이동 속도", type: "number", value: 4, min: 2, max: 9, step: 1 },
          { key: "targetMinerals", labelKo: "목표 광물 수", type: "number", value: 5, min: 3, max: 12, step: 1 }
        ]
      },
      {
        id: "node_rover_ai",
        name: "PlanetExplorationLoop",
        labelKo: "행성 크레이터 충돌 · 태양광 충전 로직",
        kind: "game_object",
        parentId: null,
        childrenIds: [],
        sourceFile: "game.js",
        editableVia: "ai_only",
        aiEditHintKo: "보스전, 새 아이템, 운석 장애물 추가는 AI 대화창으로 요청하세요.",
        editableProperties: []
      }
    ]
  };
  const html = `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><title>화성 로버</title></head><body>
    <div class="wrap">
      <header class="hud"><div><h1 id="g-title">화성 탐사 로버: 에너지 미션</h1><p class="sub">WASD/방향키로 로버를 조종해 광물(💎)을 모으고 태양광 구역(☀️)에서 배터리를 충전하세요!</p></div><div class="stats"><span id="s-min">💎 0/5</span><span id="s-bat">🔋 100%</span><span id="s-st">준비</span></div></header>
      <div class="bar"><button id="b-start" type="button">탐사 시작</button><button id="b-reset" type="button">다시 시작</button></div>
      <canvas id="cv" width="740" height="380"></canvas>
    </div></body></html>`;
  const css = `*{box-sizing:border-box;font-family:system-ui,sans-serif}body{margin:0;background:#17182B;color:#F8FAFC;padding:14px}.wrap{max-width:760px;margin:0 auto}.hud{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}h1{margin:0;font-size:19px}.sub{margin:3px 0 0;font-size:12px;color:#A5B4FC}.stats{display:flex;gap:6px;font-size:12px;font-weight:700}.stats span{background:#252745;padding:5px 10px;border-radius:10px}.bar{display:flex;gap:8px;margin-bottom:8px}button{background:var(--accent,#6858F5);color:#fff;border:none;border-radius:10px;padding:7px 14px;font-weight:700;cursor:pointer}#cv{width:100%;height:auto;border-radius:14px;border:2px solid #4338CA;background:#2E1065;display:block}`;
  const js = `
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
let phase='ready',rover={x:80,y:190,r:16},bat=100,got=0,keys={},mins=[];
const craters=[{x:260,y:120,r:32},{x:470,y:250,r:36}],solar={x:40,y:270,w:105,h:85};
function cfg(){return window.__DREAM_CONFIG__||{};}
function spawn(){const n=Number(cfg().targetMinerals||5);mins=[];for(let i=0;i<n;i++)mins.push({x:180+((i*105)%500),y:60+((i*117)%260),ok:false});}
function ui(){const n=Number(cfg().targetMinerals||5);document.getElementById('g-title').textContent=cfg().gameTitle||'화성 탐사 로버: 에너지 미션';document.documentElement.style.setProperty('--accent',cfg().accentColor||'#6858F5');document.getElementById('s-min').textContent='💎 '+got+'/'+n;document.getElementById('s-bat').textContent='🔋 '+Math.round(bat)+'%';document.getElementById('s-st').textContent=phase==='playing'?'탐사 중':phase==='won'?'임무 성공!':phase==='lost'?'방전':'준비';}
function start(){rover={x:80,y:190,r:16};bat=100;got=0;spawn();phase='playing';ui();}
document.getElementById('b-start').addEventListener('click',start);
document.getElementById('b-reset').addEventListener('click',start);
window.addEventListener('keydown',function(e){keys[e.code]=true;});
window.addEventListener('keyup',function(e){keys[e.code]=false;});
function loop(){
  if(phase==='playing'){
    const sp=Number(cfg().roverSpeed||4);let dx=0,dy=0;
    if(keys.ArrowUp||keys.KeyW)dy-=sp;if(keys.ArrowDown||keys.KeyS)dy+=sp;if(keys.ArrowLeft||keys.KeyA)dx-=sp;if(keys.ArrowRight||keys.KeyD)dx+=sp;
    const nx=Math.max(18,Math.min(cv.width-18,rover.x+dx)),ny=Math.max(18,Math.min(cv.height-18,rover.y+dy));
    if(!craters.some(function(c){return Math.hypot(nx-c.x,ny-c.y)<c.r+rover.r;})){rover.x=nx;rover.y=ny;}
    if(rover.x>solar.x&&rover.x<solar.x+solar.w&&rover.y>solar.y&&rover.y<solar.y+solar.h)bat=Math.min(100,bat+0.45);else bat=Math.max(0,bat-0.06);
    mins.forEach(function(m){if(!m.ok&&Math.hypot(rover.x-m.x,rover.y-m.y)<rover.r+12){m.ok=true;got++;}});
    if(got>=Number(cfg().targetMinerals||5))phase='won';else if(bat<=0)phase='lost';
    ui();
  }
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.fillStyle='#311042';ctx.fillRect(0,0,cv.width,cv.height);
  ctx.fillStyle='rgba(50,205,181,0.22)';ctx.fillRect(solar.x,solar.y,solar.w,solar.h);
  ctx.strokeStyle='#32CDB5';ctx.strokeRect(solar.x,solar.y,solar.w,solar.h);
  ctx.fillStyle='#A7F3D0';ctx.font='bold 12px sans-serif';ctx.fillText('☀️ 충전 구역',solar.x+16,solar.y+46);
  craters.forEach(function(c){ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.fillStyle='#1E0A2E';ctx.fill();});
  mins.forEach(function(m){if(!m.ok){ctx.beginPath();ctx.arc(m.x,m.y,9,0,Math.PI*2);ctx.fillStyle='#32CDB5';ctx.fill();}});
  ctx.beginPath();ctx.arc(rover.x,rover.y,rover.r,0,Math.PI*2);ctx.fillStyle=cfg().accentColor||'#6858F5';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
  if(phase!=='playing'){ctx.fillStyle='rgba(15,23,42,.65)';ctx.fillRect(0,0,cv.width,cv.height);ctx.fillStyle='#fff';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText(phase==='won'?'🎉 탐사 임무 성공!':phase==='lost'?'🔋 배터리 방전!':'탐사 시작을 눌러 플레이하세요',cv.width/2,cv.height/2);ctx.textAlign='left';}
  requestAnimationFrame(loop);
}
if(typeof window.onDreamConfigUpdate==='function')window.onDreamConfigUpdate(ui);
spawn();ui();requestAnimationFrame(loop);
`;
  return {
    title: "화성 탐사 로버: 에너지 미션",
    careerGoal: "우주 탐사 엔지니어",
    blueprint: {
      creativeGoal: "탐사 로봇 이동, 광물 수집, 배터리 충전 관리가 결합된 행성 탐사 게임",
      targetAudience: "학생 플레이어",
      pagesOrScenes: ["탐사 시작", "행성 2D 필드", "임무 완료/방전 화면"],
      requiredFeatures: ["WASD/방향키 조종", "크레이터 충돌", "태양광 충전", "속도/목표 블록 편집"],
      interactionPlan: "키보드로 로버를 움직여 광물을 수집하고 배터리를 관리합니다.",
      visualDirection: designIntent,
      acceptanceCriteria: ["탐사 시작 후 이동 가능", "광물 수집 시 카운트 증가"]
    },
    files: { "index.html": html, "styles.css": css, "game.js": js, "manifest.json": JSON.stringify(graph, null, 2) },
    componentGraph: graph,
    gameDefinition: {
      gameplayLoop: "이동 → 크레이터 회피 → 광물 수집 → 태양광 구역 배터리 충전 → 목표 달성",
      scenes: ["Ready", "Playing", "Won/Lost"],
      objects: ["탐사 로버", "크레이터", "광물", "태양광 충전 구역"],
      playerActions: ["WASD / 방향키 이동", "탐사 시작 / 다시 시작"],
      rules: ["크레이터 통과 불가", "충전 구역 외부에서 배터리 지속 소모"],
      states: ["ready", "playing", "won", "lost"],
      winConditions: ["목표 광물 개수 수집"],
      loseConditions: ["배터리 0% 방전"]
    }
  };
}

export function buildDevFixtureGameIdeas(careerPrompt: string): GameIdeaRecommendation[] {
  return [
    {
      id: "idea_rover",
      title: "화성 탐사 로버: 에너지 미션",
      genre: "탐험 · 자원 관리",
      oneLiner: `${careerPrompt}에서 영감을 받아 행성을 탐험하며 광물을 모으고 배터리를 관리하는 2D 탐사 게임`,
      coreGameplay: "크레이터를 피해 광물을 수집하고 태양광 구역에서 배터리를 충전",
      controls: "WASD / 방향키",
      goal: "배터리가 방전되기 전에 목표 광물 모두 수집",
      careerConnection: "탐사 임무 계획, 에너지 자원 관리, 장애물 판단력을 게임으로 구현",
      feasible: true,
      difficultyLabel: "보통"
    },
    {
      id: "idea_timing",
      title: "결정적 순간: 집중 타이밍 챌린지",
      genre: "타이밍 액션",
      oneLiner: "예고 신호를 포착해 정확한 순간에 반응하며 연속 콤보를 쌓는 게임",
      coreGameplay: "신호 예고 → 정확한 타이밍 입력 → 콤보 보너스",
      controls: "스페이스바 / 터치",
      goal: "제한시간 내 목표 점수 달성",
      careerConnection: "결정적 순간의 집중력과 판단력을 표현",
      feasible: true,
      difficultyLabel: "쉬움"
    }
  ];
}
