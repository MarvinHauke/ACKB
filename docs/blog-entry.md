# Blog entry: ACKB on irregular-instruments.com

Notes for the article introducing ACKB. Not published; a checklist for writing it.

## Introduction (draft)

While building the ER-808, finding good information turned out to be one of the hard parts. The knowledge exists: service manuals, schematics, build logs, lecture videos, forum threads and deep-dive articles by people who have taken these circuits apart for decades.
But it is scattered over personal websites, old homepages, YouTube channels and forums, often without a search function and with no way to see how one resource relates to another. Or not easy to find via google because of http:// vs https:// restriction. Every question ("which Diode can be used as replacement for the SANYO 1S188FM?", "Where do i get a fitting Power-Supply?") meant starting the search from scratch.

Years back I stumbled over a simple but astonishingly useful site:

el-component.com/ -> https://www.el-component.com/diodes/1n60a

which is a Graph based database just from routes and subroutes for passive and often used electronic components.

ACKB grew out of that: a place that collects the good resources once, tags them, and links straight to the original.

## Points to mention

- **What ACKB is:** a curated index of links on synthesizer circuits (articles, schematics,
  videos, papers, repos), analog and digital. It links to the originals and copies nothing.
- **Why it exists:** the ER-808 search problem. The knowledge is scattered, hard to search and
  unconnected.
- **How to find things:**
  - search box
  - filters by instrument (maker › product), module (VCO, filter, FX › delay, …), subcircuit,
    function, IC, author and kind of resource (build guide, explanation, analysis, schematic)
- **Link-out first:** every result opens the original resource directly. ACKB is the map, not the
  destination.
- **Connected knowledge:** every tag has its own page, e.g. `/component/ca3080` shows similar parts
  (LM13700, LM13600), what it is often used with (OTA stage, VCA) and all articles about it. The
  data is a small knowledge graph.
- **Credit to the authors:** name the people whose work is linked, e.g. Tom Wiltshire (Electric
  Druid), René Schmitz, Jürgen Haible (legacy site, now Random\*Source), Moritz Klein, Aaron
  Lanterman (Georgia Tech), N8 Synth, Andrew Kilpatrick (Dintree).
- **Trust and upkeep:**
  - Every link has a confidence level (official, academic, community).
  - Links are checked weekly, and broken ones point to an archived copy.
- **Hide what you don't want:** forum threads or plain-http sites can be hidden. There's a
  warning never to enter personal data on http sites.
- **Open data:** everything is downloadable (`kb.jsonl`, `graph.json`, one JSON file per tag).
  This is useful for tools and AI, and the planned link to PDF_OCR (schematic recognition →
  matching ACKB pages).
- **What's next:**
  - more sources (Synth DIY Wiki resource list)
  - an instrument list
  - Max/MSP and DSP resources
- **Take part:**
  - Suggest resources.
  - If your page is listed and you'd rather it wasn't, write to info@irregular-instruments.com.
- **Link:** irregular-instruments.com/ackb. Use the live numbers from the site (articles and
  authors) rather than fixed ones in the text.
