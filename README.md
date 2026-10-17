# handdrawn-explainer

Hand-drawn whiteboard explainer videos, from a scene file.

Black board, marker colours, handwriting, equations typeset in LaTeX, a pen that draws every stroke while the narration explains it. One scene file produces the preview page, the 16:9 lesson, the 9:16 Short, and the subtitles, in every language the narration is written in. The look is the Khan Academy / "Engineering Simplified" whiteboard lecture; the point is that a lesson is written as beats of narration plus what gets drawn, and everything else is automatic.

It ships as a skill for Claude (Claude Code, claude.ai) and OpenAI Codex, and also works as a plain command-line tool.

## What you get from one `scene.json`

- `preview.html`: a self-contained page with play, scrub, speed, format, language and handwriting-font controls. Review it in a browser or publish it.
- `lesson_wide_en.mp4` (1920×1080) and `lesson_tall_en_short.mp4` (1080×1920): H.264, narrated, subtitles in a dedicated band inside the frame.
- `.srt` captions and a thumbnail PNG of the finished board.

Narration is text-to-speech. Each beat lasts exactly as long as its sentence; the drawing paces itself to fit. Engines: OpenAI, ElevenLabs, Sarvam (Indian languages), and a free `mock` engine for checking timing before spending API credits. Languages in the examples: English and Hindi, with Kannada, Telugu and Tamil declared and ready for script lines.

## Quick start

```bash
git clone https://github.com/sandeep-devarapalli/handdrawn-explainer
cd handdrawn-explainer
npm run example          # mock narration + build; needs Node 18+ and ffmpeg
open examples/fk-two-link/build/preview.html
```

Real narration and video:

```bash
cp .env.example .env     # add OPENAI_API_KEY (or ElevenLabs / Sarvam)
set -a; source .env; set +a
npm i && npx playwright install chromium

node scripts/narrate.mjs examples/fk-two-link/scene.json --lang en --engine openai
node scripts/build.mjs   examples/fk-two-link/scene.json
node scripts/render.mjs  examples/fk-two-link/build/preview.html --format wide --lang en
node scripts/render.mjs  examples/fk-two-link/build/preview.html --format tall --lang en --cut short-fk
```

Outputs land in `examples/fk-two-link/build/out/`.

## Writing a lesson

A scene is a list of beats. Each beat has narration per language (`say` for the engine, with symbols spelled out; `show` for the subtitle) and a `draw` list: paths, arrows, arcs, dots, handwriting `text`, typeset `math`, and `ring` highlights around results. Elements live in named regions, and each region is placed once per format, so the same drawing lays out for 16:9 and 9:16.

```json
{ "id": "add-them-up", "title": "Add them up",
  "narration": { "en": { "say": "The gripper is just the two links added together. [pause] This pair of equations is forward kinematics.",
                         "show": "The gripper is just the two links added together. This pair of equations is forward kinematics." } },
  "draw": [
    { "type": "math", "region": "math", "x": 0, "y": 280, "tex": "x = l_1\\cos\\theta_1 + l_2\\cos(\\theta_1{+}\\theta_2)", "color": "white", "size": 40, "id": "fk1" },
    { "type": "ring", "refs": ["fk1"], "color": "coral" },
    { "type": "text", "region": "math", "x": 370, "y": 425, "text": "Forward Kinematics", "color": "coral", "size": 38 }
  ] }
```

Read, in this order: [`references/style.md`](references/style.md) (the look, how to write beats, the narration house style, language rules), [`references/scene-format.md`](references/scene-format.md) (every field), [`references/pipeline.md`](references/pipeline.md) (commands, review checklist, troubleshooting). Then copy [`examples/fk-two-link/scene.json`](examples/fk-two-link/scene.json).

Rules the examples follow and the skill enforces: words and sketches by hand, symbols and equations typeset; every equation follows from something already on the board and the narration names the step; one colour per job; narration drives timing, never the other way round.

## Examples

| Lesson | Formats | Languages | What it shows |
|---|---|---|---|
| `fk-two-link` | wide, tall | en, hi | A derivation: two-link arm forward kinematics through to the Jacobian. Three regions, rings, a Short cut. |
| `coordinate-transforms` | wide, tall | en, hi | Nine beats rebuilt from lecture screenshots: why frames, the rotation matrix, homogeneous transforms, an RPR chain. |
| `what-we-cover` | wide | en | A mostly handwritten intro board, no math. |

Live previews, rebuilt on every push by the included GitHub Actions workflow: https://sandeep-devarapalli.github.io/handdrawn-explainer/

## Using it as a skill

The repo is a skill folder: `SKILL.md` is the entry point, `references/` is read on demand, `scripts/` and `runtime/` are used as-is.

- **Claude Code**: `git clone` into `~/.claude/skills/handdrawn-explainer` (or a project's `.claude/skills/`). Then: "make a whiteboard explainer for how a PID controller works" and Claude follows the workflow in `SKILL.md`.
- **Codex**: clone into `~/.codex/skills/handdrawn-explainer` (check your version's skills directory).
- **claude.ai**: zip the folder and upload it as a skill, or paste `SKILL.md` into a project's instructions. Build and narrate run there; video rendering needs a local browser, so the skill hands you the render command.

## How it works

`runtime/board.js` compiles a scene into a flat list of timed primitives: each stroke is resampled with a seeded hand wobble, each equation is rendered once by MathJax to SVG paths, each text is measured. Playback is a pure function of time: strokes reveal via dash offset, text and math wipe in via clip rectangles, a pen marker rides the tip of whatever is being drawn, the camera (optional) interpolates the viewBox per beat, and the subtitle band shows the current beat's `show` line. Because every frame is `seek(t)`, `render.mjs` drives the same page frame by frame in headless Chromium and pipes PNGs into ffmpeg, so the video is exactly what the preview shows.

`narrate.mjs` turns each beat's `say` line into a clip (cached by content hash), measures it with ffprobe, and writes `timing.<lang>.json`; `build.mjs` inlines that into the page, and the compiler fits each beat's drawing into its clip length plus a breath.

## Status

- Runtime, build and narration are tested. Rendering uses Playwright and ffmpeg; its ffmpeg stages are tested, the Chromium capture loop less so. Please open an issue with the console output if it misbehaves on your machine.
- The TTS adapters follow each vendor's API at the time of writing; voice names and limits change, so check their docs if a request is rejected.
- Hindi narration in the examples is romanised in `say` (reads better on OpenAI and ElevenLabs) and in Devanagari in `show`. For Sarvam, native script in `say` is preferred.

## Credits

The style, the robotics content and the worked examples are inspired by the [Robotics 101](https://www.youtube.com/watch?v=K_xIJBlbjg4) series by Engineering Simplified; the example lessons retrace material from that course for learning purposes and are not affiliated with it. Handwriting is [Kalam](https://fonts.google.com/specimen/Kalam) (SIL OFL), subtitle fonts for Indian languages are Noto Sans (SIL OFL), equations are set by [MathJax](https://www.mathjax.org) (Apache 2.0), loaded from cdnjs.

## License

MIT. See [LICENSE](LICENSE).
