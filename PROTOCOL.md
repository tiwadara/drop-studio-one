# Drop DAW-mode protocol notes

What the Neuzeit Drop sends and expects when a computer is on the other end of USB 1.
Written as a reference for this Studio One device and for any other software that wants to
talk to the Drop in DAW mode.

Unofficial. Not affiliated with or endorsed by Neuzeit Instruments, Bitwig or PreSonus.

## Where this comes from

| Source | What it gave us |
|---|---|
| Bitwig's Drop controller extension (MIT), [`bitwig/bitwig-extensions`](https://github.com/bitwig/bitwig-extensions/tree/main/src/main/java/com/bitwig/extensions/controllers/neuzeitinstruments), read at commit `a27f2f4` | Handshake, pad maps, LED encoding, colour table, value echo, DAW Init control numbers |
| Bitwig's Drop setup guide, [PDF in the same repo](https://github.com/bitwig/bitwig-extensions/tree/main/src/main/resources/Documentation/Controllers/Neuzeit%20Instruments) | Sync direction, what each LED state means, how scenes are scheduled |
| `studio-one/Neuzeit/Drop/DropProtocol.js` in this repo | Constants taken from the Drop's Ableton Live script (`Drop_v01`) |
| `drop-config/daw-init-studioone.json` in this repo | The control numbers a real DAW Init project sends |
| Neuzeit's project-file notes, [published with dropedit](https://github.com/jamesmacaulay/dropedit/blob/main/docs/jsonDocu_FW_2_01.txt) | Meaning of the config fields (`behavId`, `clk`, `grid`, ...) |

Each claim below is marked **read** (seen directly in code or docs) or **inferred** (a
conclusion that still needs a MIDI monitor on real hardware).

## Sync and transport

- **read** Bitwig's guide: "Drop is meant to be used as the MIDI clock master in a performance
  setup." The DAW is set to follow MIDI clock from `DROP USB1`.
- **read** PLAY starts the Drop's clock, SHIFT + PLAY stops it.
- **read** Neither the Bitwig extension nor this device maps transport or tempo. Sync is MIDI
  clock only.
- **read** Scheduled clip and scene launches are described as working "when Bitwig Studio is
  synchronized to Drop".
- **inferred** Nothing found lets software set the Drop's tempo. The only route seen is the Drop's
  own clock source setting (`clk.mode`: internal, Ext MIDI USB1/USB2/TRS, CV).

## Port and channels

- **read** Port name: `DROP USB1` on macOS and Windows, `DROP USB1 MIDI1` on Linux.
- **read** Channel 16 carries the pad grid: presses in, LED states out.
- **read** Channel 2 carries mute buttons and encoder pushes.
- **read** Bitwig's guide calls channels 2 and 16 "reserved for internal communication".
- **read** Channel 1 carries faders and encoders for layers A and B after DAW Init.

## DAW Init control numbers (layers A and B)

After MENU > Project > DAW Init the Drop sends these. The gaps skip reserved controller
numbers. Bitwig's table and this repo's config agree on every row.

| Control | Message | Numbers, columns 1 to 8 |
|---|---|---|
| Fader A | CC, ch 1 | 44 45 46 47 48 49 50 51 |
| Encoder A row 1 | CC, ch 1 | 1 2 3 4 5 7 8 9 |
| Encoder A row 2 | CC, ch 1 | 10 to 17 |
| Encoder A row 3 | CC, ch 1 | 18 to 25 |
| Encoder A row 4 | CC, ch 1 | 26 27 28 29 30 31 33 34 |
| Mute button A | Note, ch 2 | 35 36 37 39 40 41 42 43 |
| Fader B | CC, ch 1 | 92 93 94 95 96 99 100 101 |
| Encoder B rows 1 to 4 | CC, ch 1 | 52 to 59, 60 to 67, 68 to 75, 76 to 83 |
| Mute button B | Note, ch 2 | 84 to 91 |
| Encoder push | Note, ch 2 | same number as its encoder's CC |

- **read** Bitwig maps layers A and B only. This repo's config extends the same idea to layers
  C to H on channels 3, 5 and 7.
- **read** Bitwig's guide: deselect Quickturn in DAW Init if the encoder pushes should be mappable.
- **read** Faders work in pickup mode. The arrow LEDs show which way to move.

## Value echo (how rings, arrows and button LEDs stay right)

- **read** The host sends a parameter's current value back on the same CC and channel the
  control uses, scaled 0 to 127.
- **read** It only does so when that control has not moved for 1000 ms, so the echo never fights
  the hand that is turning it.
- **read** Button LEDs are driven the same way: note on the button's own number, velocity 127
  for on and 0 for off.

## Pad grid

### Handshake

- **read** The Drop sends note 83 on channel 16 (`9F 53 vv`). When `vv` is 1 it is asking for
  the current state.
- **read** The host answers with note 83 on channel 16 and the layout number as velocity, then
  re-sends every pad LED.
- **read** Bitwig uses layout 1 for a 4 x 4 launcher and layout 2 for a 3 x 5 arranger view.
- **read** This repo sends velocity 100, taken from the Ableton script, and only on connect.

### Layout 1, as Bitwig drives it

| Pads | Notes, ch 16 | Action |
|---|---|---|
| Clip grid, 4 x 4 | 88 to 103 | Launch a clip. Note = 88 + scene x 4 + track |
| Bottom row | 104 to 107 | Stop that track |
| Arrows | 84 left, 85 up, 86 down, 87 right | Move the 4 x 4 window. Holding repeats |
| SHIFT page, first pad of each row | 108, 112, 116, 120 | Schedule that scene for the Drop. Lit red |
| SHIFT page, second pad of each row | 109, 113, 117, 121 | Launch that scene now |
| SHIFT page, other pads of each row | 110 111, 114 115, 118 119, 122 123 | Unused, dark |
| SHIFT page, bottom row first pad | 124 | Stop all clips |

### Layout 2, as Bitwig drives it

- **read** Clip for track `t` (0 to 4) and scene `s` (0 to 2): note 88 + t x 4 + s + 1.
- **read** Stop track `t`: note 88 + t x 4.
- **read** SHIFT page: launch scene `s` at 109 + s, schedule scene `s` at 113 + s, stop all at 108.

### How scene scheduling works

- **read** Bitwig binds no action to the red schedule pads. It only lights them red.
- **read** Bitwig's guide: "Blinking (red): clip will start on the next scheduled downbeat."
- **inferred** The Drop holds the request itself and sends a normal scene launch when its
  cycle ends. If so, software never needs to know where bar 1 of the cycle is in order to land
  a scene on the Drop. Confirm with a MIDI monitor.

### LED states

One note-on per pad on channel 16. The velocity is a colour from 1 to 15, optionally with one
state flag.

| Velocity | Meaning |
|---|---|
| 0 or 1 | Off |
| 2 to 15 | Colour, steady: something is there but not playing |
| colour + 16 | Triggered: queued to start or stop |
| colour + 32 | Recording |
| colour + 64 | Playing |

- **read** Bitwig sets one state at a time. This repo's notes from the Ableton script describe
  the flags as additive.
- **read** Bitwig's guide on what the performer sees: dark means no clip, lit means present,
  blinking means playing, blinking white means starting on the next downbeat, blinking red
  means starting on the next scheduled downbeat.

### Colour table

Bitwig's named table, which it matches clip colours against:

| Index | Colour | Index | Colour |
|---|---|---|---|
| 1 | Off | 9 | Cyan |
| 2 | Red | 10 | Light blue |
| 3 | Orange | 11 | Blue |
| 4 | Brown | 12 | Magenta |
| 5 | Yellow | 13 | Light pink |
| 6 | Light green | 14 | Pink |
| 7 | Green | 15 | White |
| 8 | Light cyan | | |

## Where this repo differs today

- **Colours.** `kDropColors` in `DropProtocol.js` is a guessed spectrum. Bitwig's table says 4 is
  brown, 5 yellow, 7 green, 11 blue and 15 white.
- **Handshake.** The layout note is sent once on connect. Answering the Drop's request would
  restore the pads whenever grid mode is re-entered.
- **Stop all.** 127 here, from the Ableton script. 124 in Bitwig's layout 1. The layout number
  appears to change the pad arrangement, so a map only holds for the layout it was read from.

## Still to check on hardware

1. What the Drop actually sends when a red schedule pad is pressed, and at the cycle end.
2. Whether layout 100 and layout 1 really arrange the pads differently.
3. Whether PLAY and the scheduled launches still behave when the Drop's clock source is Ext MIDI.
4. This repo's config sets every port to clock send mode 3. Neuzeit's notes describe that mode as
   clock without Start and Stop, while the README says Start and Stop do arrive.
5. Fader A-1 is a 14-bit CC in the config and A-2 to A-8 are 7-bit. Bitwig reads all of them as
   7-bit.
