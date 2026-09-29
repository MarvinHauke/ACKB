# Taxonomy

`data/taxonomy/` holds one list per tag type (the tag nodes of the graph). Articles reference
terms by `id`; every used term gets a page, e.g. `/component/ca3080`.

| File                 | Tags                                         |
| -------------------- | -------------------------------------------- |
| `manufacturers.json` | Korg, Moog, …                                |
| `products.json`      | MS-20, … (needs `manufacturer`)              |
| `modules.json`       | Filter, VCA, FX › Delay & Reverb, … (keep small) |
| `subcircuits.json`   | OTA stage, voltage follower, …               |
| `functions.json`     | Soft clipping, resonance control, …          |
| `components.json`    | Components & ICs: LM13700, vactrol, … (needs `category`) |
| `authors.json`       | Jürgen Haible, N8 Synthesizers, … (`url`)    |

Every term has `id` and `label`; optional `aliases` (searchable: "buffer" finds Voltage
Follower), `description`, `parent` (one level only) and `group` (sidebar group, required for
subcircuits and functions).

## Which list does a tag belong to?

Quick test: *one box in the block diagram?* → module · *can I circle, name and simulate it?* →
subcircuit · *noticeable at the outputs or controls?* → function · *a specific part you'd buy?* → component.

- **Module** (`modules.json`, field `modules`): the job of a whole module or voice, one
  box in a synth's signal-flow diagram (VCO, VCF, VCA, envelope, LFO, sequencer, power supply, …).
  It usually is one Eurorack module or one section of a service manual. General topics (history,
  Fourier) may have none.
  FX has subtypes via `parent` (Delay & Reverb; Chorus, Flanger & Phaser; Distortion &
  Waveshaping; Dynamics; Ring Mod, Shifter & Vocoder). An article lists `fx` and its subtype, and
  the sidebar shows them like a manufacturer with its products.
- **Subcircuit**: a recognizable building block inside a module, a few parts with a known
  topology you can circle in the schematic and name ("that's a Sallen-Key"). Defined by how it's
  built, not by the module it sits in; it can usually be simulated on its own in LTspice.
  PDF_OCR detects this level.
- **Function**: a behavior you notice at the module's outputs or controls without knowing the
  parts: by ear (soft clipping, resonance), by eye (LED meter, scope trace), at the controls (tap
  tempo) or in a spec (1 V/oct, 24 dB/oct, tempco). One function can come from many subcircuits.
- **Component** ("Components & ICs"): a specific part you'd buy, with a part number or a distinct
  device type: ICs (LM13700, TL072) and special parts such as vactrols, optocouplers, tape heads or
  matched pairs. Generic resistors and capacitors are not listed. Grouped in the sidebar by
  `category` (optical and magnetic parts have their own groups).

A look-alike pair stays when both sides pass their test (wavefolder = the circuit, wavefolding =
the sound).

## Content kinds

`kinds` on an article says what it's useful for (one or more). It isn't a tag list; it drives the
"Resource" filter.

| Kind          | Use it when …                                                                  |
| ------------- | ------------------------------------------------------------------------------ |
| `build-guide` | you can build along: steps, parts list, layout or a finished project to copy   |
| `explanation` | it explains how and why a circuit works                                        |
| `analysis`    | it works with maths, measurements or simulation                                |
| `schematic`   | it's mainly circuit diagrams with little text                                  |
| `reference`   | it's consulted rather than studied: datasheets, application notes, service manuals, calculators, textbooks, tool documentation |

A build video that explains every step is `build-guide` and `explanation`. `reference` says how
you use it, `type` says what it is (a `datasheet` is usually `reference`, but not every
`reference` is a datasheet). Whole general-electronics sites don't become articles; they belong on
the Reference Shelf (roadmap 3.7).

## Groups

Group ids and their labels are listed in `TERM_GROUPS` in `src/lib/types.ts`.

- Subcircuits (by how they're built): op-amp stages, transistor & OTA stages, filter topologies,
  passive networks, shaping & dynamics, oscillator & signal sources, time/memory & switching,
  digital & interface, power.
- Functions (by where you notice them): filter response, distortion & shaping, pitch & oscillator,
  sound generation, modulation & control, effects & dynamics, levels & utility.
- Components & ICs (from `category`): OTAs & VCAs, filter & oscillator chips, op-amps &
  transistor arrays, delay & noise, logic & digital, optical, magnetic, power & other. Empty
  groups stay hidden until a term in them is used.

## Adding a term

Add it to the right file before using it in an article, with a `group` for subcircuits and
functions (`npm run validate` warns otherwise). Prefer an alias over a near-duplicate term.

## Ids, paths and labels

- **Ids are kebab-case** everywhere (`opamp-stage`, `soft-clipping`, `ms-20`, `juergen-haible`);
  the schemas reject anything else.
- **Subtypes live under their parent** (one level): the path is `parent/id`, used in pages
  (`/module/fx/delay`, `/subcircuit/opamp-stage/voltage-follower`), filter URLs
  (`?module=fx/delay`) and lookup files (`data/module/fx/delay.json`). Ids stay unique per list.
- **Labels are Title Case** ("Soft Clipping", "Delay & Reverb"); names of products, ICs and people
  keep their own spelling.
- **PDF_OCR**: subcircuits it detects carry its snake_case name in `pdfOcrKind`
  (`voltage_follower`); `data/index.json` maps those names to ACKB paths (`pdfOcrKinds`).
