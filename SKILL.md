---
name: handdrawn-explainer
description: Make hand-drawn whiteboard explainer videos (Khan Academy / Engineering Simplified style) for course lessons, YouTube and Shorts. A scene file describes beats of narration plus what gets drawn; the runtime animates wobbly marker strokes, handwriting and typeset LaTeX equations under a visible pen, with subtitles; narrate.mjs makes TTS audio (OpenAI, ElevenLabs, Sarvam) in English, Hindi, Kannada, Telugu or Tamil and times the beats from it; render.mjs produces MP4 + SRT + thumbnail in 16:9 and 9:16. Use this whenever the user wants an explainer video, a whiteboard animation, a derivation walked through on a board, a narrated lesson, a Short, or says "animate this explanation", "draw it out", "make a video for this concept", even if they do not say "hand-drawn". For precise interactive isometric figures without narration, prefer anima-stem instead.
---

# Hand-drawn explainer

Turns a concept into a narrated whiteboard video: black board, marker colours, handwriting, equations typeset in LaTeX, a pen that draws every stroke while the narration explains it. One scene file produces the preview page, the 16:9 lesson, the 9:16 Short, and the subtitles, in every language the narration is written in.

The scene is the product. Everything else is a script. Spend the effort on the beats.

## Files

- `runtime/board.js`: the engine. Scene in, animated SVG board out. Deterministic in time.
- `scripts/build.mjs`: scene.json to a self-contained preview/render page.
- `scripts/narrate.mjs` + `scripts/tts/*.mjs`: narration clips and beat timing. Engines: `openai`, `elevenlabs`, `sarvam`, `mock` (free, for timing checks).
- `scripts/render.mjs`: headless Chromium + ffmpeg to MP4, SRT, thumbnail.
- `references/scene-format.md`: the file format. Read before writing a scene.
- `references/style.md`: the look, beat writing, narration house style, language rules. Read before writing a scene.
- `references/pipeline.md`: install, commands, review checklist, troubleshooting. Read when building or rendering.
- `examples/fk-two-link/scene.json`: full reference lesson (two formats, math, rings, a Short cut, Hindi). Copy it as the template.
- `examples/what-we-cover/scene.json`: a wide-only, mostly handwriting intro board.
- `examples/coordinate-transforms/scene.json`: a nine-beat lecture rebuilt from lecture screenshots (four regions, heavy math, a Short cut).

## Workflow

1. **Pin the brief in one exchange.** Topic and the exact question the lesson answers; audience level; target length (60 to 150 s for a lesson, under 60 s for a Short); languages wanted now; which TTS engine; whether course notes fix the notation. Ask one question at a time if the user prefers that; otherwise one short message. Do not start drawing before the question is pinned.

2. **Write the beats first, as narration.** 6 to 9 beats, each one idea, 8 to 20 seconds spoken, in the house voice (`references/style.md`). Show them to the user as a plain list: title, `say` line, and one line on what will be drawn. Get a yes before touching coordinates. This is the cheap place to change the lesson.

3. **Author the scene.** Copy `examples/fk-two-link/scene.json`. Decide the regions (2 to 4) and place them for both formats. Write `draw` per beat in region coordinates following `references/scene-format.md`: object first, labels after; words and sketches as `text` and `path`, every symbol and equation as `math`; one coral `ring` on the main result. Keep each equation inside its region (`maxW` is a safety net) and every region above the subtitle band (bottom 100 units wide, 160 tall).

4. **Build and review.** `node scripts/build.mjs <scene.json>`. In claude.ai, publish `build/preview.html` as an artifact; in Claude Code or Codex, open it in the browser. Walk the review checklist in `references/pipeline.md` (wide, tall, every math element, the cut). Fix the scene, rebuild, repeat. Also check the compile headlessly if no browser is at hand: `node -e` with the runtime's `compile` reports items outside the board.

5. **Narrate.** First `--engine mock` to see the audio-driven pacing for free; then the real engine for the primary language: `node scripts/narrate.mjs <scene.json> --lang en --engine openai`. Rebuild. Listen to two clips; fix `say` lines that the engine mispronounces (spell symbols out, add `[pause]`). Other languages later, same command with `--lang hi` etc., once their `say` and `show` lines are written.

6. **Render.** `node scripts/render.mjs build/preview.html --format wide --lang en`, then `--format tall --cut <short-id>` for the Short. Needs Chromium (Playwright) and ffmpeg; if the current environment has no browser, hand the exact commands to the user. Deliver: MP4, SRT, thumbnail PNG, and the scene file (it is the editable source).

## Non-negotiables

- Narration drives timing. Never pad a beat with drawing to fill silence; cut the silence by saying something about what is drawn.
- Words and sketches by hand; symbols and equations typeset. No formula ever goes in a `text` element.
- Every equation follows from something already on the board, and the narration names the step.
- One palette, one job per colour, one ring per result, one human aside per lesson.
- Shorts are a cut of the lesson, laid out through regions, not a separate drawing.
- No em dashes anywhere in narration, subtitles or the board.
- Same voice settings for every lesson in a course; the house voice paragraph lives in the scene and maps to each engine.

## Updating this skill

The runtime is one file with no dependencies; bugs and new element types go there and in `references/scene-format.md` together. New TTS engines are one adapter file in `scripts/tts/` exporting `synth({text, lang, voice, house, outBase})` and `pauseStyle`.
