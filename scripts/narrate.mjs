#!/usr/bin/env node
/* narrate.mjs: synthesise one narration clip per beat and write the timing file the board uses.
   usage: node narrate.mjs <scene.json> --lang en --engine openai|elevenlabs|sarvam|mock [--out build/] [--force]
   writes: <out>/audio/<lang>/<beat-id>.wav and <out>/timing.<lang>.json ; clips are cached in <out>/cache by content hash. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {toWav,duration} from './tts/common.mjs';

const args=process.argv.slice(2);
const opt=(k,d)=>{const i=args.indexOf(k);return i>=0?args[i+1]:d};
const scenePath=args.find(a=>!a.startsWith('--')&&a.endsWith('.json'));
if(!scenePath){console.error('usage: node narrate.mjs scene.json --lang en --engine openai|elevenlabs|sarvam|mock [--out dir] [--force]');process.exit(1)}
const scene=JSON.parse(fs.readFileSync(scenePath,'utf8'));
const lang=opt('--lang',(scene.languages||['en'])[0]);
const engineName=opt('--engine','mock');
const out=opt('--out',path.join(path.dirname(scenePath),'build'));
const force=args.includes('--force');
const here=path.dirname(fileURLToPath(import.meta.url));
const engine=await import(path.join(here,'tts',engineName+'.mjs'));
const voice=(scene.voice&&scene.voice.engines&&scene.voice.engines[engineName])||{};
const house=scene.voice&&scene.voice.house;
fs.mkdirSync(path.join(out,'cache'),{recursive:true});
fs.mkdirSync(path.join(out,'audio',lang),{recursive:true});
const timing={lang,engine:engineName,generated:new Date().toISOString(),beats:{}};
let made=0,cached=0,skipped=0;
for(const b of scene.beats){
  const n=b.narration&&b.narration[lang];
  const text=n&&(n.say||n.show);
  if(!text){skipped++;continue}
  const hash=crypto.createHash('sha1').update(JSON.stringify({engineName,voice,house,lang,text})).digest('hex').slice(0,16);
  const cachedWav=path.join(out,'cache',hash+'.wav');
  if(!fs.existsSync(cachedWav)||force){
    process.stdout.write(`  ${b.id}: synthesising (${engineName}, ${lang})... `);
    const raw=await engine.synth({text,lang,voice,house,outBase:path.join(out,'cache',hash+'.raw')});
    toWav(raw,cachedWav);fs.unlinkSync(raw);
    console.log('ok');made++;
  }else cached++;
  const dest=path.join(out,'audio',lang,b.id+'.wav');
  fs.copyFileSync(cachedWav,dest);
  timing.beats[b.id]={dur:+duration(dest).toFixed(3),audio:path.relative(out,dest),say:text,show:n.show||text};
}
fs.writeFileSync(path.join(out,`timing.${lang}.json`),JSON.stringify(timing,null,2));
const total=Object.values(timing.beats).reduce((s,b)=>s+b.dur,0);
console.log(`timing.${lang}.json written: ${Object.keys(timing.beats).length} beats, ${total.toFixed(1)} s of speech (${made} new, ${cached} cached, ${skipped} beats without ${lang} narration)`);
