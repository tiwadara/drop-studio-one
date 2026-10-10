#!/usr/bin/env python3
"""Validate the Drop config and the Studio One device against each other.

Stdlib only. Run from anywhere: python3 scripts/validate.py [--strict]
Prints every problem found and exits non-zero on errors (and, with --strict,
on warnings too).

Checks:
  1. drop-config/daw-init-studioone.json parses; docs/ copy is byte-identical.
  2. Drop.device and Drop.surface.xml parse; files referenced by Drop.device exist.
  3. Surface control names are unique; every control referenced in <Mappings>
     (with <foreach> expanded) is declared in <Controls>.
  4. No two receiving surface controls listen to the same MIDI message.
  5. Every CC/note control the surface receives on channels 1-8 is sent by the
     Drop config, and no MIDI message is sent by two different kinds of Drop
     control (e.g. a push that would also toggle a mute). Drop controls whose
     message no surface control receives (they do nothing in Studio One) are
     reported as warnings.
  6. Relative links in README.md and docs/index.html point to existing files.
"""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEVICE_DIR = ROOT / "studio-one" / "Neuzeit" / "Drop"
CONFIG = ROOT / "drop-config" / "daw-init-studioone.json"
DOCS_CONFIG = ROOT / "docs" / "daw-init-studioone.json"

# Drop config msgType -> MIDI status nibble. 2 = note, 3 = CC, 7 = 14-bit CC (MSB is a CC).
DROP_MSG_TYPES = {2: 0x90, 3: 0xB0, 7: 0xB0}
DROP_SECTIONS = ("fader", "mute", "rotary", "rotbut")

errors: list[str] = []
warnings: list[str] = []


def error(msg: str) -> None:
    errors.append(msg)


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    value = value.strip()
    if value.startswith("#"):
        return int(value[1:], 16)
    return int(value)


def load_config() -> dict | None:
    try:
        config = json.loads(CONFIG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        error(f"{rel(CONFIG)}: {exc}")
        return None
    if DOCS_CONFIG.exists() and DOCS_CONFIG.read_bytes() != CONFIG.read_bytes():
        error(f"{rel(DOCS_CONFIG)} differs from {rel(CONFIG)}; keep the download copy in sync")
    return config


def parse_xml(path: Path) -> ET.Element | None:
    try:
        return ET.parse(path).getroot()
    except (OSError, ET.ParseError) as exc:
        error(f"{rel(path)}: {exc}")
        return None


def check_device_manifest() -> None:
    device = parse_xml(DEVICE_DIR / "Drop.device")
    if device is None:
        return
    for attr in ("classFile", "surfaceFile", "scriptFile", "imageFile", "textFile"):
        name = device.get(attr)
        if name and not (DEVICE_DIR / name).is_file():
            error(f"Drop.device: {attr}={name!r} does not exist")


def expand(template: str, var: str, count: int) -> list[str]:
    return [template.replace(var, str(i)) for i in range(count)]


def mapping_refs(node: ET.Element, bindings: list[dict[str, int]]) -> set[str]:
    """Collect control="..." references under node, expanding nested <foreach>."""
    refs: set[str] = set()
    if node.tag == "foreach":
        var, count = node.get("variable", ""), int(node.get("count", "0"))
        bindings = [{**b, var: i} for b in bindings for i in range(count)]
    control = node.get("control")
    if control:
        for b in bindings:
            name = control
            for var, i in b.items():
                name = name.replace(var, str(i))
            refs.add(name)
    for child in node:
        refs |= mapping_refs(child, bindings)
    return refs


def check_surface() -> dict[tuple[int, int, int], str]:
    """Validate the surface; return {(status, channel, number): control} for receiving controls."""
    receivers: dict[tuple[int, int, int], str] = {}
    surface = parse_xml(DEVICE_DIR / "Drop.surface.xml")
    if surface is None:
        return receivers

    controls = surface.find("Controls")
    if controls is None:
        error("Drop.surface.xml: missing <Controls>")
        return receivers

    names: set[str] = set()
    for ctl in controls.iter("Control"):
        name = ctl.get("name", "")
        if not name:
            error("Drop.surface.xml: <Control> without a name")
            continue
        if name in names:
            error(f"Drop.surface.xml: duplicate control name {name!r}")
        names.add(name)
        if "receive" not in (ctl.get("options") or "").split():
            continue
        for msg in ctl.iter("MidiMessage"):
            status = msg.get("status", "")
            if not status.startswith("#"):
                continue  # symbolic statuses such as NoteTrigger use the device's own defaults
            try:
                key = (
                    parse_int(status) & 0xF0,  # type: ignore[operator]
                    (parse_int(msg.get("channel")) or 0) & 0x0F,
                    parse_int(msg.get("address")) or 0,
                )
            except ValueError:
                error(f"Drop.surface.xml: {name}: unparseable MidiMessage {msg.attrib}")
                continue
            if key in receivers:
                error(
                    f"Drop.surface.xml: {name} and {receivers[key]} both receive "
                    f"status #{key[0]:02X} channel {key[1] + 1} number {key[2]}"
                )
            else:
                receivers[key] = name

    mappings = surface.find("Mappings")
    if mappings is not None:
        for ref in sorted(mapping_refs(mappings, [{}])):
            if ref not in names:
                error(f"Drop.surface.xml: <Mappings> references undeclared control {ref!r}")
    return receivers


def check_config_vs_surface(config: dict, receivers: dict[tuple[int, int, int], str]) -> None:
    sent: dict[tuple[int, int, int], str] = {}
    mapping = config.get("map", {})
    for section in DROP_SECTIONS:
        entries = mapping.get(section)
        if not isinstance(entries, dict) or not entries:
            error(f"{rel(CONFIG)}: map.{section} is missing or empty")
            continue
        for key, entry in entries.items():
            slot = entry.get("0") if isinstance(entry, dict) else None
            if not isinstance(slot, dict) or not slot.get("inUse"):
                continue
            label = f"map.{section}.{key} ({entry.get('name', '?')})"
            status = DROP_MSG_TYPES.get(slot.get("msgType"))
            if status is None:
                error(f"{rel(CONFIG)}: {label}: unexpected msgType {slot.get('msgType')!r}")
                continue
            ch, nr = slot.get("ch"), slot.get("msgNr")
            if not isinstance(ch, int) or not 1 <= ch <= 16 or nr is None or not 0 <= nr <= 127:
                error(f"{rel(CONFIG)}: {label}: invalid channel {ch!r} / number {nr!r}")
                continue
            msg = (status, ch - 1, int(nr))
            kind = "note" if status == 0x90 else "CC"
            other = sent.setdefault(msg, section)
            if other != section:
                error(
                    f"{rel(CONFIG)}: {label} sends {kind} {int(nr)} on channel {ch}, "
                    f"which map.{other} also sends"
                )
            if msg not in receivers:
                warnings.append(
                    f"{rel(CONFIG)}: {label} sends {kind} {int(nr)} on channel {ch}, "
                    "but no Drop.surface.xml control receives it"
                )

    for msg, name in sorted(receivers.items()):
        status, ch, nr = msg
        if status in (0x90, 0xB0) and ch < 8 and msg not in sent:
            kind = "note" if status == 0x90 else "CC"
            error(
                f"Drop.surface.xml: {name} receives {kind} {nr} on channel {ch + 1}, "
                f"which {rel(CONFIG)} never sends"
            )


LINK_PATTERNS = {
    ROOT / "README.md": re.compile(r"\]\(([^)\s]+)\)"),
    ROOT / "docs" / "index.html": re.compile(r'(?:href|src)="([^"]+)"'),
}


def check_links() -> None:
    for doc, pattern in LINK_PATTERNS.items():
        if not doc.exists():
            continue
        for target in pattern.findall(doc.read_text(encoding="utf-8")):
            if re.match(r"^(https?:|mailto:|data:|#)", target) or target.startswith("../../"):
                continue  # external, anchors, and GitHub-relative (issues/…) links
            path = (doc.parent / target.split("#", 1)[0]).resolve()
            if not path.exists():
                error(f"{rel(doc)}: broken link {target!r}")


def main() -> int:
    config = load_config()
    check_device_manifest()
    receivers = check_surface()
    if config is not None:
        check_config_vs_surface(config, receivers)
    check_links()

    for msg in warnings:
        print(f"WARNING: {msg}")
    for msg in errors:
        print(f"ERROR: {msg}")
    if errors or (warnings and "--strict" in sys.argv[1:]):
        print(f"\n{len(errors)} error(s), {len(warnings)} warning(s).")
        return 1
    if warnings:
        print(f"\n{len(warnings)} warning(s); run with --strict to fail on them.")
    print(f"OK: no errors ({len(receivers)} receiving surface controls checked).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
