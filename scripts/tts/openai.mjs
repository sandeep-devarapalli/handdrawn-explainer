/* OpenAI text-to-speech. Env: OPENAI_API_KEY.
   voice config (scene.voice.engines.openai): { model, voice, speed, instructions } ; "{house}" in instructions expands to scene.voice.house.
   Docs: https://platform.openai.com/docs/guides/text-to-speech (check current model names; gpt-4o-mini-tts accepts instructions). */
import {pauseMarkup,fetchOrThrow,need,write} from './common.mjs';
export const pauseStyle='dots';
export async function synth({text,lang,voice,house,outBase}){
  const key=need('OPENAI_API_KEY');
  const body={model:voice.model||'gpt-4o-mini-tts',voice:voice.voice||'ash',input:pauseMarkup(text,pauseStyle),response_format:'wav'};
  if(voice.instructions)body.instructions=voice.instructions.replace('{house}',house||'');
  if(voice.speed)body.speed=voice.speed;
  const res=await fetchOrThrow('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)},'OpenAI TTS');
  return write(outBase+'.wav',Buffer.from(await res.arrayBuffer()));
}
