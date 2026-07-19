// ********************************************************************************************
// Neuzeit Instruments "Drop" - MIDI device layer
// Translates the host launcher's per-pad (state, animation, color-index) into the Drop's
// velocity-encoded LED protocol on MIDI channel 16, for both the clip grid and the scene column.
// Modeled on the Studio One Novation Launchpad MK3 integration.
// ********************************************************************************************

include_file("resource://com.presonus.musicdevices/sdk/midiprotocol.js");
include_file("resource://com.presonus.musicdevices/sdk/controlsurfacedevice.js");
include_file("DropProtocol.js");

// Per-pad LED cache. The three handlers (state/animation/color) each update one field then
// re-send the combined note-on for that pad.
class DropPadState {
    constructor(noteNumber) {
        this.noteNumber = noteNumber;
        this.state = false;
        this.colorIndex = 0;
        this.animation = PreSonus.PadSectionPadAnimation.kNone;
    }
    setState(state)         { this.state = state; }
    setColorIndex(index)    { this.colorIndex = index; }
    setAnimation(animation) { this.animation = animation; }
}

// Base handler holds a reference to the target pad array (grid or scenes) + the index.
class PadHandler extends PreSonus.ControlHandler {
    constructor(controlName, pads, index) {
        super();
        this.name = controlName;
        this.pads = pads;
        this.index = index;
    }
}
class PadStateLEDHandler extends PadHandler {
    sendValue(value, flags) { let p = this.pads[this.index]; p.setState(value);      this.device.sendPadState(p); }
}
class PadAnimationLEDHandler extends PadHandler {
    sendValue(value, flags) { let p = this.pads[this.index]; p.setAnimation(value);  this.device.sendPadState(p); }
}
class PadColorLEDHandler extends PadHandler {
    sendValue(value, flags) { let p = this.pads[this.index]; p.setColorIndex(value); this.device.sendPadState(p); }
}

class DropMidiDevice extends PreSonus.ControlSurfaceDevice {
    onInit(hostDevice) {
        super.onInit(hostDevice);
        this.debugLog = false;

        // Grid pads (4x4 clip cells) and scene pads (whole-column launch).
        this.pads       = DropProtocol.kPadNotes.map((n) => new DropPadState(n));
        this.scenePads  = DropProtocol.kSceneLaunch.map((n) => new DropPadState(n));

        // Register LED handlers. Names must match the surface controls.
        for (let i = 0; i < this.pads.length; i++) {
            this.addHandler(new PadStateLEDHandler(`padLEDState[${i}]`, this.pads, i));
            this.addHandler(new PadAnimationLEDHandler(`padLEDAnimation[${i}]`, this.pads, i));
            this.addHandler(new PadColorLEDHandler(`padLEDColor[${i}]`, this.pads, i));
        }
        for (let i = 0; i < this.scenePads.length; i++) {
            this.addHandler(new PadStateLEDHandler(`sceneLEDState[${i}]`, this.scenePads, i));
            this.addHandler(new PadAnimationLEDHandler(`sceneLEDAnimation[${i}]`, this.scenePads, i));
            this.addHandler(new PadColorLEDHandler(`sceneLEDColor[${i}]`, this.scenePads, i));
        }
    }

    onMidiOutConnected(state) {
        super.onMidiOutConnected(state);
        if (state) {
            this.sendLayoutAssert();
            this.sendStaticButtonLEDs();
            // --- TEMP BRIGHTNESS PROBE ---------------------------------------------------
            // Flood the whole 4x4 clip grid (notes 92..107) with ONE identical colour so we
            // can tell whether the bottom row (104..107) is dim because of the Drop firmware
            // or because of what we normally send it. If the bottom row looks dimmer than the
            // three rows above under this uniform flood, it's a hardware/firmware zone and no
            // velocity we send can match it. Set kBrightnessProbe=false to restore live clips.
            if (DropMidiDevice.kBrightnessProbe) {
                for (let n = 92; n <= 107; n++)
                    this.sendMidi(DropProtocol.kNoteOnStatus, n, 6);   // 6 = green, mid palette
                return;   // skip invalidateAll so the host doesn't overwrite the probe
            }
            this.hostDevice.invalidateAll();
        }
    }

    // The surface can't bind MIDI real-time clock (0xFA/0xFB/0xFC) directly (status="#FA"
    // fails to register). So intercept it here and translate into a note-on that a normal
    // control catches -> which drives a Transport command.
    //   Start/Continue -> ch16 note 1   Stop -> ch16 note 2
    onMidiEvent(status, data1, data2) {
        // NOTE: the Drop snapshot Program Change (ch13) is handled by DIRECT control-matching
        // (sceneLaunchPad[N] in the surface) - NOT here. Injecting via super.onMidiEvent() does
        // not reach the host's control matching, so scene launch must be a real bound control.
        if (status === 0xFA || status === 0xFB) {       // Start / Continue
            this.sendMidi(DropProtocol.kNoteOnStatus, 108, 15);   // DEBUG: light scene-drop pad if we see Start
            super.onMidiEvent(DropProtocol.kNoteOnStatus, 1, 127);
            return;
        }
        if (status === 0xFC) {                          // Stop
            this.sendMidi(DropProtocol.kNoteOnStatus, 108, 5);    // DEBUG: dim it if we see Stop
            super.onMidiEvent(DropProtocol.kNoteOnStatus, 2, 127);
            return;
        }
        if (status === 0xF8) return;                    // ignore clock pulses (flood)
        super.onMidiEvent(status, data1, data2);
    }

    // Map the host's (state, colorIndex, animation) to the Drop's single velocity byte.
    computeVelocity(pad) {
        if (!pad.state)
            return DropProtocol.kEmptyVelocity;

        let colorIndex = pad.colorIndex ? pad.colorIndex : 0;
        let velocity = DropProtocol.kColorBase + (colorIndex % DropProtocol.kColorCount);

        // Host animation enum is none/blink/pulse only; recording reads as playing.
        switch (pad.animation) {
            case PreSonus.PadSectionPadAnimation.kBlink:
                velocity += DropProtocol.kStateTriggered;
                break;
            case PreSonus.PadSectionPadAnimation.kPulse:
                velocity += DropProtocol.kStatePlaying;
                break;
            default:
                break;
        }
        return velocity;
    }

    sendPadState(pad) {
        this.sendMidi(DropProtocol.kNoteOnStatus, pad.noteNumber, this.computeVelocity(pad));
    }

    sendLayoutAssert() {
        this.sendMidi(DropProtocol.kNoteOnStatus, DropProtocol.kLayoutNote, DropProtocol.kLayoutVelocity);
    }

    // Static color wash for the surrounding buttons (notes 108..127), mirroring the Live
    // script's update_led_feedback_secondary(). Purely cosmetic.
    sendStaticButtonLEDs() {
        for (let track = 0; track < 4; track++) {
            for (let scene = 0; scene < 5; scene++) {
                let note = 108 + scene * 4 + track;
                let velocity = 1;
                if (track === 0 && scene < 4)        velocity = 2;
                else if (track === 3 && scene < 4)   velocity = 7;
                else if (track === 3 && scene === 4) velocity = 15;
                this.sendMidi(DropProtocol.kNoteOnStatus, note, velocity);
            }
        }
    }
}

// Diagnostic toggle: true = flood the grid with one colour to test bottom-row brightness.
// (Parked — the bottom-row brightness question is unresolved but not being probed right now.)
DropMidiDevice.kBrightnessProbe = false;

function createDropDeviceInstance() {
    return new DropMidiDevice();
}
