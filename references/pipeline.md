# Pipeline: from scene.json to MP4

```
scene.json ──build.mjs──▶ build/preview.html   (review in a browser, or publish as an artifact)
scene.json ──narrate.mjs─▶ build/audio/<lang>/*.wav + build/timing.<lang>.json
build/preview.html + timing ──render.mjs──▶ build/out/<id>_<format>_<lang>[_cut].mp4 + .srt + _thumb.png
```

Lesson folder layout:

```
lessons/fk-two-link/
  scene.json
  build/
    preview.html
    cache/            # TTS clips by content hash (keep; saves API calls)
    audio/en/*.wav
    timing.en.json
    out/              # final videos, captions, thumbnails
```

## Requirements

- Node 18+ (fetch built in). ffmpeg and ffprobe on PATH.
- For rendering video: `npm i playwright && npx playwright install chromium` (once, anywhere on the machine; run from the folder that has node_modules, or install globally).
- API keys as environment variables: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `SARVAM_API_KEY`. Only the engine you use needs its key.
- Fonts and MathJax come from Google Fonts and cdnjs at page load. Rendering needs network access, or pass `--mathjax path/to/tex-svg.js` to build.mjs and install the fonts locally.

## Commands

```bash
S=scripts   # path to this skill's scripts folder

node $S/build.mjs lessons/fk-two-link/scene.json              # preview, stroke-timed
node $S/narrate.mjs lessons/fk-two-link/scene.json --lang en --engine mock     # free timing check
node $S/narrate.mjs lessons/fk-two-link/scene.json --lang en --engine openai   # real narration
node $S/build.mjs lessons/fk-two-link/scene.json              # rebuild: now audio-timed
node $S/render.mjs lessons/fk-two-link/build/preview.html --format wide --lang en
node $S/render.mjs lessons/fk-two-link/build/preview.html --format tall --lang en --cut short-fk
```

narrate.mjs only calls the API for beats whose text or voice settings changed (content hash cache). `--force` resynthesises everything. The clips are plain WAVs in `build/audio/<lang>/<beat-id>.wav`, so you can listen to any one directly.

After narrate, `build.mjs` makes a preview that plays the narration in sync with the drawing (Narration checkbox under the board). It references the clips by relative path, so open `build/preview.html` from where it is. To share or publish a single file with sound, build with `--inline-audio` (clips become mp3 data URIs, roughly 0.5 MB per minute).

render.mjs drives the page frame by frame (`window.board.seek(t)`), so output is deterministic and the preview is exactly what ships. 30 fps, H.264, CRF 18, AAC 160k. A 100-second lesson takes a few minutes to render.

## Where things run

- Claude Code or Codex on a Mac/Linux machine: everything above works. Build, then open `build/preview.html` in a browser to review.
- claude.ai (sandbox, no browser): build and narrate work (the mock engine always; real engines if the sandbox has network to the API). Publish `build/preview.html` as an artifact for review. Rendering needs Chromium, so hand the render command to the user to run locally, or finish the job in Claude Code.

## Review checklist before rendering

1. Play the preview at 1× with the language set. Does every sentence have something being drawn while it is said?
2. Scrub to the end: is the finished board readable as a still? That image is the thumbnail.
3. Switch to `tall`: nothing clipped, nothing drawn inside the subtitle band, text at least as large as on a phone screen in portrait, no subtitle longer than three lines.
4. Check every `math` element: no fallback handwriting (MathJax failed to load) and nothing wider than its region.
5. Check the cut: do its first and last beats stand on their own?
6. Timing note under the board says "from narration audio". If it says stroke-driven, narrate first.

## Troubleshooting

- Equations show as handwriting: MathJax did not load within 8 s. Check network, or use `--mathjax` with a local copy of `tex-svg.js` (MathJax 3.2.2, `es5/tex-svg.js`).
- `ring ref missing`: the ring refers to an element in a beat not in the current cut. Harmless; the ring is skipped.
- A beat's drawing finishes long before the clip ends: that is by design (the board holds). If it looks dead, add a construction line or a label to that beat, or split the sentence into two beats.
- Drawing is rushed: the clip is shorter than the natural drawing time, so the drawing was compressed. Say more in that beat or draw less.
- ElevenLabs returns 4xx: `voice_id` is still `SET_ME`, or the model does not accept `language_code` (set `send_language_code: false`).
- Sarvam errors: check the speaker name against their current list and the per-request text limit; split long beats.
- Subtitles in the wrong font for Hindi/Kannada/Telugu/Tamil: the language must be listed in `scene.languages` so build.mjs loads the Noto font.
