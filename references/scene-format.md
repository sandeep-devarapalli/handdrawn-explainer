# Scene format (v1)

One JSON file per lesson. Drawings are shared across formats and languages; narration is per language; layout is per format. `examples/fk-two-link/scene.json` is the complete reference example (both formats, math, rings, a Shorts cut, five languages declared).

## Top level

```json
{
  "version": 1,
  "id": "fk-two-link",                 // slug, used for output file names
  "title": "...",                      // page title, YouTube title draft
  "languages": ["en", "hi", "kn", "te", "ta"],   // first one is primary
  "style": { "font": "Kalam", "breath": 0.4, "strokeSpeed": 760, "charsPerSec": 13 },
  "voice": { "house": "...", "engines": { "openai": {...}, "elevenlabs": {...}, "sarvam": {...} } },
  "formats": { "wide": [1600, 900], "tall": [900, 1600] },
  "regions": { "<name>": { "ref": [w, h], "wide": [x, y, w, h], "tall": [x, y, w, h] } },
  "cuts": { "<cut-id>": ["beat-id", "beat-id"] },
  "seed": 20261017,                    // optional, changes the wobble
  "beats": [ ... ]
}
```

`formats` lists the board sizes you will render. Leave `tall` out for a wide-only lesson. Board units are abstract; the renderer maps wide to 1920×1080 and tall to 1080×1920.

**Subtitle band.** The bottom of every frame is a reserved strip for subtitles: 100 units in wide (y 800 to 900), 160 in tall (y 1440 to 1600). Override with `style.subtitleBand` (a number, or `{ "wide": 100, "tall": 160 }`). Nothing is drawn there; regions must end above it. The headless check in SKILL.md step 4 reports anything that crosses into it.

## Regions: how one drawing fits two formats

Every element is authored in a region's own coordinate space, sized by `ref: [w, h]`. For each format, the region is placed in a rectangle `[x, y, w, h]` on the board. The runtime scales the region uniformly to fit the rectangle (`min(w/ref.w, h/ref.h)`) and centres it. Font sizes, stroke widths and math sizes scale with it.

So you lay out the content once per region, and lay out the regions once per format. Typical splits:

- Wide: sketch on the left, equations on the right, a footnote strip along the bottom.
- Tall: sketch on top, equations below, footnote strip at the bottom, ending above the subtitle band.

Rules of thumb:
- 2 to 4 regions per lesson. One region for everything makes Shorts unreadable (uniform scale of 0.56).
- Give the sketch region a `ref` close to its actual content box so it does not scale down needlessly.
- An element with no `region` uses raw board coordinates (wide only). Avoid it when `tall` exists.
- `only: "wide"` or `only: "tall"` on an element or a beat drops it from the other format (for a label that only fits wide, or a beat that is too long for Shorts).

## Beats

```json
{
  "id": "add-them-up",
  "title": "Add them up",
  "camera": null,                      // null | "fit" (zoom to this beat's drawing) | "full"
  "only": null,                        // null | "wide" | "tall"
  "narration": {
    "en": { "say": "...", "show": "..." },
    "hi": { "say": "...", "show": "..." },
    "kn": null
  },
  "draw": [ ...elements... ]
}
```

`say` is what the TTS engine reads: symbols spelled out ("theta one", "ell two", "s one two"), `[pause]` for a beat of silence, numbers written as words when they are tricky. `show` is the subtitle and SRT text: symbols as symbols, no `[pause]`. If `show` is missing, `say` is used. A language set to `null` means not written yet; narrate.mjs skips it and build.mjs still lists the language.

Timing: when `build/timing.<lang>.json` exists (from narrate.mjs), each beat lasts `clip duration + style.breath`, and the drawing is compressed to fit if it would overrun (it never stretches; if the clip is longer than the drawing, the board holds). Without timing, beats are stroke-driven: a natural drawing pace plus `style.beatGap`.

## Elements

All coordinates are in the element's region space. Colours are palette names (`blue coral teal yellow pink purple white grey`) or hex.

| type | fields | notes |
|---|---|---|
| `path` | `pts: [[x,y],...]`, `color`, `width` (5), `closed` | the basic hand stroke; corners are sharp, the wobble is added at compile time |
| `arrow` | `pts`, `color`, `width`, `head` (16) | a path plus a two-stroke head at the last point |
| `arc` | `cx, cy, r, a0, a1` (degrees, screen y down so negative is counterclockwise), `arrow`, `color`, `width` | angle marks, curved arrows |
| `circle` | `cx, cy, r`, `color`, `width` | hand-circled, slightly overlapping ends |
| `dot` | `cx, cy`, `color`, `width` (12) | a joint marker |
| `rect` | `x, y, w, h`, `color`, `width` | boxes, panels |
| `text` | `x, y` (baseline left), `text`, `color`, `size` (40), `rot` (random ±1.2° if omitted), `bold` | handwriting. Words only. Never put symbols or equations here |
| `math` | `x, y` (baseline left), `tex`, `color`, `size` (40), `maxW`, `id` | typeset with MathJax. Use for every symbol, even a lone `\theta_1`. `maxW` scales the expression down if it would be wider |
| `ring` | `refs: [ids]`, `color`, `pad` (24), `width` (4) | a hand-drawn ellipse around one or more elements already drawn (math or text with an `id`). Refs not on the board (e.g. in a beat left out of a cut) are skipped |

Element order inside `draw` is drawing order. Put the thing before its label, the arrow before the word it points at.

## Cuts (Shorts)

`cuts` names subsets of beats by id. `render.mjs --cut short-fk --format tall` renders only those beats, in scene order, with their own narration clips, so a Short is a free by-product of the full lesson as long as the chosen beats stand on their own. Write the first and last beat of a cut so that they do: a question, and a takeaway.

## Sizes that read well

Wide board 1600×900 rendered at 1920×1080:
- handwriting 36 to 46; math 34 to 40 for main results, 26 to 30 for labels in the sketch
- stroke width 5 for drawing, 6 to 7 for the main object, 2 to 3 for construction lines
- leave 90 units of margin; the bottom 100 units are the subtitle band

Tall board 900×1600 rendered at 1080×1920:
- same sizes in region space; check that regions scale to at least 0.85, or bump sizes in that region
- the bottom 160 units are the subtitle band; keep `show` lines under ~120 characters or they wrap past three lines
