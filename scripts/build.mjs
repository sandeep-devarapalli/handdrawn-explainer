#!/usr/bin/env node
/* build.mjs: scene.json -> one self-contained HTML page (preview + render target).
   usage: node build.mjs <scene.json> [--out build/preview.html] [--timing build/] [--mathjax cdn|vendor/tex-svg.js]
   The page: controls (play, scrub, speed, format, language, font) for review;
   with ?render=1&format=wide&lang=en[&cut=id] it hides all chrome and exposes window.board for frame capture. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const args=process.argv.slice(2);
const opt=(k,d)=>{const i=args.indexOf(k);return i>=0?args[i+1]:d};
const scenePath=args.find(a=>!a.startsWith('--')&&a.endsWith('.json'));
if(!scenePath){console.error('usage: node build.mjs scene.json [--out file] [--timing dir] [--mathjax cdn|path]');process.exit(1)}
const scene=JSON.parse(fs.readFileSync(scenePath,'utf8'));
const here=path.dirname(fileURLToPath(import.meta.url));
const runtime=fs.readFileSync(path.join(here,'..','runtime','board.js'),'utf8');
const outPath=opt('--out',path.join(path.dirname(scenePath),'build','preview.html'));
const timingDir=opt('--timing',path.join(path.dirname(scenePath),'build'));
const mathjax=opt('--mathjax','cdn');

// timing files produced by narrate.mjs: timing.<lang>.json
const timing={};
for(const lang of scene.languages||['en']){
  const p=path.join(timingDir,`timing.${lang}.json`);
  if(fs.existsSync(p))timing[lang]=JSON.parse(fs.readFileSync(p,'utf8'));
}
const hasMath=scene.beats.some(b=>(b.draw||[]).some(e=>e.type==='math'));
const font=(scene.style&&scene.style.font)||'Kalam';
const langFonts={hi:'Noto Sans Devanagari',kn:'Noto Sans Kannada',te:'Noto Sans Telugu',ta:'Noto Sans Tamil',mr:'Noto Sans Devanagari',bn:'Noto Sans Bengali'};
const families=new Set([font,'Kalam']);
(scene.languages||[]).forEach(l=>{if(langFonts[l])families.add(langFonts[l])});
const fontLink=`https://fonts.googleapis.com/css2?${[...families].map(f=>'family='+encodeURIComponent(f).replace(/%20/g,'+')+':wght@400;700').join('&')}&display=swap`;
const mathTag=!hasMath?'':mathjax==='cdn'
  ?`<script>window.MathJax={loader:{load:['[tex]/boldsymbol','[tex]/ams']},tex:{inlineMath:[],packages:{'[+]':['boldsymbol','ams']}},svg:{fontCache:'none'},startup:{typeset:false}};</script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.js" async></script>`
  :`<script>window.MathJax={loader:{load:['[tex]/boldsymbol','[tex]/ams']},tex:{inlineMath:[],packages:{'[+]':['boldsymbol','ams']}},svg:{fontCache:'none'},startup:{typeset:false}};</script>\n<script>${fs.readFileSync(mathjax,'utf8')}</script>`;
const subFontRule=Object.entries(langFonts).filter(([l])=>(scene.languages||[]).includes(l)).map(([l,f])=>`.hb-root[data-lang="${l}"]{--hb-sub-font:"${f}"}`).join('\n');
const esc=s=>s.replace(/</g,'\\u003c');

const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${scene.title||scene.id}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontLink}" rel="stylesheet">
${mathTag}
<style>
:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);--bg:#f3f1ea;--fg:#1d1c1a;--muted:#67655d;--card:#fbfaf6;--line:#dcd8cc;--btn:#1d1c1a;--btn-fg:#f3f1ea;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#15151a;--fg:#ecebe6;--muted:#9d9c95;--card:#1d1d24;--line:#2e2e38;--btn:#ecebe6;--btn-fg:#15151a;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#15151a;--fg:#ecebe6;--muted:#9d9c95;--card:#1d1d24;--line:#2e2e38;--btn:#ecebe6;--btn-fg:#15151a;color-scheme:dark}
*,*::before,*::after{box-sizing:inherit}
body{margin:0;background:var(--bg);color:var(--fg);font-family:"Source Sans 3",system-ui,sans-serif;font-size:16px;line-height:1.5}
.wrap{max-width:1180px;margin:0 auto;padding:24px 20px 48px}
h1{font-family:"${font}",Kalam,cursive;font-weight:700;font-size:clamp(26px,4vw,40px);margin:0 0 14px;line-height:1.1}
.stage{display:flex;justify-content:center}
.board{width:100%;aspect-ratio:16/9;border-radius:14px}
.board[data-format=tall]{aspect-ratio:9/16;height:min(82vh,1400px);width:auto;max-width:100%}
.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}
.controls button,.controls select{font:inherit;font-size:15px;font-weight:600;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:10px;padding:8px 14px;cursor:pointer}
.controls button.primary{background:var(--btn);color:var(--btn-fg);border-color:var(--btn)}
.controls input[type=range]{flex:1 1 160px;min-width:120px;accent-color:#ff7a59}
.controls .time{color:var(--muted);font-variant-numeric:tabular-nums;min-width:70px;font-size:14px}
.controls label{font-size:14px;color:var(--muted);display:flex;gap:6px;align-items:center}
.caption{margin-top:10px;min-height:1.6em;color:var(--muted);font-size:15px}
.caption strong{color:var(--fg);font-weight:600}
.timing-note{font-size:13.5px;color:var(--muted);margin-top:6px}
body.render{background:#050506}
body.render .wrap{max-width:none;padding:0}
body.render h1,body.render .controls,body.render .caption,body.render .timing-note{display:none}
body.render .board{width:100vw;height:100vh;aspect-ratio:auto;border-radius:0;max-height:none}
${subFontRule}
</style>
</head>
<body>
<div class="wrap">
<h1>${(scene.title||scene.id).replace(/</g,'&lt;')}</h1>
<div class="stage"><div class="board" id="board"></div></div>
<div class="controls">
  <button class="primary" id="play">Play</button>
  <button id="restart">Restart</button>
  <select id="speed" aria-label="Playback speed"><option value="0.6">0.6×</option><option value="1" selected>1×</option><option value="1.6">1.6×</option><option value="2.5">2.5×</option></select>
  <input type="range" id="scrub" min="0" max="1000" value="0" aria-label="Scrub">
  <span class="time" id="time">0.0 s</span>
  <label>Format <select id="format"></select></label>
  <label>Language <select id="lang"></select></label>
  <label>Handwriting <select id="font"><option>Kalam</option><option>Patrick Hand</option><option>Architects Daughter</option><option>Gloria Hallelujah</option><option>Caveat</option></select></label>
  <label>Cut <select id="cut"><option value="">full</option></select></label>
</div>
<div class="caption" id="caption"></div>
<div class="timing-note" id="timing-note"></div>
</div>
<script>${runtime}</script>
<script>
const SCENE=${esc(JSON.stringify(scene))};
const TIMING=${esc(JSON.stringify(timing))};
(async function(){
  const q=new URLSearchParams(location.search);
  const state={format:q.get('format')||'wide',lang:q.get('lang')||(SCENE.languages||['en'])[0],cut:q.get('cut')||null,font:q.get('font')||'${font}'};
  const render=q.get('render')==='1';
  if(render)document.body.classList.add('render');
  const boardEl=document.getElementById('board');
  const fmtSel=document.getElementById('format'),langSel=document.getElementById('lang'),fontSel=document.getElementById('font'),cutSel=document.getElementById('cut');
  Object.keys(SCENE.formats).forEach(f=>fmtSel.add(new Option(f,f,false,f===state.format)));
  (SCENE.languages||['en']).forEach(l=>langSel.add(new Option(l,l,false,l===state.lang)));
  Object.keys(SCENE.cuts||{}).forEach(c=>cutSel.add(new Option(c,c,false,c===state.cut)));
  fontSel.value=state.font;
  const btn=document.getElementById('play'),scrub=document.getElementById('scrub'),time=document.getElementById('time'),cap=document.getElementById('caption'),note=document.getElementById('timing-note');
  let board=null,scrubbing=false;
  async function mountBoard(){
    if(board)board.pause();
    boardEl.dataset.format=state.format;boardEl.dataset.lang=state.lang;
    const timing=TIMING[state.lang]||null;
    boardEl.innerHTML='<div style="position:absolute;inset:0;display:grid;place-items:center;color:#777;font:20px Kalam,sans-serif">Loading the board…</div>';
    board=await HandBoard.mount(boardEl,SCENE,{format:state.format,lang:state.lang,cut:state.cut,font:state.font,timing});
    note.textContent=timing?'Timing: from narration audio ('+state.lang+').':'Timing: stroke-driven (no narration yet). Run narrate.mjs to time beats from audio.';
    board.onTick((t,bi,stopped)=>{
      if(!scrubbing)scrub.value=Math.round(t/board.total*1000);time.textContent=t.toFixed(1)+' s';
      btn.textContent=board.playing?'Pause':(t>=board.total?'Play again':'Play');
      cap.innerHTML=bi<0?'':'<strong>'+(bi+1)+' of '+board.beats.length+':</strong> '+board.beats[bi].title;
    });
    board.seek(0);
    window.board=board;window.boardReady=true;
  }
  try{await mountBoard()}catch(err){boardEl.innerHTML='<div style="position:absolute;inset:0;display:grid;place-items:center;color:#ddd;font:18px Kalam,sans-serif;padding:24px;text-align:center">Could not build the board: '+String(err.message||err).replace(/</g,'&lt;')+'</div>';console.error(err);return}
  btn.onclick=()=>board.toggle();
  document.getElementById('restart').onclick=()=>{board.pause();board.seek(0);board.play()};
  document.getElementById('speed').onchange=e=>board.setSpeed(+e.target.value);
  scrub.oninput=e=>{scrubbing=true;board.seek(+e.target.value/1000*board.total)};scrub.onchange=()=>{scrubbing=false};
  fmtSel.onchange=e=>{state.format=e.target.value;mountBoard()};
  langSel.onchange=e=>{state.lang=e.target.value;boardEl.dataset.lang=state.lang;mountBoard()};
  cutSel.onchange=e=>{state.cut=e.target.value||null;mountBoard()};
  fontSel.onchange=e=>{state.font=e.target.value;board.setFont(state.font)};
  document.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT'||e.target.tagName==='INPUT')return;if(e.key===' '){e.preventDefault();board.toggle()}});
})();
</script>
</body>
</html>`;
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,html);
console.log('wrote',outPath,hasMath?'(math via '+mathjax+')':'',Object.keys(timing).length?'timing for: '+Object.keys(timing).join(', '):'no timing yet');
