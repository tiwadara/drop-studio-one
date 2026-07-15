// ********************************************************************************************
// Neuzeit Instruments "Drop" - protocol constants
// Derived from the official Drop Ableton Live remote script (Drop_v01).
//
// Hardware facts (from the Live script):
//   - All button/LED traffic is on MIDI channel 16 (BUTTONCHANNEL = 15, 0-indexed).
//   - LED note-on status byte = 0x90 | 15 = 0x9F.
//   - Base note NM = 88.
//   - Pad press + LED share the same note numbers on channel 16.
//   - LED velocity encodes COLOR + STATE:
//        empty / no clip      -> velocity 1
//        clip present         -> velocity = (clip.color_index % 14) + 2   (range 2..15)
//        + triggered/queued   -> velocity += 16
//        + recording          -> velocity += 32
//        + playing            -> velocity += 64
//   - update_led_layout() sends note 83 velocity 100 to (re)assert the session LED layout.
// ********************************************************************************************

class DropProtocol {
}

// --- MIDI ---
DropProtocol.kChannel          = 0x0F;          // MIDI channel 16 (0-indexed)
DropProtocol.kNoteOnStatus     = 0x90 | 0x0F;   // 0x9F - note-on, channel 16
DropProtocol.kBaseNote         = 88;            // NM

// --- LED velocity encoding ---
DropProtocol.kEmptyVelocity    = 1;             // dim / no clip
DropProtocol.kColorBase        = 2;             // clip colors occupy velocities 2..15
DropProtocol.kColorCount       = 14;            // 14 distinct hardware colors
DropProtocol.kStateTriggered   = 16;            // STATE_IS_TRIGGERED (queued)
DropProtocol.kStateRecording   = 32;            // STATE_IS_REC
DropProtocol.kStatePlaying     = 64;            // STATE_IS_PLAYING

// --- Session layout / mode assert ---
DropProtocol.kLayoutNote       = 83;            // QUANT note, repurposed as layout assert
DropProtocol.kLayoutVelocity   = 100;

// --- Clip grid note map (4x4) ---------------------------------------------------------------
// CLIPNOTEMAP from the Live script, row 0 = TOP scene:
//   row0: 88 89 90 91
//   row1: 92 93 94 95
//   row2: 96 97 98 99
//   row3: 100 101 102 103
//
// TOP-LEFT origin (pad[0] = top-left) — MUST match the pad[i] note order in Drop.surface.xml,
// so LED feedback (color/blink) lands on the same pad the launcher lit.
DropProtocol.kPadNotes = [
     88,  89,  90,  91,   // pad[0..3]   -> top physical row
     92,  93,  94,  95,   // pad[4..7]
     96,  97,  98,  99,   // pad[8..11]
    100, 101, 102, 103    // pad[12..15] -> bottom physical row
];

// --- Non-grid buttons (all channel 16 notes) -----------------------------------------------
DropProtocol.kSessionLeft      = 84;   // SESSIONLEFT
DropProtocol.kSessionUp        = 85;   // SESSIONUP
DropProtocol.kSessionDown      = 86;   // SESSIONDOWN
DropProtocol.kSessionRight     = 87;   // SESSIONRIGHT
DropProtocol.kQuant            = 83;   // QUANT
DropProtocol.kStopAllClips     = 127;  // STOPALLCLIPS (NM+39)
DropProtocol.kSceneLaunch      = [111, 115, 119, 123]; // NM+23,27,31,35 (right column)
DropProtocol.kSceneDrop        = [108, 112, 116, 120]; // NM+20,24,28,32
DropProtocol.kTrackStop        = [104, 105, 106, 107];  // NM+16..19 (per-column stop)

// --- Color palette --------------------------------------------------------------------------
// 14 colors mapped to velocities 2..15. The Drop firmware owns the true palette; these are a
// reasonable spectrum so distinct clip colors read as distinct pads. Tune to taste.
DropProtocol.kDropColors = [
    "#FF0000", // 2  red
    "#FF6A00", // 3  orange
    "#FFD500", // 4  yellow
    "#AEFF00", // 5  lime
    "#00FF00", // 6  green
    "#00FFAA", // 7  spring
    "#00FFFF", // 8  cyan
    "#00AAFF", // 9  azure
    "#0055FF", // 10 blue
    "#7F00FF", // 11 violet
    "#FF00FF", // 12 magenta
    "#FF0080", // 13 pink
    "#FFFFFF", // 14 white
    "#888888"  // 15 grey
];
