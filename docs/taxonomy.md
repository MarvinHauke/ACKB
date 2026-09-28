# Taxonomy

`data/taxonomy/` holds one list per tag type. Entries reference terms by `id`.

| File                 | Tags                                         |
| -------------------- | -------------------------------------------- |
| `manufacturers.json` | Korg, Moog, …                                |
| `products.json`      | MS-20, … (needs `manufacturer`)              |
| `circuit-types.json` | Modules: Filter, VCA, … (keep small)         |
| `subcircuits.json`   | OTA stage, voltage follower, …               |
| `functions.json`     | Soft clipping, resonance control, …          |
| `ics.json`           | LM13700, TL072, … (needs `category`)         |

Every term has `id` and `label`; optional `aliases` (searchable: "buffer" finds Voltage
Follower), `description`, `parent` (one level only) and `group` (sidebar group, required for
subcircuits and functions).

## Which list does a tag belong to?

Quick test: *one box in the block diagram?* → module · *can I circle, name and simulate it?* →
subcircuit · *noticeable at the outputs or controls?* → function · *has a part number?* → IC.

- **Module** (`circuit-types.json`, shown as "Module"): the job of a whole module or voice, one
  box in a synth's signal-flow diagram (VCO, VCF, VCA, envelope, LFO, sequencer, power supply, …).
  It usually is one Eurorack module or one section of a service manual. General topics (history,
  Fourier) may have none.
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

Add it to the right file before using it in an entry, with a `group` for subcircuits and
functions (`npm run validate` warns otherwise). Prefer an alias over a near-duplicate term.

## Subcircuit ids

Subcircuit ids reuse the pattern names of the PDF_OCR project (`voltage_follower`,
`current_mirror`, …) and mark them with `pdfOcrKind`. KB-only ids (`ota_stage`, `diode_limiter`, …)
use the same snake_case style.
