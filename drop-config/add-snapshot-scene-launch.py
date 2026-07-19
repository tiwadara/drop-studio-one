#!/usr/bin/env python3
"""Add "launch a Studio One scene" to Drop snapshots.

A Drop snapshot has its own output slots that fire *when the snapshot is
recalled* (the format spec: a snapshot entry carries "up to 8 output slots,
identical in shape to a control slot"). We use slot "0" to emit a Note On that
the Studio One device maps to a Launcher scene (see the `SceneSectionElement`
in Drop.surface.xml, wired to ch16 notes 111/115/119/123).

Mapping rule (default): each snapshot launches the scene at its own *row*
(the last digit of the snapshot id `<bank><col><row>`), so row 0 -> scene 1,
row 1 -> scene 2, ... Rows beyond the number of scene notes wrap around.
Change SCENE_NOTES / the row rule below to taste.

Re-run this on your own exported config whenever you replace the example
snapshots in the Drop editor.

Usage:
    python3 add-snapshot-scene-launch.py INPUT.json [-o OUTPUT.json]
    # no -o  -> edits INPUT.json in place
"""
import argparse
import collections
import json
import sys

# Scene-launch notes, indexed by snapshot row. These MUST match the
# sceneLaunch[...] controls in Drop.surface.xml.
SCENE_NOTES = [111, 115, 119, 123]   # scene 1..4
SCENE_CHANNEL = 16                    # ch16 = the Drop's DAW-mode button channel
VELOCITY_MAXOUT = 16383              # scales to note velocity 127

SLOT_KEY = "0"                       # snapshot output slot we manage


def scene_note_for_snapshot(snap_id: str) -> int:
    """Default rule: map the snapshot's row (last id digit) to a scene note."""
    row = int(snap_id[-1])
    return SCENE_NOTES[row % len(SCENE_NOTES)]


def make_slot(note: int) -> "collections.OrderedDict":
    return collections.OrderedDict([
        ("inUse", 1),
        ("target", 0),
        ("msgType", 2),          # 2 = Note On
        ("ch", SCENE_CHANNEL),
        ("csvRef", 0),
        ("msgNr", float(note)),
        ("maxOut", VELOCITY_MAXOUT),
        ("minOut", 0),
        ("curveId", 0),
    ])


def patch_snapshot(entry: "collections.OrderedDict", note: int) -> None:
    """Insert/replace output slot '0' so it sits before the 'data' object,
    matching the format's slots-before-data ordering."""
    slot = make_slot(note)
    rebuilt = collections.OrderedDict()
    inserted = False
    for key, value in entry.items():
        if key == "data" and not inserted:
            rebuilt[SLOT_KEY] = slot
            inserted = True
        if key == SLOT_KEY:
            continue  # drop any existing managed slot; we re-add it in order
        rebuilt[key] = value
    if not inserted:                       # no 'data' key -> append at end
        rebuilt[SLOT_KEY] = slot
    entry.clear()
    entry.update(rebuilt)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", help="Drop config .json")
    ap.add_argument("-o", "--output", help="write here instead of in place")
    args = ap.parse_args()

    with open(args.input) as fh:
        cfg = json.loads(fh.read(), object_pairs_hook=collections.OrderedDict)

    snapshots = cfg.get("map", {}).get("snp", {})
    if not snapshots:
        print("No snapshots (map.snp) found — nothing to do.", file=sys.stderr)
        return 1

    for snap_id, entry in snapshots.items():
        note = scene_note_for_snapshot(snap_id)
        patch_snapshot(entry, note)
        scene = SCENE_NOTES.index(note) + 1
        print(f"  {snap_id} ({entry.get('name','?')}) -> scene {scene} (note {note})")

    out_path = args.output or args.input
    with open(out_path, "w") as fh:
        fh.write(json.dumps(cfg, indent=1, ensure_ascii=False))
        fh.write("\n")
    print(f"Patched {len(snapshots)} snapshot(s) -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
