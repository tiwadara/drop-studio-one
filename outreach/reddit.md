# Reddit

Read each sub's rules first. Most allow free, open-source tools when the post explains
something useful, not just a link. Reply to the comments in the first hour or two.

---

## r/StudioOne (main post)

**Title:** I made a free Studio One 7 control surface for the Neuzeit Drop (clip launcher + 64-channel mixer + scene launch)

**Body:**

I own a Neuzeit Drop, and Studio One had no support for it, so I wrote a control-surface device for it. It's open source (MIT):

- 4×4 grid launches Launcher clips, and the pad LEDs show clip colour and queued/playing state
- Faders and mutes control volume and mute on 64 channels (8 per Drop layer), with feedback from Studio One
- Encoders and their push buttons are free controls you assign with Control Link
- Arrow buttons move the Launcher focus box, and there's a Stop-All button
- Drop snapshots launch scenes (Program Change N → scene N)

One catch: Studio One 7 can't follow external MIDI clock or Start/Stop, so the Drop can't run the transport. Studio One has to be the clock master. Details are in the README.

Repo + install guide: https://github.com/tiwadara/drop-studio-one

Happy to answer questions about writing JS control surfaces for S1. It's not well documented, and I hit some odd problems.

---

## r/midi (short version)

**Title:** Open-source Studio One 7 control surface for the Neuzeit Drop, with notes on S1's surface XML quirks

**Body:**
Studio One device for the Neuzeit Drop: clip launch with LED feedback, 64-channel faders and mutes via layers, Program Change → scene launch. Bonus finding: S1 7 ignores incoming MIDI clock and Start/Stop entirely (master only). https://github.com/tiwadara/drop-studio-one

---

## r/synthesizers (short version; check whether self-promo is only allowed in their weekly thread)

**Title:** If you have a Neuzeit Drop and use Studio One, here's a free integration

**Body:**
Clip launching with LED feedback, a 64-channel mixer across the Drop's layers, and snapshots that launch scenes. Free, MIT licence: https://github.com/tiwadara/drop-studio-one
