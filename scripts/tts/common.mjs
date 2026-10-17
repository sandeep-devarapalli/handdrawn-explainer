/* shared helpers for TTS adapters */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

export function pauseMarkup(text,style){
  // "[pause]" in a say line becomes whatever the engine understands
  const map={break:'<break time="0.6s" />',dots:'... ',period:'. '};
  return text.replace(/\s*\[pause\]\s*/g,' '+(map[style]||map.dots)).replace(/\s+/g,' ').trim();
}
export function toWav(inPath,outPath){
  const r=spawnSync('ffmpeg',['-y','-loglevel','error','-i',inPath,'-ar','48000','-ac','1',outPath]);
  if(r.status!==0)throw new Error('ffmpeg failed converting '+inPath+': '+r.stderr);
  return outPath;
}
export function duration(path){
  const r=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path],{encoding:'utf8'});
  if(r.status!==0)throw new Error('ffprobe failed on '+path);
  return parseFloat(r.stdout.trim());
}
export async function fetchOrThrow(url,init,what){
  const res=await fetch(url,init);
  if(!res.ok){const body=await res.text().catch(()=>'');throw new Error(`${what} HTTP ${res.status}: ${body.slice(0,300)}`)}
  return res;
}
export function need(name){const v=process.env[name];if(!v)throw new Error(`Set ${name} in the environment`);return v}
export function write(path,buf){fs.writeFileSync(path,buf);return path}
