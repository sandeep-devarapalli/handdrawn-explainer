# Contributing

Three kinds of contribution are welcome:

- **Lessons**: a new `examples/<id>/scene.json`. Follow `references/scene-format.md` and `references/style.md`. Both formats, English narration at minimum, every symbol typeset. Run `npm run build examples/<id>/scene.json` and check the preview in both formats before opening a PR.
- **TTS engines**: one file in `scripts/tts/` exporting `synth({text, lang, voice, house, outBase})` (writes an audio file, returns its path) and `pauseStyle` (`dots`, `break` or `period`). Document the voice config keys at the top of the file.
- **Runtime**: `runtime/board.js` has no dependencies and must stay deterministic in time (every frame is a pure function of `t`), because the renderer seeks frame by frame. New element types go in `expand()` and in `references/scene-format.md` in the same PR.

Before a PR: `npm run check`, and `npm run site` must build every example without warnings about regions or rings.

Style for text that appears on a board or in narration: no em dashes; commas, colons, parentheses and full stops.
