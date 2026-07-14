# Neuzeit Drop → Studio One 7

An unofficial [PreSonus Studio One](https://www.presonus.com/products/studio-one) control-surface integration for the [Neuzeit Instruments **Drop**](https://www.neuzeit-instruments.com/Drop), plus a Drop config that exposes the controls Studio One needs.

It turns the Drop into a **Launcher + mixer surface**:

- **4×4 pad grid → scene launch** (each pad fires a Launcher scene), with LED colour/state feedback
- **8 faders → channel volume**
- **32 encoders → 3 sends per channel** (top encoder row left free)
- **8 mute buttons → channel mute**
- **32 encoder pushes → freely assignable** momentary buttons (via Control Link)
- **Session arrows → move the Launcher focus box**, plus a **Stop-All** button

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

This is a Drop DAW config with two changes vs. a default export, so the Drop sends what Studio One expects on **MIDI channel 1** (grid/nav are on channel 16):

| Control | What it sends | Change |
|--------|----------------|--------|
| **Faders A-1…A-8** | CC 44–51, ch 1 | `maxOut` capped at **96** |
| **Encoders A (32)** | CC, ch 1 (pan row + 3 send rows) | unchanged |
| **Encoder pushes (32)** | **Notes 1–34, ch 1** (skipping 6 & 32) | switched from internal behaviour to **momentary MIDI notes** |
| **Mute buttons A-1…A-8** | ch 2 | unchanged |

Notes:
- **Push note = its encoder's CC number** (e.g. `PUSH A-7-1` → note 8, because `ROT A-7-1` → CC 8). Numbers 6 and 32 are skipped because they are reserved MIDI controllers.
- The pushes are set to `behavId 4` (momentary, copied from the mute buttons). If that doesn't read as **"Temporary"** on your unit, set those pushes to *Temporary* in the Drop editor — the note assignments stay.
- The grid / scene-launch / nav / stop-all buttons use the Drop's built-in DAW-mode notes on **channel 16** and need no config change.

---

## What the Studio One device maps

| Drop control | MIDI | Studio One target |
|---|---|---|
| 4×4 grid | ch16 notes 88–103 | Launcher **scene launch** (`kScenesOnly`) |
| Session ◀ ▲ ▼ ▶ | ch16 notes 84–87 | move the Launcher focus box |
| Stop-All | ch16 note 127 | Launcher *Stop All* |
| Faders ×8 | ch1 CC 44–51 | channel **volume** |
| Encoders rows 2–4 | ch1 CC | **sends 1–3** per channel |
| Mutes ×8 | ch2 | channel **mute** |
| Encoder pushes ×32 | ch1 notes 1–34 | **assignable** (Control Link) |

The grid LEDs echo Studio One clip state: velocity = `colorIndex + 2`, `+16` queued, `+64` playing, `1` = empty.

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
4. Open the **Launcher** view — the 4×4 grid should light up and launch scenes.

### 4. Assign the encoder pushes
The 32 pushes are `public` controls. Map each one with **Control Link**: focus the target parameter, engage mapping, tap the push.

---

## Known limitations / notes

- **Transport:** the Drop's PLAY/STOP emit MIDI *clock* (Start `0xFA` / Stop `0xFC`), and Studio One won't slave transport to beat clock (only MTC/MMC), while its control-surface `<Command>` dispatch doesn't fire for user devices. So transport isn't mapped — start a set by launching a scene, end it by pulling the faders down. If you want tempo lock, make Studio One the clock master and set the Drop to **Ext MIDI** clock.
- **Mute message type:** mutes are wired as **notes** on ch2. If they don't toggle, your unit may send them as CC — change `status="#90"` to `status="#B0"` on the `mute[...]` controls in `Drop.surface.xml`.
- **Don't edit the device in Studio One's built-in device *editor*** — it rewrites the file and strips hand-authored controls. Assign ports in External Devices only.
- **Pad colours** use an approximate 14-colour palette in `DropProtocol.js` (`kDropColors`) — tune to taste.
- **Image:** the real product photo is omitted for copyright reasons; a placeholder SVG ships instead. Drop in your own `Drop.png` and change `imageFile` if you like.

## License

MIT — see [LICENSE](LICENSE).
