/* ElevenLabs text-to-speech. Env: ELEVENLABS_API_KEY.
   voice config: { voice_id, model_id, stability, similarity_boost, style, send_language_code }.
   Docs: https://elevenlabs.io/docs/api-reference/text-to-speech (multilingual v2 handles hi/kn/te/ta). */
import {pauseMarkup,fetchOrThrow,need,write} from './common.mjs';
export const pauseStyle='break';
const langCode={en:'en',hi:'hi',kn:'kn',te:'te',ta:'ta'};
export async function synth({text,lang,voice,outBase}){
  const key=need('ELEVENLABS_API_KEY');
  if(!voice.voice_id||voice.voice_id==='SET_ME')throw new Error('Set scene.voice.engines.elevenlabs.voice_id');
  const body={text:pauseMarkup(text,pauseStyle),model_id:voice.model_id||'eleven_multilingual_v2',
    voice_settings:{stability:voice.stability??0.55,similarity_boost:voice.similarity_boost??0.75,style:voice.style??0.2}};
  if(langCode[lang]&&voice.send_language_code)body.language_code=langCode[lang];
  const res=await fetchOrThrow(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`,
    {method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(body)},'ElevenLabs TTS');
  return write(outBase+'.mp3',Buffer.from(await res.arrayBuffer()));
}
