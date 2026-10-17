/* Mock engine: no API, no cost. A short beep then silence, as long as the sentence would take to say.
   Use it to check timing, drawing pace and subtitles before paying for real narration. */
import {spawnSync} from 'node:child_process';
export const pauseStyle='dots';
export async function synth({text,outBase}){
  const words=text.replace(/\[pause\]/g,'').trim().split(/\s+/).length;
  const pauses=(text.match(/\[pause\]/g)||[]).length;
  const dur=(words/2.4+pauses*0.6+0.4).toFixed(2);
  const out=outBase+'.wav';
  const r=spawnSync('ffmpeg',['-y','-loglevel','error','-f','lavfi','-i','sine=frequency=660:duration=0.08','-af',`apad=whole_dur=${dur},volume=0.3`,'-ar','48000','-ac','1',out]);
  if(r.status!==0)throw new Error('ffmpeg mock synth failed: '+r.stderr);
  return out;
}
