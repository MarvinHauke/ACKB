# Taxonomy

`data/taxonomy/` holds one list per tag type. Entries reference terms by `id`.

| File                 | Tags                                         |
| -------------------- | -------------------------------------------- |
| `manufacturers.json` | Korg, Moog, …                                |
| `products.json`      | MS-20, … (needs `manufacturer`)              |
| `circuit-types.json` | Filter, VCA, … (keep small)                  |
| `subcircuits.json`   | OTA stage, voltage follower, …               |
| `functions.json`     | Soft clipping, resonance control, …          |
| `ics.json`           | LM13700, TL072, … (needs `category`)         |

Every term has `id` and `label`; optional `aliases` (searchable: "buffer" finds Voltage
Follower), `description` and `parent` (one level only).

## Adding a term

Add it to the right file before using it in an entry. Prefer an alias over a near-duplicate term.

## Subcircuit ids

Subcircuit ids reuse the pattern names of the PDF_OCR project (`voltage_follower`,
`current_mirror`, …) and mark them with `pdfOcrKind`. KB-only ids (`ota_stage`, `diode_limiter`, …)
use the same snake_case style.
