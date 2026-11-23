import { flattenComponentGraphConfig, type ComponentGraph } from "@dream-studio-v2/core";

export function buildSandboxedPreviewHtml(
  files: Record<string, string>,
  graph: ComponentGraph
): string {
  const rawHtml = files["index.html"] ?? "<!doctype html><html><body></body></html>";
  const css = Object.entries(files)
    .filter(([k]) => k.endsWith(".css"))
    .map(([, v]) => v)
    .join("\n\n");
  const js = Object.entries(files)
    .filter(([k]) => k.endsWith(".js"))
    .map(([k, v]) => `/* ${k} */\n${v}`)
    .join("\n\n");

  const configJson = JSON.stringify(flattenComponentGraphConfig(graph)).replace(/</g, "\\u003c");
  const graphJson = JSON.stringify(graph).replace(/</g, "\\u003c");
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none';">`;

  const blockCss = `
.ds-block-wrap{max-width:1040px;margin:20px auto;padding:0 18px;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;box-sizing:border-box}
.ds-block-wrap *{box-sizing:border-box}
.ds-notice{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:14px;font-size:14px;font-weight:600;box-shadow:0 2px 10px rgba(23,24,43,.06)}
.ds-badge{padding:3px 9px;border-radius:999px;font-size:11px;font-weight:800;background:rgba(0,0,0,.1)}
.ds-card-box{background:#fff;border:1px solid #e6e8f0;border-radius:var(--ds-radius,18px);padding:24px;box-shadow:0 6px 24px rgba(23,24,43,.05);color:#17182b}
.ds-grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:16px}
.ds-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:16px}
.ds-item{background:#f7f8fc;border:1px solid #e6e8f0;border-radius:14px;padding:16px}
.ds-item h4{margin:0 0 6px;font-size:15px}
.ds-item p{margin:0;font-size:13px;line-height:1.55;color:#575c72}
.ds-btn{border:0;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;font-size:13px;transition:transform .12s,opacity .12s}
.ds-btn:active{transform:scale(.98)}
.ds-quiz-opt{display:block;width:100%;text-align:left;background:#f7f8fc;border:1px solid #e6e8f0;border-radius:12px;padding:11px 14px;margin-top:8px;cursor:pointer;font-size:13px;font-weight:600;color:#17182b}
.ds-quiz-opt:hover{border-color:#6858f5;background:#eef0ff}
.ds-tl-item{border-left:3px solid #6858f5;padding:6px 0 6px 14px;margin-top:12px}
.ds-faq details{border:1px solid #e6e8f0;border-radius:12px;padding:12px 14px;margin-top:10px;background:#f7f8fc}
.ds-faq summary{font-weight:700;cursor:pointer;font-size:14px}
.ds-faq p{margin:8px 0 0;font-size:13px;color:#575c72;line-height:1.6}
.ds-game-hud{max-width:960px;margin:10px auto;padding:10px 16px;border-radius:14px;background:rgba(15,18,38,.88);color:#fff;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;font-size:13px;border:1px solid rgba(255,255,255,.15)}
`;

  const bridge = `<script>
window.__DREAM_CONFIG__ = ${configJson};
window.__DREAM_GRAPH__ = ${graphJson};
window.__DREAM_LISTENERS__ = [];
window.onDreamConfigUpdate = function(fn){ if(typeof fn === 'function') window.__DREAM_LISTENERS__.push(fn); };
(function(){
  ['log','warn','error'].forEach(function(lvl){
    var orig = console[lvl];
    console[lvl] = function(){
      try{
        var msg = Array.prototype.slice.call(arguments).map(function(a){
          if(typeof a === 'object'){ try{ return JSON.stringify(a); }catch(_){ return String(a); } }
          return String(a);
        }).join(' ').slice(0, 400);
        window.parent.postMessage({ type: 'DREAM_CONSOLE_LOG', level: lvl, message: msg }, '*');
      }catch(_){}
      if(typeof orig === 'function') orig.apply(console, arguments);
    };
  });
})();
window.addEventListener('error', function(e){ try{ var detail = String(e.message || '실행 오류') + (e.lineno ? (' (line ' + e.lineno + ')') : ''); window.parent.postMessage({ type: 'DREAM_RUNTIME_ERROR', message: detail }, '*'); }catch(_){} });
window.addEventListener('unhandledrejection', function(e){ try{ var reason = e.reason && e.reason.message ? e.reason.message : String(e.reason || '비동기 오류'); window.parent.postMessage({ type: 'DREAM_RUNTIME_ERROR', message: reason }, '*'); }catch(_){} });

function __dsEsc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function __dsProp(node, prefix){
  var arr = node.editableProperties || [];
  for(var i=0;i<arr.length;i++){ if(arr[i].key === prefix || arr[i].key.indexOf(prefix) === 0) return arr[i].value; }
  return '';
}

function __dsRenderBlocks(graph){
  if(!document.body || !graph || !Array.isArray(graph.nodes)) return;
  var topHost = document.getElementById('dream-blocks-top');
  if(!topHost){ topHost = document.createElement('div'); topHost.id = 'dream-blocks-top'; document.body.insertBefore(topHost, document.body.firstChild); }
  var botHost = document.getElementById('dream-blocks-bottom');
  if(!botHost){ botHost = document.createElement('div'); botHost.id = 'dream-blocks-bottom'; document.body.appendChild(botHost); }
  topHost.innerHTML = '';
  botHost.innerHTML = '';

  graph.nodes.forEach(function(node){
    if(node.hidden || !node.blockPreset) return;
    var p = node.blockPreset;
    if(p === 'web_theme'){
      var accent = __dsProp(node,'theme_accent') || '#6858F5';
      var bg = __dsProp(node,'theme_bg') || '#F7F8FC';
      var scale = Number(__dsProp(node,'theme_fontScale') || 100);
      var rad = Number(__dsProp(node,'theme_radius') || 18);
      var dark = Boolean(__dsProp(node,'theme_dark'));
      document.documentElement.style.setProperty('--accent', accent);
      document.documentElement.style.setProperty('--ds-radius', rad + 'px');
      document.documentElement.style.fontSize = scale + '%';
      document.body.style.backgroundColor = dark ? '#111326' : bg;
      if(dark) document.body.style.color = '#F4F5FA';
    } else if(p === 'web_notice'){
      var el = document.createElement('div');
      el.className = 'ds-block-wrap';
      el.innerHTML = '<div class="ds-notice" style="background:' + __dsEsc(__dsProp(node,'notice_bg')||'#EEF0FF') + ';color:' + __dsEsc(__dsProp(node,'notice_fg')||'#3B2FD1') + '"><span class="ds-badge">' + __dsEsc(__dsProp(node,'notice_badge')) + '</span><span>' + __dsEsc(__dsProp(node,'notice_text')) + '</span></div>';
      topHost.appendChild(el);
    } else if(p === 'web_cards'){
      var accentC = __dsProp(node,'cards_accent') || '#6858F5';
      var cols = __dsProp(node,'cards_cols') === '2열' ? 'ds-grid-2' : 'ds-grid-3';
      var el2 = document.createElement('section');
      el2.className = 'ds-block-wrap';
      el2.innerHTML = '<div class="ds-card-box"><h3 style="margin:0;font-size:20px;color:' + __dsEsc(accentC) + '">' + __dsEsc(__dsProp(node,'cards_title')) + '</h3><div class="' + cols + '">' +
        [1,2,3].map(function(i){ return '<div class="ds-item"><h4>' + __dsEsc(__dsProp(node,'cards_c'+i+'_title')) + '</h4><p>' + __dsEsc(__dsProp(node,'cards_c'+i+'_desc')) + '</p></div>'; }).join('') +
        '</div></div>';
      botHost.appendChild(el2);
    } else if(p === 'web_quiz'){
      var ans = String(__dsProp(node,'quiz_answer') || '1');
      var fb = String(__dsProp(node,'quiz_feedback') || '정답입니다!');
      var el3 = document.createElement('section');
      el3.className = 'ds-block-wrap';
      el3.innerHTML = '<div class="ds-card-box"><h3 style="margin:0 0 8px;font-size:19px">' + __dsEsc(__dsProp(node,'quiz_title')) + '</h3><p style="margin:0 0 12px;font-size:14px;color:#575c72">' + __dsEsc(__dsProp(node,'quiz_q')) + '</p><div class="ds-quiz-opts"></div><p class="ds-quiz-res" style="margin:12px 0 0;font-size:13px;font-weight:700"></p></div>';
      var optsWrap = el3.querySelector('.ds-quiz-opts');
      var resEl = el3.querySelector('.ds-quiz-res');
      [1,2,3].forEach(function(i){
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ds-quiz-opt';
        b.textContent = i + '. ' + String(__dsProp(node,'quiz_opt'+i));
        b.onclick = function(){
          if(String(i) === ans){ resEl.style.color = '#1EA882'; resEl.textContent = '🎉 ' + fb; }
          else { resEl.style.color = '#E75566'; resEl.textContent = '아쉬워요! 다른 보기를 선택해 보세요.'; }
        };
        optsWrap.appendChild(b);
      });
      botHost.appendChild(el3);
    } else if(p === 'web_stats'){
      var scol = __dsProp(node,'stats_color') || '#32CDB5';
      var el4 = document.createElement('section');
      el4.className = 'ds-block-wrap';
      el4.innerHTML = '<div class="ds-card-box"><div class="ds-grid-3">' +
        [1,2,3].map(function(i){ return '<div class="ds-item" style="text-align:center"><div style="font-size:28px;font-weight:800;color:' + __dsEsc(scol) + '">' + __dsEsc(__dsProp(node,'stats_s'+i+'_val')) + '</div><div style="margin-top:4px;font-size:12px;color:#575c72;font-weight:600">' + __dsEsc(__dsProp(node,'stats_s'+i+'_lbl')) + '</div></div>'; }).join('') +
        '</div></div>';
      botHost.appendChild(el4);
    } else if(p === 'web_timeline'){
      var el5 = document.createElement('section');
      el5.className = 'ds-block-wrap';
      el5.innerHTML = '<div class="ds-card-box"><h3 style="margin:0 0 8px;font-size:19px">' + __dsEsc(__dsProp(node,'tl_title')) + '</h3>' +
        [1,2,3].map(function(i){ return '<div class="ds-tl-item"><div style="font-size:11px;font-weight:800;color:#6858F5">' + __dsEsc(__dsProp(node,'tl_'+i+'_tag')) + '</div><div style="margin-top:3px;font-size:14px">' + __dsEsc(__dsProp(node,'tl_'+i+'_text')) + '</div></div>'; }).join('') +
        '</div>';
      botHost.appendChild(el5);
    } else if(p === 'web_faq'){
      var el6 = document.createElement('section');
      el6.className = 'ds-block-wrap ds-faq';
      el6.innerHTML = '<div class="ds-card-box"><h3 style="margin:0 0 8px;font-size:19px">' + __dsEsc(__dsProp(node,'faq_title')) + '</h3>' +
        [1,2].map(function(i){ return '<details><summary>' + __dsEsc(__dsProp(node,'faq_q'+i)) + '</summary><p>' + __dsEsc(__dsProp(node,'faq_a'+i)) + '</p></details>'; }).join('') +
        '</div>';
      botHost.appendChild(el6);
    } else if(p === 'web_cta'){
      var cbg = __dsProp(node,'cta_bg') || '#6858F5';
      var el7 = document.createElement('section');
      el7.className = 'ds-block-wrap';
      el7.innerHTML = '<div style="background:' + __dsEsc(cbg) + ';color:#fff;border-radius:var(--ds-radius,18px);padding:28px;text-align:center"><h3 style="margin:0;font-size:22px">' + __dsEsc(__dsProp(node,'cta_title')) + '</h3><p style="margin:10px auto 18px;max-width:520px;font-size:14px;opacity:.92">' + __dsEsc(__dsProp(node,'cta_desc')) + '</p><button type="button" class="ds-btn ds-cta-btn" style="background:#fff;color:#17182b">' + __dsEsc(__dsProp(node,'cta_btn')) + '</button><span class="ds-cta-cnt" style="margin-left:10px;font-size:13px;font-weight:700"></span></div>';
      var count = 0;
      var btn = el7.querySelector('.ds-cta-btn');
      var cnt = el7.querySelector('.ds-cta-cnt');
      btn.onclick = function(){ count += 1; cnt.textContent = '응원 ' + count + '회 감사합니다!'; };
      botHost.appendChild(el7);
    } else if(p === 'game_hud'){
      if(!__dsProp(node,'ghud_show')) return;
      var el8 = document.createElement('div');
      el8.className = 'ds-game-hud';
      el8.style.borderColor = String(__dsProp(node,'ghud_badgeColor') || '#32CDB5');
      el8.innerHTML = '<span>🎯 <strong>' + __dsEsc(__dsProp(node,'ghud_mission')) + '</strong></span><span style="opacity:.8;font-size:12px">⌨️ ' + __dsEsc(__dsProp(node,'ghud_controls')) + '</span>';
      topHost.appendChild(el8);
    } else if(p === 'game_fx'){
      var gbg = __dsProp(node,'gfx_bg');
      if(gbg) document.body.style.backgroundColor = String(gbg);
      var glow = Boolean(__dsProp(node,'gfx_glow'));
      var cvs = document.querySelector('canvas');
      if(cvs) cvs.style.boxShadow = glow ? ('0 0 28px ' + String(window.__DREAM_CONFIG__.accentColor || '#32CDB5') + '55') : 'none';
    }
  });
}

window.addEventListener('message', function(e){
  var d = e.data;
  if(!d || d.type !== 'DREAM_MANIFEST_UPDATE') return;
  if(d.config && typeof d.config === 'object'){
    window.__DREAM_CONFIG__ = Object.assign({}, window.__DREAM_CONFIG__, d.config);
  }
  if(d.graph && typeof d.graph === 'object'){
    window.__DREAM_GRAPH__ = d.graph;
    try{ __dsRenderBlocks(window.__DREAM_GRAPH__); }catch(_){}
  }
  for(var i=0;i<window.__DREAM_LISTENERS__.length;i++){ try{ window.__DREAM_LISTENERS__[i](window.__DREAM_CONFIG__); }catch(_){} }
});
window.addEventListener('DOMContentLoaded', function(){
  try{ __dsRenderBlocks(window.__DREAM_GRAPH__); }catch(_){}
  try{ window.parent.postMessage({ type: 'DREAM_PREVIEW_READY' }, '*'); }catch(_){}
});
</script>`;

  let html = rawHtml
    .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, "")
    .replace(/<script[^>]+src=["'][^"']+["'][^>]*>\s*<\/script>/gi, "");

  const safeCss = css.replace(/<\/style>/gi, "<\\/style>");
  const safeJs = js.replace(/<\/script>/gi, "<\\/script>");
  const headInject = `${cspMeta}\n<style>\n${blockCss}\n${safeCss}\n</style>\n${bridge}`;
  html = /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, () => `${headInject}\n</head>`)
    : `<!doctype html><html><head><meta charset="UTF-8">${headInject}</head><body>${html}</body></html>`;

  const scriptInject = safeJs ? `<script>\n${safeJs}\n</script>` : "";
  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, () => `${scriptInject}\n</body>`)
    : `${html}\n${scriptInject}`;
}
