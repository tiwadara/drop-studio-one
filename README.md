# Neuzeit Drop → Studio One 7

An unofficial [PreSonus Studio One](https://www.presonus.com/products/studio-one) control-surface integration for the [Neuzeit Instruments **Drop**](https://www.neuzeit-instruments.com/Drop), plus a Drop config that exposes the controls Studio One needs.

It turns the Drop into a **Launcher + mixer surface**:

- **4×4 pad grid → clip launch** (each pad fires one Launcher clip), with LED colour/state feedback
- **8 faders → channel volume**
- **32 encoders → 3 sends per channel** (top encoder row left free)
- **8 mute buttons → channel mute**
- **32 encoder pushes → freely assignable** momentary buttons (via Control Link)
- **Session arrows → move the Launcher focus box**, plus a **Stop-All** button
- **Snapshots → launch any Launcher scene** (Drop Program Change → scene N)

> Not affiliated with or endorsed by Neuzeit Instruments or PreSonus. Community project, use at your own risk.

---

## Repository layout

```
studio-one/Neuzeit/Drop/     ← the Studio One control-surface device
  Drop.device                  device manifest (JS control surface)
  Drop.surface.xml             control + mapping definitions
  DropComponent.js             launcher (PadSection) logic
  DropMidiDevice.js            LED feedback (velocity-encoded)
  DropProtocol.js              note / velocity constants
  Drop.svg  Drop.txt           placeholder image + description
drop-config/
  daw-init-studioone.json      Drop config prepared for this integration
```

---

## How the Drop config (`daw-init-studioone.json`) behaves

A working Drop DAW config, set up for the Studio One surface. Import it into the Drop (back up your own config first). It carries example state (fader/rotary positions, snapshots) — overwrite that with your own once loaded.

| Control | What it sends |
|--------|----------------|
| **Faders** | 14-bit CC, ch 1/3/5/7 — 8 layers A–H (Layer A = CC 44–51 ch1 … reach 64 channels) |
| **Encoders (32/layer)** | CC on ch 1/3/5/7 (`ROT A-x` = CC x) |
| **Encoder pushes** | **Notes on ch 2** (push note = its encoder's CC number, e.g. PUSH A-7-1 = note 8) |
| **Mute buttons** | ch 2 notes, **`behavId 3` (latching toggle)** — press stays, LED tracks state |
| **Grid / nav / stop-all** | Drop's built-in DAW-mode notes on **channel 16** |

Key points:
- **Mutes use `behavId 3`** (latching), so they hold their state and light correctly. `behavId 4` is momentary (won't stay) — that was the bug.
- **Encoder pushes** are set per-taste: `behavId 3` = latching, `behavId 4` = temporary/momentary. Set the ones you use in the Drop editor.
- **Notes 6 and 32 are skipped** in the encoder/push numbering (reserved MIDI controllers).
- The grid / nav / stop-all use channel 16 and need no config change.

---

## What the Studio One device maps

| Drop control | MIDI | Studio One target |
|---|---|---|
| 4×4 grid (bottom-left first) | ch16 notes 88–103 | Launcher **clip launch** (`kCellsOnly`) |
| Blue buttons ◀ ▲ ▼ ▶ | ch16 notes 84–87 | move the launcher focus box (nav) ✅ |
| Bottom row | ch16 notes 104–107 | launcher **stop** modifier (hold + tap a column to stop) |
| Stop-All | ch16 note 127 | Launcher *Stop All* |
| Faders (8 layers A–H) | ch 1/3/5/7 CC | channel **volume**, mixer **ch 1–64** (Layer A→1–8 … H→57–64) |
| Mutes (8 layers A–H) | ch 2/4/6/8 | channel **mute**, ch 1–64 |
| Encoders ×32 | ch1 CC 1–34 | free **`Knob 1–32`** — assign to plugins via Control Link |
| Encoder pushes ×32 | **ch2** notes 1–34 | free momentary **buttons** — assign via Control Link |
| Snapshots | **ch13** Program Change | launch **scene = program number** (see below) |

The 8 Drop **layers** expand the mixer: each layer sends different CCs on the same 8 physical faders/mutes, so A–H address channels 1–64. No layer-switch handling is needed — every layer's CCs are pre-mapped.

The grid LEDs echo Studio One clip state: velocity = `colorIndex + 2`, `+16` queued, `+64` playing, `1` = empty.

---

## Snapshots → scene launch (separate from the grid)

There are **two independent paths** to the Launcher — don't conflate them:

| Path | Drop mode | MIDI | Effect |
|---|---|---|---|
| **Launcher grid** | DAW mode — physical grid + top scene row | ch16 notes | launch clips / scenes, nav, LEDs |
| **Snapshot scene launch** | snapshot mode — snapshot fires a Program Change | **ch13 Program Change** | launch **scene = program number** |

Set the Drop's snapshot output to **Program + Bank** (channel 13). Each snapshot's
**program number = the 0-based scene it launches** (program 0 → scene 0, etc.), settable
per snapshot on the fly. Firing the snapshot launches that scene, with **no viewport
movement** — same effect as tapping the physical scene row, but for any scene.

How it works internally: the surface has a hidden `kScenesOnly` PadSection
(`SceneLaunchElement`) whose pad *N* is bound directly to Program Change *N*, so Studio
One's own control-matching "presses" it and launches scene *N*. The two paths never touch.

**Banks:** the Drop groups snapshots as 20 per bank (4×5 matrix), up to 20 banks. With a
**single bank** (≤20 snapshots) the program number alone is unique — which is what this
maps. Program Change tops out at 128, so scenes 0–127 are addressable. (Multi-bank
addressing, where the Bank Select would offset the scene range, is not wired up.)

---

## Setup

### 1. Prepare the Drop
Import **`drop-config/daw-init-studioone.json`** into your Drop (back up your own config first). Confirm the encoder pushes are set to **Temporary**.

### 2. Install the Studio One device
Copy the device folder into your user devices directory:

**macOS**
```
~/Library/Application Support/PreSonus/Studio One 7/User Devices/Neuzeit/Drop/
```
**Windows**
```
%APPDATA%\PreSonus\Studio One 7\User Devices\Neuzeit\Drop\
```
(copy the contents of `studio-one/Neuzeit/Drop/` there)

### 3. Add it in Studio One
1. **Studio One ▸ Settings ▸ External Devices ▸ Add…**
2. Pick **Neuzeit Instruments ▸ Drop**.
3. Set **Receive From** and **Send To** to the Drop's MIDI port.
4. Open the **Launcher** view — the 4×4 grid should light up and launch clips.

### 4. Assign the encoder pushes
The 32 pushes are `public` controls. Map each one with **Control Link**: focus the target parameter, engage mapping, tap the push.

---

## Sync & transport — Studio One is a clock MASTER only

**Studio One 7 cannot slave its transport to external MIDI.** It can *send* MIDI Clock / MMC (master) and can chase **MTC**, but it will **not** follow incoming MIDI beat clock or external **Start/Stop**. The Synchronization page only exposes MTC and MMC *inputs* — there is no "MIDI Clock in", and this is a documented product limitation, not a setting.

So the Drop's **PLAY/STOP emit MIDI clock (Start `0xFA` / Stop `0xFC`)**, which Studio One **receives but ignores** for transport. You'll see the signal in a MIDI monitor, but the transport won't move.

**What this means for the Drop:**
- **Transport is not mapped.** Start a set by launching a scene; end it by pulling the faders down.
- **For tempo lock, run it the other way:** make **Studio One the clock master** and set the Drop to **Ext MIDI** clock (enable "Send MIDI Clock" to the Drop's port in Song Setup). The Drop then follows Studio One.
- Driving Studio One's transport *from* the Drop would require an external translator (Drop clock → Mackie Control / MMC), which is out of scope here.

See issues [#2](../../issues/2) and [#3](../../issues/3) for the full write-up and sources.

## Known limitations / notes

- **Transport:** not mapped — see "Sync & transport" above.
- **Mute message type:** mutes are wired as **notes** on ch2. If they don't toggle, your unit may send them as CC — change `status="#90"` to `status="#B0"` on the `mute[...]` controls in `Drop.surface.xml`.
- **Note-control format matters:** declare note controls as `status="#90" channel="#0F"` (base note-on + channel attr) with a **hex** address — the channel-in-status form `status="#9F"` silently fails to register (Studio One logs `Control "navUp" not found`), which breaks any Invoke/Command referencing it. This was the cause of the earlier "nav/Stop-All don't work" — they work fine once declared correctly.
- **Don't edit the device in Studio One's built-in device *editor*** — it rewrites the file and strips hand-authored controls. Assign ports in External Devices only.
- **Pad colours** use an approximate 14-colour palette in `DropProtocol.js` (`kDropColors`) — tune to taste.
- **Image:** ships an AI-generated device render (`Drop.png`, no watermark). Swap in your own image and update `imageFile` in `Drop.device` if you prefer.

## License

MIT — see [LICENSE](LICENSE).
