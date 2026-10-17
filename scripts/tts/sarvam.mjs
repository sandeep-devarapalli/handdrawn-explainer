/* Sarvam AI text-to-speech (Indian languages). Env: SARVAM_API_KEY.
   voice config: { model, speaker, pace }. Language codes follow Sarvam's style (hi-IN, kn-IN, te-IN, ta-IN, en-IN).
   Docs: https://docs.sarvam.ai (verify endpoint, speaker names and the per-request text limit; split long beats if needed). */
import {pauseMarkup,fetchOrThrow,need,write} from './common.mjs';
export const pauseStyle='period';
const langCode={en:'en-IN',hi:'hi-IN',kn:'kn-IN',te:'te-IN',ta:'ta-IN',mr:'mr-IN',bn:'bn-IN'};
export async function synth({text,lang,voice,outBase}){
  const key=need('SARVAM_API_KEY');
  const body={text:pauseMarkup(text,pauseStyle),target_language_code:langCode[lang]||'en-IN',speaker:voice.speaker||'anushka',
    model:voice.model||'bulbul:v2',pace:voice.pace??0.95,speech_sample_rate:22050};
  const res=await fetchOrThrow('https://api.sarvam.ai/text-to-speech',{method:'POST',headers:{'api-subscription-key':key,'Content-Type':'application/json'},body:JSON.stringify(body)},'Sarvam TTS');
  const json=await res.json();
  const b64=(json.audios&&json.audios[0])||json.audio;
  if(!b64)throw new Error('Sarvam returned no audio: '+JSON.stringify(json).slice(0,200));
  return write(outBase+'.wav',Buffer.from(b64,'base64'));
}
