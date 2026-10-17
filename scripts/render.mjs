#!/usr/bin/env node
/* render.mjs: preview.html -> MP4 (+ SRT + thumbnail PNG) using headless Chromium and ffmpeg.
   usage: node render.mjs <build/preview.html> --format wide|tall --lang en [--cut id] [--fps 30] [--out build/out] [--name file-stem]
   needs: npm i playwright && npx playwright install chromium ; ffmpeg on PATH ; timing.<lang>.json + audio from narrate.mjs in the same build dir
   The page is driven frame by frame through window.board.seek(t), so output is deterministic. */
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const args=process.argv.slice(2);
const opt=(k,d)=>{const i=args.indexOf(k);return i>=0?args[i+1]:d};
const page_=args.find(a=>!a.startsWith('--')&&a.endsWith('.html'));
if(!page_){console.error('usage: node render.mjs build/preview.html --format wide --lang en [--cut id] [--fps 30] [--out dir]');process.exit(1)}
const format=opt('--format','wide'),lang=opt('--lang','en'),cut=opt('--cut',null),fps=+opt('--fps','30');
const buildDir=path.dirname(path.resolve(page_));
const outDir=opt('--out',path.join(buildDir,'out'));
fs.mkdirSync(outDir,{recursive:true});
const stem=opt('--name',[path.basename(buildDir)==='build'?path.basename(path.dirname(buildDir)):'lesson',format,lang,cut].filter(Boolean).join('_'));
const size=format==='tall'?{width:1080,height:1920}:{width:1920,height:1080};

let chromium;
try{({chromium}=await import('playwright'))}catch(e){console.error('playwright not installed: npm i playwright && npx playwright install chromium');process.exit(1)}
const browser=await chromium.launch();
const page=await browser.newPage({viewport:size,deviceScaleFactor:1});
const url='file://'+path.resolve(page_)+`?render=1&format=${format}&lang=${lang}`+(cut?`&cut=${cut}`:'');
await page.goto(url);
await page.waitForFunction(()=>window.boardReady===true,null,{timeout:60000});
await page.evaluate(()=>document.fonts.ready);
const info=await page.evaluate(lang=>({total:board.total,beats:board.beats.map(b=>({id:b.id,start:b.start,end:b.end,audioDur:b.audioDur||0,show:(b.narration[lang]||{}).show}))}),lang);
const timingPath=path.join(buildDir,`timing.${lang}.json`);
const timing=fs.existsSync(timingPath)?JSON.parse(fs.readFileSync(timingPath,'utf8')):null;
if(!timing)console.warn('no timing file for',lang,'- rendering with stroke-driven timing and no narration track');
const nFrames=Math.ceil(info.total*fps)+1;
console.log(`rendering ${stem}: ${size.width}x${size.height} @${fps}fps, ${info.total.toFixed(1)} s, ${nFrames} frames`);

/* audio track: each beat's clip padded to the beat's slot, then concatenated */
let audioPath=null;
if(timing){
  const tmp=path.join(outDir,'.tmp_'+stem);fs.mkdirSync(tmp,{recursive:true});
  const list=[];
  info.beats.forEach((b,i)=>{
    const slot=(b.end-b.start).toFixed(3);const seg=path.join(tmp,`seg${i}.wav`);const t=timing.beats[b.id];
    const r=t?spawnSync('ffmpeg',['-y','-loglevel','error','-i',path.join(buildDir,t.audio),'-ar','48000','-ac','1','-af',`apad=whole_dur=${slot},atrim=0:${slot}`,seg])
            :spawnSync('ffmpeg',['-y','-loglevel','error','-f','lavfi','-i','anullsrc=r=48000:cl=mono','-t',slot,seg]);
    if(r.status!==0)throw new Error('ffmpeg audio segment failed: '+r.stderr);
    list.push(`file '${seg.replace(/'/g,"'\\''")}'`);
  });
  fs.writeFileSync(path.join(tmp,'list.txt'),list.join('\n'));
  audioPath=path.join(tmp,'narration.wav');
  const r=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',path.join(tmp,'list.txt'),'-c','copy',audioPath]);
  if(r.status!==0)throw new Error('ffmpeg concat failed: '+r.stderr);
}

/* video: pipe PNG frames straight into ffmpeg */
const mp4=path.join(outDir,stem+'.mp4');
const ffArgs=['-y','-loglevel','error','-framerate',String(fps),'-f','image2pipe','-vcodec','png','-i','-'];
if(audioPath)ffArgs.push('-i',audioPath);
ffArgs.push('-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','medium','-movflags','+faststart');
if(audioPath)ffArgs.push('-c:a','aac','-b:a','160k','-shortest');
ffArgs.push(mp4);
const ff=spawn('ffmpeg',ffArgs,{stdio:['pipe','inherit','inherit']});
const writeFrame=buf=>new Promise(res=>{if(!ff.stdin.write(buf))ff.stdin.once('drain',res);else res()});
const t0=Date.now();
for(let i=0;i<nFrames;i++){
  const t=Math.min(info.total,i/fps);
  await page.evaluate(t=>board.seek(t),t);
  await writeFrame(await page.screenshot({type:'png'}));
  if(i%(fps*5)===0)process.stdout.write(`\r  frame ${i}/${nFrames} (${((Date.now()-t0)/1000).toFixed(0)} s)`);
}
ff.stdin.end();
await new Promise((res,rej)=>ff.on('close',c=>c===0?res():rej(new Error('ffmpeg exited '+c))));
console.log(`\n  video: ${mp4}`);

/* thumbnail: the finished board, no subtitle */
await page.evaluate(t=>board.seek(t),info.total);
await page.screenshot({path:path.join(outDir,stem+'_thumb.png'),type:'png'});

/* captions */
const srtTime=s=>{const ms=Math.round(s*1000);const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),sec=Math.floor(ms%60000/1000),r=ms%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(r).padStart(3,'0')}`};
const srt=info.beats.filter(b=>b.show).map((b,i)=>`${i+1}\n${srtTime(b.start)} --> ${srtTime(b.audioDur?b.start+b.audioDur:b.end)}\n${b.show}\n`).join('\n');
fs.writeFileSync(path.join(outDir,stem+'.srt'),srt);
console.log(`  captions: ${path.join(outDir,stem+'.srt')}\n  thumbnail: ${path.join(outDir,stem+'_thumb.png')}`);
await browser.close();
