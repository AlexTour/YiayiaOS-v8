# ΓΙΑΓΙΑ OS · YiayiaOS

*A Greek grandmother's evil-eye ritual, running as an operating system.*

YiayiaOS turns **ξεμάτιασμα** — the folk rite of lifting the evil eye — into a
hand-tracked machine that you keep alive with gestures. Envy arrives as push
notifications: some from the auntie and the neighbour, some from the algorithm.
Yiayia watches from her live feed, prays, yawns when the eye is heavy, and
reboots the system with a *moutza* when it all crashes.

Made by Alexandros Touramanis. Bilingual, Greek first.

## Try it

**Online:** open the page (GitHub Pages works as-is), press *Begin*, allow the camera.
Nothing leaves your device; the camera image is processed in the browser and never stored.

**No camera?** The page falls back automatically: press and hold the on-screen
buttons, or keys **1–4**.

**Locally / offline:** everything (hand tracking model, 3D engine, fonts) is in this
repo — no internet needed.

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## The ritual

| Gesture | Greek | What it does |
|---|---|---|
| 👍 Thumb up | ΦΥΛΑΧΤΟ · charm | Blocks incoming eyes; slowly heals. Uses *grace*. |
| ✌ Two fingers together | ΚΑΘΡΕΦΤΗΣ · mirror | Sends the eye back to whoever sent it. Uses *grace*. |
| ✋ Open palm | ΜΟΥΤΖΑ · moutza | Ftou ftou ftou — strong healing, reboots a crashed system. |
| 🤏 Pinch | ΜΑΤΙ · evil eye | You cast the eye yourself. Yiayia is not pleased. |

- **The meter** runs from ΜΑΤΙΑΣΜΕΝΟ (cursed) to ΠΡΟΣΤΑΤΕΥΜΕΝΟ (protected). At zero the system crashes.
- **Grace** (ΧΑΡΗ) powers the charm and the mirror and recharges when you rest.
- **Yawning**: a long moutza after a heavy curse makes Yiayia yawn — proof it *was* the eye.
- **Cracks**: like a real mati bead, the screen cracks as it absorbs the evil.
- Each session ends with a downloadable **Certificate of Unbinding** (valid for 40 days).

## Installation mode

```bash
kiosk/start-kiosk.sh        # macOS / Linux
kiosk\start-kiosk.bat       # Windows
```

Opens Chrome full-screen at `?kiosk`: camera and sound start without prompts, an
open palm starts a session, the piece resets itself after ~30 s with nobody in
front of it, and the page refreshes itself periodically for long festival days.
`Ctrl+Shift+H` opens the hidden config panel (rates, calm visuals, tracker FPS).

**Hardware:** any laptop/mini-PC from the last ~6 years with Chrome, a USB webcam
at chest height facing the visitor, a screen (≥ 32″ or projection), speakers.
Even, frontal light on the visitor's hands; avoid a bright window behind them.

## URL options

| | |
|---|---|
| `?kiosk` | installation mode |
| `?calm` | no pulsing light (also on automatically with *Reduce motion*) |
| `?skip` | jump straight into the ritual (for recording demos) |

## Yiayia's voice

Put real recordings in `assets/voice/` — see [assets/voice/README.md](assets/voice/README.md).

## Photosensitivity & accessibility

- No flashing faster than 1.5 Hz; red pulses breathe at 0.8 Hz; single impact flashes are at least 4 s apart.
- `?calm` / *prefers-reduced-motion* removes the pulsing.
- Everything is captioned in Greek and English; all gestures also work as buttons and keys.

## Structure

```
index.html            page shell
css/yiayia.css        doily-CRT styling
js/main.js            flow: title → boot → oil diagnosis → tutorial → ritual → certificate
js/eye.js             the 18,000-particle mati (Three.js)
js/tracking.js        MediaPipe Hands + gesture classifier, button/key fallback
js/audio.js           procedural sound: ison drone, ftou-ftou, bells, yawn
js/oil.js             oil-in-water diagnosis
js/content.js         every word, Greek + English
js/certificate.js     the certificate
vendor/               Three.js r160 (MIT), MediaPipe Hands 0.4 (Apache-2.0)
fonts/                Press Start 2P, Noto Serif (SIL Open Font License)
kiosk/                installation launchers
```

## License

Code: MIT (see LICENSE). Third-party: Three.js (MIT), MediaPipe (Apache-2.0),
fonts under the SIL Open Font License 1.1.
