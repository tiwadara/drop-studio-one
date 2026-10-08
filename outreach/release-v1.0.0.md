# Drop → Studio One v1.0.0

The first tagged release of the unofficial Neuzeit Instruments **Drop** control-surface integration for **PreSonus Studio One 7**.

## What you get
- **4×4 pad grid → Launcher clip launch**, with LED colour/queued/playing feedback
- **Faders → channel volume across 64 mixer channels** (Drop layers A–H), calibrated so the unity point lands on 0.0 dB, with DAW→Drop feedback
- **Mutes → channel mute**, latching, with lit state, also across 64 channels
- **Encoders → sends / free `Knob` controls**, and **encoder pushes → free momentary buttons**. Assign them with Control Link.
- **Session arrows → move the Launcher focus box**, plus **Stop-All**
- **Snapshots → launch any Launcher scene** (Program Change N → scene N, scenes 0–127)

## Install
1. Import `daw-init-studioone.json` into the Drop. Back up your own config first.
2. Copy the `Drop` device folder to
   - macOS: `~/Library/Application Support/PreSonus/Studio One 7/User Devices/Neuzeit/Drop/`
   - Windows: `%APPDATA%\PreSonus\Studio One 7\User Devices\Neuzeit\Drop\`
3. In Studio One: **Settings ▸ External Devices ▸ Add… ▸ Neuzeit Instruments ▸ Drop**, then set Receive/Send to the Drop's port.

Full guide: see the [README](https://github.com/tiwadara/drop-studio-one#readme).

## Known limitations
- **No transport control from the Drop.** Studio One 7 can't follow external MIDI clock or Start/Stop (#2, #3). Make Studio One the clock master instead.
- Faders currently map at 7-bit resolution in Studio One. A 14-bit option is tracked in #1.

Not affiliated with or endorsed by Neuzeit Instruments or PreSonus.
