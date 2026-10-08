# PreSonus / Studio One forum

**Where:** Studio One forum ▸ Control surfaces / External devices (or "User contributions" if available)

**Title:** Free Studio One 7 control surface for the Neuzeit Drop: clip launcher, 64-ch mixer, scene launch

---

Hi all,

I've built an unofficial Studio One 7 control-surface device for the **Neuzeit Instruments Drop**, and I'm sharing it for free (MIT licence). It turns the Drop into a Launcher + mixer surface:

- **4×4 grid → Launcher clip launch**, with LEDs that follow clip colour and queued/playing state
- **Faders and mutes → volume and mute on 64 mixer channels** (the Drop's 8 layers each cover 8 channels), with feedback from Studio One
- **Encoders and encoder pushes** are free `Knob` and button controls you assign with Control Link (sends, plugin parameters, etc.)
- **Arrow buttons move the Launcher focus box**, plus a Stop-All button
- **Drop snapshots launch Launcher scenes.** Each snapshot sends a Program Change, and program N launches scene N.

Install = import the included Drop config, copy the device folder into `User Devices`, then add it under External Devices. Step-by-step guide and files:

👉 https://github.com/tiwadara/drop-studio-one
🌐 https://tiwadara.github.io/drop-studio-one/

Some things I learned about the JS surface SDK while building it, in case they help other device authors:
- Declare note controls as `status="#90" channel="#0F"` with a hex address. The channel-in-status form (`#9F`) silently fails to register.
- Don't open a hand-written device in the built-in device editor. It rewrites the file and strips your controls.
- Studio One 7 can't slave its transport to incoming MIDI clock or Start/Stop, so there's no transport mapping. Studio One has to be the clock master.

Feedback, bug reports and PRs are welcome, especially from anyone with other Drop firmware versions.

*(Not affiliated with Neuzeit Instruments or PreSonus.)*
