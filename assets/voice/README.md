# Yiayia's real voice (optional, but this is the heart of it)

YiayiaOS speaks through on-screen bubbles by default. If you drop recordings
here, she speaks out loud, and the drone and effects duck under her voice.

The strongest version of this piece uses a **real yiayia** — yours, a relative,
a neighbour from the kafeneio. Ask her to say the lines in her own way; don't
make her read them word for word. Her improvisations are better than the script.
Get her consent for the recording to be exhibited and credit her by name.

## How to add recordings

1. Record each line as a separate `.mp3` (mono, 44.1 kHz is fine). A phone is enough —
   record in a soft-furnished room, 20–30 cm from her mouth.
2. Name files after the keys below. Multiple takes are welcome: `moutza-1.mp3`, `moutza-2.mp3`.
3. List them in `manifest.json`:

```json
{
  "greet":  ["greet.mp3"],
  "moutza": ["moutza-1.mp3", "moutza-2.mp3"],
  "yawn":   ["yawn.mp3"]
}
```

Any key you leave out falls back to the text bubble only.

Normalise loudness so takes match (needs ffmpeg):

```bash
ffmpeg -i raw.wav -af "highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -b:a 128k greet.mp3
```

## Lines (the bubble text — she can paraphrase)

| key | when | Greek |
|---|---|---|
| `greet` | diagnosis starts | Έλα, παιδί μου, κάτσε να σε δω. |
| `hand` | no hand yet | Δώσ' μου το χέρι σου. |
| `oil` | dropping the oil | Πατρός, και Υιού, και Αγίου Πνεύματος... (or the real ξεμάτιασμα murmur — she will know it) |
| `verdict` | oil vanished | Χάθηκε το λάδι... Σε ματιάσανε! |
| `teach` | tutorial | Ό,τι σου έρθει, θα κάνεις αυτά που σου μάθω. |
| `shield` | thumb up | Το φυλαχτό σου, μην το βγάλεις! / Έτσι, κράτα το σφιχτά. |
| `mirror` | eye sent back | Να της γυρίσει πίσω! / Από κει που ήρθε! |
| `moutza` | open palm | Φτου, φτου, φτου! / Να, στα μάτια σου! |
| `yawn` | she yawns (a real yawn!) | Ααααχ... χασμουρήθηκα. Μάτι ήταν! |
| `cast` | visitor pinches | Μη ματιάζεις, παιδί μου, σε βλέπει ο Θεός! |
| `hit` | a curse lands | Σου τα 'λεγα εγώ... / Παναγία μου... / Αχ, και δεν έφτυσες! |
| `blocked` | charm blocks | Χα! Δεν σε πιάνει. |
| `full` | meter full | Μπράβο, παιδί μου! Να 'σαι πάντα καλά. |
| `crash` | system failure | Πάει το σύστημα... Κάνε μια μούντζα να ξεματιαστεί! |
| `reboot` | after reboot | Δόξα σοι ο Θεός. Η χάντρα έσπασε, πήρε το κακό. |
| `idle` | quiet moments | Φάγατε; / Ντύσου, θα κρυώσεις. / Πάρε κι ένα κουλουράκι. / Στην εποχή μου δεν είχαμε Wi-Fi... |
| `lost` | visitor walked off | Πού πήγες; Έλα πίσω. |
| `sleep` | nobody there | (a soft snore) |
| `goodbye` | session ends | Άντε, πήγαινε στο καλό. Και φτου σου! |

Tip: let her tell you what *she* says when she ξεματιάζει, and what the oil
does when it is "bad". Some families hide the prayer — respect that, and use
only what she is happy to share.
