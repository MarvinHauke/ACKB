# Taxonomy

`data/taxonomy/` holds one list per tag type (the tag nodes of the graph). Articles reference
terms by `id`; every used term gets a page, e.g. `/ic/ca3080`.

| File                 | Tags                                         |
| -------------------- | -------------------------------------------- |
| `manufacturers.json` | Korg, Moog, …                                |
| `products.json`      | MS-20, … (needs `manufacturer`)              |
| `modules.json`       | Filter, VCA, FX › Delay & Reverb, … (keep small) |
| `subcircuits.json`   | OTA stage, voltage follower, …               |
| `functions.json`     | Soft clipping, resonance control, …          |
| `ics.json`           | LM13700, TL072, … (needs `category`)         |
| `authors.json`       | Jürgen Haible, N8 Synthesizers, … (`url`)    |

Every term has `id` and `label`; optional `aliases` (searchable: "buffer" finds Voltage
Follower), `description`, `parent` (one level only) and `group` (sidebar group, required for
subcircuits and functions).

## Which list does a tag belong to?

Quick test: *one box in the block diagram?* → module · *can I circle, name and simulate it?* →
subcircuit · *noticeable at the outputs or controls?* → function · *has a part number?* → IC.

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
- **IC**: the concrete chip (LM13700, TL072). Grouped in the sidebar by its `category`.

A look-alike pair stays when both sides pass their test (wavefolder = the circuit, wavefolding =
the sound).

## Groups

Group ids and their labels are listed in `TERM_GROUPS` in `src/lib/types.ts`.

- Subcircuits (by how they're built): op-amp stages, transistor & OTA stages, filter topologies,
  passive networks, shaping & dynamics, oscillator & signal sources, time/memory & switching,
  digital & interface, power.
- Functions (by where you notice them): filter response, distortion & shaping, pitch & oscillator,
  sound generation, modulation & control, effects & dynamics, levels & utility.
- ICs: OTAs & VCAs, filter & oscillator chips, op-amps & transistor arrays, delay & noise,
  logic & digital, power & other (from `category`).

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
