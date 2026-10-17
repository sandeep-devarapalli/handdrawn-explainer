# Style: the look, the beats, the voice

## The look

A black board, marker colours, handwriting, and the drawing appearing stroke by stroke under a visible pen while someone talks. The reference is the Khan Academy and "Engineering Simplified" whiteboard lecture style. Warm, a bit messy, never clip-art.

- Background is black (`#050506`). Never a gradient, never a grid.
- Palette, by job: `blue` for the question or title, `coral` for structure (arrows, branches, rings, asides), `yellow` for the physical object, `pink` for angles and parameters, `teal` for construction lines and intermediate results, `purple` for shorthand and advanced material, `white` for the main result and plain labels. One colour per job within a lesson; the viewer learns the code without being told.
- Hand vs typeset: words and sketches by hand, symbols and equations typeset. A lone `θ₁` in the sketch is a `math` element, not text. "Forward Kinematics" as an aside is `text`. Never type a formula into a `text` element and never typeset a sentence.
- Everything that appears is drawn, in order, left to right or in reading order, the way a person would draw it. The object first, then its labels; the arrow, then the word it points to.
- One aside per lesson that is purely human: a joke, a "they are scary", a stick figure. It is the part people remember.
- Rings and underlines are the only emphasis. No bold colour fills, no glow, no boxes with drop shadows.

## Writing beats

A beat is one idea, one chunk of drawing, one chunk of narration, 8 to 20 seconds spoken. Write the narration first, then decide what gets drawn while it is said. If a sentence has nothing to draw, cut the sentence or merge it.

Shape of a lesson, 6 to 9 beats, 60 to 150 seconds:
1. The question. Draw the thing and ask the question the lesson answers.
2. to 5. The build. Each beat adds one construction and one line of result. Intermediate results in teal, the final result in white with a coral ring.
6. The compression. The shorthand, the vector form, the one-function view.
7. The extension. One step beyond: differentiate, invert, generalise. Purple.
8. The takeaway. Say in one sentence what the viewer can now do.
Optional: the aside.

Derivations: every equation on the board must follow from something already on the board, and the narration must say the step ("drop a line down", "add the two", "differentiate"). No equation appears from nowhere. Keep notation consistent with the course the lesson belongs to (if there are course notes, use their symbols).

## Narration house style

The standard for every course, regardless of engine or language:

- Warm, unhurried US accent that an Indian listener finds easy. Short sentences. One idea per sentence.
- Say what is being drawn while it is being drawn. "Drop a line down to the x axis" as the teal line appears.
- Symbols are spoken in full in `say`: "theta one", "ell two", "s one two", "x dot". Equations are read as a teacher would, left to right: "x equals ell one cos theta one, plus ell two cos of theta one plus theta two."
- `[pause]` before the sentence that states a result, and before "The question".
- Numbers: "two-link", "ninety degrees", not digits, unless the digit is on the board.
- No filler: no "basically", "so yeah", "as you can see". No hype.
- Never an em dash in `say` or `show`; commas, colons and full stops only.

The `voice.house` string in the scene is this standard in one paragraph; each engine's config maps it onto the engine's own controls (OpenAI `instructions`, ElevenLabs stability and style, Sarvam speaker and pace). Keep the same voice per engine across all lessons of a course.

## Languages

English is primary and is written first. Hindi, Kannada, Telugu and Tamil narration is a translation of `say` written the way an Indian classroom sounds: technical terms stay in English (link, gripper, forward kinematics, Jacobian, differentiate), everyday words go native. The board stays the same; only `narration` changes.

- `show` lines carry the native script (Devanagari, Kannada, Telugu, Tamil). build.mjs loads a Noto Sans font for each declared language for subtitles.
- `say` lines for Sarvam go in native script; for OpenAI and ElevenLabs, romanised (Hinglish) usually sounds better. Keep whichever the chosen engine reads best; the example scene uses romanised `say` for Hindi.
- Keep per-language `say` within ±20% of the English length so beat timings stay similar across languages.

## Things to avoid

- Drawing a realistic robot. Links and joints, nothing more.
- Putting a full paragraph on the board. The board holds at most one sentence of prose per beat.
- Rings around everything. One per result.
- Equations wider than the region (`maxW` is a safety net, not a layout tool).
- Beats longer than 25 seconds: split them.
