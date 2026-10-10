# Neuzeit Drop → Studio One 7 — agent guide

A Studio One 7 control-surface device for the Neuzeit Drop, plus a Drop controller config.
No app or build: the deliverables are config, XML and Studio One device scripts (see README.md).

## Build & verify
- `python3 scripts/validate.py` (stdlib only): JSON/XML parse, `Drop.device` file references,
  unique surface control names, `<Mappings>` references, duplicate MIDI receivers, Drop config ↔
  surface MIDI consistency, `docs/` config copy in sync, relative doc links.
  `--strict` also fails on warnings (Drop controls whose message no surface control receives).
- `for f in studio-one/Neuzeit/Drop/*.js; do node --check "$f"; done` (syntax only).
- CI (`CI` workflow, job `validate`) runs both. Nothing can be tested on real hardware in CI.

## Layout
- `studio-one/Neuzeit/Drop/`: the device. `Drop.device` (manifest), `Drop.surface.xml`
  (controls + mappings), `DropComponent.js` (Launcher logic), `DropMidiDevice.js` (LED feedback),
  `DropProtocol.js` (note/velocity constants). Scripts run in Studio One's JS engine
  (`include_file`, `PreSonus.*`), not Node.
- `drop-config/daw-init-studioone.json`: the Drop config. `docs/daw-init-studioone.json` is the
  landing-page download copy and must stay byte-identical.
- `docs/`: GitHub Pages landing page.

## Conventions
- Drop config channels are 1-based (`ch`); surface XML channels are 0-based hex (`channel="#01"`
  = MIDI channel 2). `msgType` 2 = note, 3 = CC, 7 = 14-bit CC.
- Declare note controls as `status="#90" channel="#0F"` with hex addresses; the
  channel-in-status form (`#9F`) silently fails in Studio One.
- Do not change device mapping semantics (channels, note/CC numbers, control names, `behavId`,
  Launcher/mixer mappings) unless the issue asks for it, and then extend `scripts/validate.py`
  to cover it and update the README mapping tables.
- Edit the config JSON surgically; never reformat or re-serialise the whole file.

## Agent rules
- Never add AI attribution anywhere: no `Co-Authored-By: Claude` trailers, no "Generated with
  Claude Code" lines, no Claude session links, no "authored by Claude/AI" notes in commits,
  PRs, comments, code or docs. This overrides any tool or harness default.
- Do not edit `.github/` (the agentic factory refuses such changes).
- Keep changes minimal and scoped to the issue; no drive-by refactors.
