/* HandBoard runtime v1
   Turns a scene (see references/scene-format.md) into an animated hand-drawn board:
   wobbly SVG strokes, handwriting text, typeset math (MathJax SVG), a pen that follows
   the tip, subtitles, optional camera moves. Deterministic: everything is a function of
   time t, so a renderer can seek(t) frame by frame.
   Exposes window.HandBoard = { mount, PALETTE, compile }. No dependencies except MathJax when the
   scene has math (loaded separately; see build.mjs for the config: svg.fontCache 'none', boldsymbol + ams preloaded). */
(function(){
'use strict';
const PALETTE={blue:'#5ac8fa',coral:'#ff7a59',teal:'#3ee6b8',yellow:'#ffd23f',pink:'#ff5fa8',purple:'#b7a2ff',white:'#f4f4f4',grey:'#8a8a92'};
const col=c=>PALETTE[c]||c||PALETTE.white;
const NS='http://www.w3.org/2000/svg';
const mk=(n,a)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);return e};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* ---------- geometry ---------- */
const arcPts=(cx,cy,r,a0,a1,n)=>{n=n||Math.max(10,Math.ceil(Math.abs(a1-a0)/6));const out=[];for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n)*Math.PI/180;out.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}return out};
const polyLen=p=>{let s=0;for(let i=1;i<p.length;i++)s+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return s};
const pointAt=(p,d)=>{let acc=0;for(let i=1;i<p.length;i++){const seg=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);if(acc+seg>=d){const r=seg?(d-acc)/seg:0;return [p[i-1][0]+(p[i][0]-p[i-1][0])*r,p[i-1][1]+(p[i][1]-p[i-1][1])*r]}acc+=seg}return p[p.length-1]};
const toD=p=>'M'+p.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L');
function headSegs(pts,s){const [x1,y1]=pts[pts.length-1],[x0,y0]=pts[pts.length-2];const a=Math.atan2(y1-y0,x1-x0);
  return [[[x1,y1],[x1-s*Math.cos(a-0.5),y1-s*Math.sin(a-0.5)]],[[x1,y1],[x1-s*Math.cos(a+0.5),y1-s*Math.sin(a+0.5)]]]}
function sketch(rng,pts,closed,amp){
  const src=closed?[...pts,pts[0]]:pts;const out=[];let phase=rng()*6.28;
  for(let i=0;i<src.length-1;i++){
    const [x0,y0]=src[i],[x1,y1]=src[i+1];const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1;const nx=-dy/L,ny=dx/L;
    const n=Math.max(2,Math.ceil(L/12));
    for(let k=(i===0?0:1);k<=n;k++){const t=k/n;const w=Math.sin(phase+t*L/38)*0.7+(rng()-0.5)*0.9;const o=amp*w*((k===0||k===n)?0.35:1);out.push([x0+dx*t+nx*o,y0+dy*t+ny*o])}
    phase+=1.3;
  }
  return out;
}

/* ---------- layout: regions map scene coordinates onto the board for a format ---------- */
function bandFor(scene,format){
  const b=scene.style&&scene.style.subtitleBand;
  if(typeof b==='number')return b;
  if(b&&b[format]!=null)return b[format];
  return format==='tall'?160:100;
}
function layoutFor(scene,format){
  const [W,H]=scene.formats[format];
  const band=bandFor(scene,format);
  const regions={};
  for(const name in (scene.regions||{})){
    const r=scene.regions[name];const rect=r[format];
    if(!rect)continue;
    const s=Math.min(rect[2]/r.ref[0],rect[3]/r.ref[1]);
    regions[name]={s,ox:rect[0]+(rect[2]-r.ref[0]*s)/2,oy:rect[1]+(rect[3]-r.ref[1]*s)/2};
  }
  return {W,H,band,drawH:H-band,regions};
}
function mapper(layout,regionName){
  if(!regionName)return {s:1,pt:p=>p,x:v=>v,y:v=>v};
  const r=layout.regions[regionName];
  if(!r)return null;
  return {s:r.s,pt:p=>[r.ox+p[0]*r.s,r.oy+p[1]*r.s],x:v=>r.ox+v*r.s,y:v=>r.oy+v*r.s};
}

/* ---------- expand authored elements into primitives (path / text / math) ---------- */
function expand(el,m,rng){
  const w=(el.width||5)*m.s;const color=col(el.color);const out=[];
  const path=(pts,o)=>({type:'path',pts:pts.map(m.pt),color,width:(o&&o.width)||w,closed:!!(o&&o.closed),amp:el.amp});
  switch(el.type){
    case 'line': case 'path': out.push(path(el.pts,{closed:el.closed}));break;
    case 'arrow': {const pts=el.pts;out.push(path(pts));headSegs(pts,el.head||16).forEach(h=>out.push(path(h)));break}
    case 'arc': {const pts=arcPts(el.cx,el.cy,el.r,el.a0,el.a1);out.push(path(pts));if(el.arrow)headSegs(pts,el.head||14).forEach(h=>out.push(path(h)));break}
    case 'circle': out.push(path(arcPts(el.cx,el.cy,el.r,-80,292,28)));break;
    case 'dot': out.push(path(arcPts(el.cx,el.cy,3.5,0,380,8),{width:(el.width||12)*m.s}));break;
    case 'rect': out.push(path([[el.x,el.y],[el.x+el.w,el.y],[el.x+el.w,el.y+el.h],[el.x,el.y+el.h]],{closed:true}));break;
    case 'text': {const p=m.pt([el.x,el.y]);out.push({type:'text',x:p[0],y:p[1],text:el.text,color,size:(el.size||40)*m.s,rot:el.rot==null?(rng()-0.5)*2.4:el.rot,bold:!!el.bold});break}
    case 'math': {const p=m.pt([el.x,el.y]);out.push({type:'math',x:p[0],y:p[1],tex:el.tex,color,size:(el.size||40)*m.s,maxW:(el.maxW||0)*m.s,id:el.id||null});break}
    case 'ring': out.push({type:'ring',refs:el.refs,color,pad:(el.pad==null?24:el.pad)*m.s,width:(el.width||4)*m.s});break;
    default: console.warn('HandBoard: unknown element type',el.type);
  }
  if(el.id&&out.length&&out[0].type!=='math')out[0].id=el.id;
  return out;
}

/* ---------- math (MathJax SVG, embedded as paths) ---------- */
function measureMath(el,node){
  const vb=node.getAttribute('viewBox').split(/\s+/).map(Number);
  let s=el.size/1000,wpx=vb[2]*s;
  if(el.maxW&&wpx>el.maxW){s*=el.maxW/wpx;wpx=el.maxW}
  el.mj=node;el.s=s;el.wpx=wpx;el.top=el.y+vb[1]*s;el.hpx=vb[3]*s;
}
function mathFallback(el){
  const t=el.tex.replace(/\\[a-zA-Z]+/g,x=>({'\\theta':'θ','\\cos':'cos','\\sin':'sin','\\qquad':'   ','\\quad':'  '}[x]||'')).replace(/[{}\\_^&]/g,'');
  Object.assign(el,{type:'text',text:t,rot:0,bold:false,size:el.size*0.8});
}
/* MathJax must run through its promise API: extensions such as boldsymbol load on demand and the
   synchronous tex2svg throws while they load. Render every expression once, up front. */
async function renderMathCache(scene){
  const cache={},texs=new Set();
  scene.beats.forEach(b=>(b.draw||[]).forEach(e=>{if(e.type==='math')texs.add(e.tex)}));
  for(const tex of texs){try{cache[tex]=(await window.MathJax.tex2svgPromise(tex,{display:false})).querySelector('svg')}catch(err){console.warn('HandBoard: MathJax failed on',tex,err);cache[tex]=null}}
  return cache;
}
function mathReady(timeoutMs){
  return new Promise(res=>{const t0=Date.now();(function poll(){
    if(window.MathJax&&window.MathJax.startup&&window.MathJax.startup.promise)window.MathJax.startup.promise.then(()=>res(true));
    else if(Date.now()-t0>(timeoutMs||8000))res(false);else setTimeout(poll,80)})()});
}

/* ---------- compile: scene + format + timing -> flat timed items ---------- */
function compile(scene,opts,mathOK){
  const format=opts.format||'wide';const layout=layoutFor(scene,format);
  const rng=mulberry(scene.seed||20261017);
  const style=Object.assign({strokeSpeed:760,charsPerSec:13,breath:0.4,gap:0.07,beatGap:0.5,amp:1.7},scene.style||{});
  const cut=opts.cut&&scene.cuts&&scene.cuts[opts.cut];
  const beatsIn=scene.beats.filter(b=>!cut||cut.includes(b.id)).filter(b=>!b.only||b.only===format);
  const byId={};const items=[];const beats=[];let clock=0;
  for(const src of beatsIn){
    const b={id:src.id,title:src.title||src.id,narration:src.narration||{},camera:src.camera||null,items:[],start:clock};
    const prim=[];
    for(const el of src.draw||[]){
      if(el.only&&el.only!==format)continue;
      const m=mapper(layout,el.region);
      if(!m){console.warn('HandBoard: region',el.region,'has no rect for format',format);continue}
      prim.push(...expand(el,m,rng));
    }
    // measure math first so rings can wrap it
    for(const el of prim){if(el.type==='math'){const node=mathOK&&opts.mathCache&&opts.mathCache[el.tex];if(node)measureMath(el,node);else mathFallback(el)}if(el.id)byId[el.id]=el}
    const flat=[];
    for(const el of prim){
      if(el.type==='ring'){
        let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
        for(const id of el.refs){const r=byId[id];if(!r){console.warn('HandBoard: ring ref missing',id);continue}
          if(r.type==='math'){x0=Math.min(x0,r.x);x1=Math.max(x1,r.x+r.wpx);y0=Math.min(y0,r.top);y1=Math.max(y1,r.top+r.hpx)}
          else if(r.type==='text'){x0=Math.min(x0,r.x);x1=Math.max(x1,r.x+(r.tw||r.text.length*r.size*0.52));y0=Math.min(y0,r.y-r.size);y1=Math.max(y1,r.y+r.size*0.3)}
          else r.pts.forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])})}
        if(x0>x1)continue;
        const cx=(x0+x1)/2,cy=(y0+y1)/2,rx=(x1-x0)/2+el.pad+10,ry=(y1-y0)/2+el.pad;
        const pts=[];for(let i=0;i<=40;i++){const a=(-70+380*i/40)*Math.PI/180;pts.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a)])}
        flat.push({type:'path',pts,color:el.color,width:el.width});
      }else flat.push(el);
    }
    // natural durations
    let natural=0;
    for(const el of flat){
      if(el.type==='path'){el.spts=sketch(rng,el.pts,el.closed,el.amp!=null?el.amp:(el.width<=3?1.2:style.amp));el.len=polyLen(el.spts);el.dur=Math.max(0.16,el.len/style.strokeSpeed)}
      else if(el.type==='math'){el.dur=Math.max(0.5,el.wpx/420)}
      else{el.dur=Math.max(0.3,el.text.length/style.charsPerSec)}
      natural+=el.dur+style.gap;
    }
    // audio-driven timing: beat length comes from the clip, drawing fits inside it
    const audio=opts.timing&&opts.timing.beats&&opts.timing.beats[b.id];
    let beatLen,scale=1;
    if(audio&&audio.dur){beatLen=audio.dur+style.breath;const room=Math.max(0.6,beatLen-0.25);if(natural>room)scale=room/natural;b.audioDur=audio.dur}
    else beatLen=natural+style.beatGap;
    let t=clock;
    for(const el of flat){el.dur*=scale;el.start=t;t+=el.dur+style.gap*scale;el.beat=beats.length;items.push(el);b.items.push(el)}
    b.drawEnd=t;b.end=clock+beatLen;clock=b.end;beats.push(b);
  }
  return {layout,items,beats,total:clock,style};
}

/* ---------- mount ---------- */
let cssInjected=false;
function injectCSS(){
  if(cssInjected)return;cssInjected=true;
  const st=document.createElement('style');
  st.textContent=`.hb-root{position:relative;background:#050506;overflow:hidden}
.hb-root svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.hb-sub{position:absolute;left:0;right:0;bottom:0;height:var(--hb-band,11.1%);box-sizing:border-box;padding:0 4%;background:#0c0c11;border-top:1px solid #26262e;display:grid;place-items:center;color:#f4f4f4;line-height:1.3;font-family:var(--hb-sub-font,var(--hb-hand,Kalam)),Kalam,sans-serif;text-align:center;pointer-events:none;z-index:2;overflow:hidden}
.hb-sub span{opacity:0;transition:opacity .2s}
.hb-sub.show span{opacity:1}
.hb-root[data-nosub] .hb-sub{display:none}`;
  document.head.appendChild(st);
}

async function mount(container,scene,opts){
  opts=Object.assign({format:'wide',lang:(scene.languages||['en'])[0],timing:null,cut:null,font:(scene.style&&scene.style.font)||'Kalam',subtitles:true},opts||{});
  injectCSS();
  const hasMath=scene.beats.some(b=>(b.draw||[]).some(e=>e.type==='math'));
  const mathOK=hasMath?await mathReady(opts.mathTimeout):false;
  const mathCache=mathOK?await renderMathCache(scene):null;
  const c=compile(scene,Object.assign({mathCache},opts),mathOK);
  const {layout,items,beats,total}=c;
  container.classList.add('hb-root');container.dataset.format=opts.format;container.innerHTML='';
  container.style.setProperty('--hb-hand',`"${opts.font}"`);
  const svg=mk('svg',{viewBox:`0 0 ${layout.W} ${layout.H}`,preserveAspectRatio:'xMidYMid meet'});const defs=mk('defs',{});svg.appendChild(defs);
  const views=items.map((el,i)=>{
    const v={el,start:el.start,dur:el.dur,k:-1};
    if(el.type==='path'){v.node=mk('path',{d:toD(el.spts),fill:'none',stroke:el.color,'stroke-width':el.width,'stroke-linecap':'round','stroke-linejoin':'round','stroke-dasharray':(el.len+2).toFixed(1),'stroke-dashoffset':(el.len+2).toFixed(1)});svg.appendChild(v.node)}
    else if(el.type==='math'){
      const id=`hb-clip-${i}`;const cp=mk('clipPath',{id});v.clip=mk('rect',{x:el.x-6,y:el.top-8,width:0,height:el.hpx+16});cp.appendChild(v.clip);defs.appendChild(cp);
      const outer=mk('g',{'clip-path':`url(#${id})`});const inner=mk('g',{transform:`translate(${el.x} ${el.y}) scale(${el.s})`});inner.style.color=el.color;
      [...el.mj.childNodes].forEach(n=>inner.appendChild(n.cloneNode(true)));outer.appendChild(inner);svg.appendChild(outer);v.node=outer;
    }else{
      const id=`hb-clip-${i}`;const cp=mk('clipPath',{id});v.clip=mk('rect',{x:el.x-4,y:el.y-el.size*1.05,width:0,height:el.size*1.4});cp.appendChild(v.clip);defs.appendChild(cp);
      const g=mk('g',{transform:`rotate(${el.rot.toFixed(2)} ${el.x} ${el.y})`});
      v.node=mk('text',{x:el.x,y:el.y,fill:el.color,'font-size':el.size,'font-weight':el.bold?700:400,'clip-path':`url(#${id})`});
      v.node.style.fontFamily=`"${opts.font}", Kalam, cursive`;v.node.textContent=el.text;g.appendChild(v.node);svg.appendChild(g);v.g=g;
    }
    return v;
  });
  container.appendChild(svg);
  const pen=mk('g',{opacity:0});pen.appendChild(mk('circle',{r:14,fill:'rgba(255,255,255,.18)'}));pen.appendChild(mk('circle',{r:5,fill:'#fff'}));svg.appendChild(pen);
  const sub=document.createElement('div');sub.className='hb-sub';const subText=document.createElement('span');sub.appendChild(subText);container.appendChild(sub);
  container.style.setProperty('--hb-band',(layout.band/layout.H*100).toFixed(2)+'%');
  if(!opts.subtitles)container.dataset.nosub='';
  const fitSub=()=>{const bandPx=container.clientHeight*layout.band/layout.H;sub.style.fontSize=(bandPx*(opts.format==='tall'?0.2:0.3)).toFixed(1)+'px'};
  fitSub();if(window.ResizeObserver)new ResizeObserver(fitSub).observe(container);
  const measureText=()=>views.forEach(v=>{if(v.el.type==='text'){try{v.el.tw=v.node.getComputedTextLength()}catch(e){v.el.tw=v.el.text.length*v.el.size*0.52}}});
  measureText();

  // camera boxes per beat (deterministic in t)
  const full=[0,0,layout.W,layout.H];
  const fitBox=b=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    b.items.forEach(el=>{if(el.type==='path')el.spts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])});
      else if(el.type==='math'){x0=Math.min(x0,el.x);y0=Math.min(y0,el.top);x1=Math.max(x1,el.x+el.wpx);y1=Math.max(y1,el.top+el.hpx)}
      else{x0=Math.min(x0,el.x);y0=Math.min(y0,el.y-el.size);x1=Math.max(x1,el.x+(el.tw||el.size*el.text.length*0.5));y1=Math.max(y1,el.y+el.size*0.3)}});
    if(x0>x1)return full;const pad=90;x0-=pad;y0-=pad;x1+=pad;y1+=pad;const ar=layout.W/layout.drawH;
    let w=Math.max(x1-x0,(y1-y0)*ar,layout.W*0.5),h=w/ar;const cx=(x0+x1)/2,cy=(y0+y1)/2;
    const hTotal=h*layout.H/layout.drawH;   // the band covers the bottom of the view, so extend the box down
    return [clamp(cx-w/2,-40,layout.W+40-w),clamp(cy-h/2,-40,layout.drawH+40-h),w,hTotal]};
  let prev=full;beats.forEach(b=>{b.camBox=b.camera==='fit'?fitBox(b):b.camera==='full'?full:prev;b.camFrom=prev;prev=b.camBox});
  const beatAt=t=>{for(let i=beats.length-1;i>=0;i--)if(t>=beats[i].start)return i;return -1};
  const apply=(v,k)=>{if(v.k===k)return;v.k=k;const el=v.el;
    if(el.type==='path')v.node.style.strokeDashoffset=((el.len+2)*(1-k)).toFixed(2);
    else if(el.type==='math')v.clip.setAttribute('width',k<=0?0:(el.wpx*k+10).toFixed(1));
    else v.clip.setAttribute('width',k<=0?0:(el.tw*k+6).toFixed(1))};
  const tipOf=(el,k)=>{if(el.type==='path')return pointAt(el.spts,el.len*k);if(el.type==='math')return [el.x+el.wpx*k,el.y-el.hpx*0.3];
    const a=el.rot*Math.PI/180,d=el.tw*k;return [el.x+Math.cos(a)*d+Math.sin(a)*el.size*0.3,el.y+Math.sin(a)*d-Math.cos(a)*el.size*0.3]};
  let lang=opts.lang,listeners=[];
  function render(t){
    for(const v of views){apply(v,clamp((t-v.start)/v.dur,0,1))}
    const bi=beatAt(t);
    if(opts.subtitles&&bi>=0&&t<total){const n=beats[bi].narration[lang];const text=n?(n.show||n.say||''):'';subText.textContent=text;sub.classList.toggle('show',!!text)}else sub.classList.remove('show');
    let active=null;for(const v of views){if(t>=v.start&&t<v.start+v.dur)active=v}
    if(active&&t<total){const [px,py]=tipOf(active.el,(t-active.start)/active.dur);pen.setAttribute('transform',`translate(${px.toFixed(1)} ${py.toFixed(1)})`);pen.setAttribute('opacity',1)}else pen.setAttribute('opacity',0);
    if(bi>=0){const b=beats[bi];const u=clamp((t-b.start)/0.6,0,1),e=1-Math.pow(1-u,3);const vb=b.camFrom.map((f,i)=>f+(b.camBox[i]-f)*e);svg.setAttribute('viewBox',vb.map(v=>v.toFixed(1)).join(' '))}
    else svg.setAttribute('viewBox',full.join(' '));
    listeners.forEach(fn=>fn(t,bi));
  }
  let t=0,playing=false,speed=1,raf=null,last=0;
  const frame=now=>{if(!playing)return;t=Math.min(total,t+(now-last)/1000*speed);last=now;render(t);if(t>=total){playing=false;listeners.forEach(fn=>fn(t,beatAt(t),true))}else raf=requestAnimationFrame(frame)};
  const api={
    scene,beats,total,layout,format:opts.format,
    play(){if(t>=total)t=0;if(playing)return;playing=true;last=performance.now();raf=requestAnimationFrame(frame)},
    pause(){playing=false;cancelAnimationFrame(raf);listeners.forEach(fn=>fn(t,beatAt(t),true))},
    toggle(){playing?api.pause():api.play()},
    seek(v){t=clamp(v,0,total);render(t)},
    setSpeed(v){speed=v},
    setLang(l){lang=l;render(t)},
    async setFont(f){opts.font=f;container.style.setProperty('--hb-hand',`"${f}"`);try{await document.fonts.load(`40px "${f}"`)}catch(e){}
      views.forEach(v=>{if(v.el.type==='text'){v.node.style.fontFamily=`"${f}", Kalam, cursive`;v.k=-1}});measureText();render(t)},
    onTick(fn){listeners.push(fn)},
    get t(){return t},get playing(){return playing},
    beatAt,
  };
  render(0);
  return api;
}
window.HandBoard={mount,PALETTE,compile};
})();
