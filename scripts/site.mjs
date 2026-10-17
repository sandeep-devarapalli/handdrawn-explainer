#!/usr/bin/env node
/* site.mjs: build every example (mock narration for timing) into ./site with an index page, for GitHub Pages. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const run=(args)=>{const r=spawnSync('node',args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status)};
fs.rmSync('site',{recursive:true,force:true});fs.mkdirSync('site',{recursive:true});
const rows=[];
for(const ex of fs.readdirSync('examples')){
  const scenePath=path.join('examples',ex,'scene.json');if(!fs.existsSync(scenePath))continue;
  const scene=JSON.parse(fs.readFileSync(scenePath,'utf8'));
  const out=path.join('site',ex);fs.mkdirSync(out,{recursive:true});
  for(const lang of scene.languages||['en'])run(['scripts/narrate.mjs',scenePath,'--lang',lang,'--engine','mock','--out',out]);
  run(['scripts/build.mjs',scenePath,'--out',path.join(out,'index.html'),'--timing',out]);
  fs.rmSync(path.join(out,'cache'),{recursive:true,force:true});fs.rmSync(path.join(out,'audio'),{recursive:true,force:true});
  rows.push(`<li><a href="${ex}/">${scene.title||ex}</a> <small>(${Object.keys(scene.formats).join(', ')}; ${(scene.languages||['en']).join(', ')})</small></li>`);
}
fs.writeFileSync('site/index.html',`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>handdrawn-explainer examples</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.5;color:#1d1c1a;background:#f3f1ea}a{color:#c4502f}</style></head>
<body><h1>handdrawn-explainer</h1><p>Example lessons built from their scene files. Timing uses the mock narration engine (silence), so each beat holds for about as long as its sentence would take to say.</p><ul>${rows.join('')}</ul>
<p><a href="https://github.com/sandeep-devarapalli/handdrawn-explainer">Source on GitHub</a></p></body></html>`);
console.log('site/ ready:',rows.length,'examples');
