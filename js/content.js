// YiayiaOS — all words, Greek first, English under it.
// Each line: [greek, english]. Keys in YIAYIA match optional voice files
// in assets/voice/<key>.mp3 (record a real yiayia — see assets/voice/README.md).

export const GESTURES = {
  shield: { gr: 'ΦΥΛΑΧΤΟ', en: 'CHARM', hint: ['Αντίχειρας πάνω', 'Thumb up'] },
  mirror: { gr: 'ΚΑΘΡΕΦΤΗΣ', en: 'MIRROR', hint: ['Δύο δάχτυλα ενωμένα', 'Two fingers together'] },
  moutza: { gr: 'ΜΟΥΤΖΑ', en: 'MOUTZA', hint: ['Ανοιχτή παλάμη', 'Open palm'] },
  cast:   { gr: 'ΜΑΤΙ', en: 'EVIL EYE', hint: ['Τσίμπημα', 'Pinch'] },
};

// Notifications from the world. Some ancient, some algorithmic.
export const THREATS = [
  ['Η θεία ρώτησε πότε θα παντρευτείς', 'Auntie asked when you will marry'],
  ['Η γειτόνισσα κοίταξε το καινούργιο σου αμάξι', 'The neighbour eyed your new car'],
  ['Σου είπαν «τι ωραίο μωρό» χωρίς να φτύσουν', 'Someone praised the baby without spitting'],
  ['Σου είπαν ότι έλαμπες σήμερα', 'Someone said you were glowing today'],
  ['Η κουνιάδα είπε «με το καλό» με ύφος', 'Sister-in-law said "congrats" with a tone'],
  ['Πέρασες από το καφενείο με καινούργια παπούτσια', 'You walked past the kafeneio in new shoes'],
  ['Η πεθερά σού έκανε κομπλιμέντο. Ύποπτο.', 'Your mother-in-law complimented you. Suspicious.'],
  ['Είπες «μια χαρά είμαι» δυνατά', 'You said "I am doing great" out loud'],
  ['Η ανάρτησή σου πήρε πάρα πολλά like', 'Your post got far too many likes'],
  ['Ο αλγόριθμος σε κοίταξε πολλή ώρα', 'The algorithm stared at you too long'],
  ['Ένα AI σού είπε «εξαιρετική ερώτηση»', 'An AI told you "great question"'],
  ['Η πρώην είδε το story σου', 'Your ex viewed your story'],
  ['347 άγνωστοι είδαν το reel σου', '347 strangers watched your reel'],
  ['Το κινητό ήξερε τι ήθελες πριν το θελήσεις', 'Your phone knew what you wanted before you did'],
  ['Η έξυπνη τηλεόραση σε άκουγε', 'The smart TV was listening'],
  ['Το Wi-Fi κόπηκε. Κάποιος σε ζήλεψε.', 'The Wi-Fi dropped. Someone envied you.'],
  ['Ένα bot σού έκανε like στις 3:47 π.μ.', 'A bot liked your post at 3:47 a.m.'],
  ['Η κάμερα σε κοιτάζει αυτή τη στιγμή', 'The camera is looking at you right now'],
  ['Σου ήρθε «Ποιον μπορεί να γνωρίζεις»: τη γειτόνισσα', '"People you may know": the neighbour'],
  ['Το smartwatch σε συνεχάρη για τα βήματα', 'Your smartwatch congratulated your steps'],
];

export const SENDERS = [
  'ΘΕΙΑ ΦΩΦΩ', 'Η ΓΕΙΤΟΝΙΣΣΑ', 'ΚΥΡΑ-ΛΕΝΩ', 'ΑΛΓΟΡΙΘΜΟΣ', 'ΑΓΝΩΣΤΟΣ ΑΡΙΘΜΟΣ',
  'Η ΚΟΥΜΠΑΡΑ', 'CLOUD', 'ΤΟ ΚΑΦΕΝΕΙΟ', 'ΕΝΑ BOT', 'Η ΠΕΘΕΡΑ',
];

// What Yiayia says. Arrays = random pick.
export const YIAYIA = {
  greet:    [['Έλα, παιδί μου, κάτσε να σε δω.', 'Come, child, sit so I can see you.']],
  hand:     [['Δώσ\' μου το χέρι σου.', 'Give me your hand.']],
  oil:      [['Πατρός, και Υιού, και Αγίου Πνεύματος...', 'In the name of the Father, the Son, the Holy Spirit...']],
  verdict:  [['Χάθηκε το λάδι... Σε ματιάσανε!', 'The oil vanished... You have been cursed!']],
  teach:    [['Ό,τι σου έρθει, θα κάνεις αυτά που σου μάθω.', 'Whatever comes, do what I teach you.']],
  shield:   [['Το φυλαχτό σου, μην το βγάλεις!', 'Keep your charm on!'],
             ['Έτσι, κράτα το σφιχτά.', 'That is it, hold it tight.']],
  mirror:   [['Να της γυρίσει πίσω!', 'Let it go right back to her!'],
             ['Από κει που ήρθε!', 'Back where it came from!']],
  moutza:   [['Φτου, φτου, φτου!', 'Ftou, ftou, ftou!'],
             ['Να, στα μάτια σου!', 'Take that, right in the eyes!']],
  yawn:     [['Ααααχ... χασμουρήθηκα. Μάτι ήταν!', 'Aaaah... I yawned. It WAS the eye!'],
             ['Ωωχ, μου \'ρθε χασμουρητό... βαρύ μάτι!', 'Oof, a yawn... heavy eye, this one!']],
  cast:     [['Μη ματιάζεις, παιδί μου, σε βλέπει ο Θεός!', 'Do not cast the eye, child, God is watching!'],
             ['Τι κάνεις εκεί; Μάτι στον εαυτό σου;', 'What are you doing? The eye on yourself?']],
  hit:      [['Σου τα \'λεγα εγώ...', 'I told you so...'],
             ['Παναγία μου...', 'Holy Mother...'],
             ['Αχ, και δεν έφτυσες!', 'Ach, and you did not spit!']],
  blocked:  [['Χα! Δεν σε πιάνει.', 'Ha! It cannot touch you.']],
  full:     [['Μπράβο, παιδί μου! Να \'σαι πάντα καλά.', 'Bravo, child! Stay well, always.']],
  crash:    [['Πάει το σύστημα... Κάνε μια μούντζα να ξεματιαστεί!', 'There goes the system... Give it a moutza!']],
  reboot:   [['Δόξα σοι ο Θεός. Η χάντρα έσπασε, πήρε το κακό.', 'Glory to God. The bead cracked, it took the evil.']],
  idle:     [['Φάγατε;', 'Have you eaten?'],
             ['Ντύσου, θα κρυώσεις.', 'Dress warm, you will catch cold.'],
             ['Πάρε κι ένα κουλουράκι.', 'Have a koulouraki.'],
             ['Στην εποχή μου δεν είχαμε Wi-Fi. Είχαμε λάδι και νερό.', 'In my day we had no Wi-Fi. We had oil and water.'],
             ['Αυτό το μηχάνημα σε κοιτάει περίεργα.', 'That machine is looking at you funny.'],
             ['Ο παππούς σου δεν πίστευε σε αυτά. Και πού είναι τώρα;', 'Your grandfather did not believe in this. And where is he now?']],
  lost:     [['Πού πήγες; Έλα πίσω.', 'Where did you go? Come back.']],
  sleep:    [['Ζζζ...', 'Zzz...']],
  goodbye:  [['Άντε, πήγαινε στο καλό. Και φτου σου!', 'Go well, child. And ftou to you!']],
  nocam:    [['Δεν σε βλέπω, παιδί μου. Πάτα τα κουμπιά.', 'I cannot see you, child. Press the buttons.']],
};

export const BOOT_LINES = [
  ['ΓΙΑΓΙΑ BIOS v8.0  (c) 1952 Κυρά-Ρήνη Systems', 'YIAYIA BIOS v8.0'],
  ['Έλεγχος μνήμης: 3 γενιές .......... OK', 'Memory check: 3 generations OK'],
  ['Φόρτωση προσευχών ................. OK', 'Loading prayers OK'],
  ['Έλεγχος λαδιού (παρθένο) .......... OK', 'Checking oil (extra virgin) OK'],
  ['Σύνδεση με Παναγία ................ OK', 'Connecting to Panagia OK'],
  ['Φυλαχτά σε επάρκεια: 14 ........... OK', 'Charms in stock: 14 OK'],
  ['Εκκίνηση ΜΑΤΙ.ΕΧΕ ...', 'Starting MATI.EXE ...'],
];

export const UI = {
  title:      ['ΓΙΑΓΙΑ OS', 'YIAYIA OS'],
  subtitle:   ['Πρωτόκολλο Ξεματιάσματος', 'The Unbinding Protocol'],
  begin:      ['ΠΑΤΗΣΕ ΓΙΑ ΝΑ ΞΕΚΙΝΗΣΕΙΣ', 'TOUCH TO BEGIN'],
  beginKiosk: ['ΔΕΙΞΕ ΤΗΝ ΠΑΛΑΜΗ ΣΟΥ ΓΙΑ ΝΑ ΞΕΚΙΝΗΣΕΙΣ', 'SHOW YOUR PALM TO BEGIN'],
  camNote:    ['Χρειάζεται κάμερα. Τίποτα δεν αποθηκεύεται ή αποστέλλεται.', 'Uses your camera. Nothing is stored or sent anywhere.'],
  diagnosis:  ['ΔΙΑΓΝΩΣΗ', 'DIAGNOSIS'],
  oilTest:    ['Δοκιμή λαδιού σε νερό', 'Oil-in-water test'],
  cursed:     ['ΜΑΤΙ ΕΠΙΒΕΒΑΙΩΜΕΝΟ', 'EVIL EYE CONFIRMED'],
  meterLo:    ['ΜΑΤΙΑΣΜΕΝΟ', 'CURSED'],
  meterHi:    ['ΠΡΟΣΤΑΤΕΥΜΕΝΟ', 'PROTECTED'],
  incoming:   ['ΕΙΣΕΡΧΟΜΕΝΟ', 'INCOMING'],
  blocked:    ['ΜΠΛΟΚΑΡΙΣΤΗΚΕ', 'BLOCKED'],
  returned:   ['ΕΠΙΣΤΡΑΦΗΚΕ ΣΤΟΝ ΑΠΟΣΤΟΛΕΑ', 'RETURNED TO SENDER'],
  landed:     ['ΣΕ ΒΡΗΚΕ', 'IT GOT YOU'],
  crash1:     ['ΣΦΑΛΜΑ ΣΥΣΤΗΜΑΤΟΣ', 'SYSTEM FAILURE'],
  crash2:     ['ΠΟΛΥ ΜΑΤΙΑΣΜΑ', 'TOO MUCH MATIASMA'],
  crash3:     ['ΚΡΑΤΑ ΜΟΥΤΖΑ ΓΙΑ ΕΠΑΝΕΚΚΙΝΗΣΗ', 'HOLD A MOUTZA TO REBOOT'],
  full:       ['ΠΛΗΡΗΣ ΠΡΟΣΤΑΣΙΑ', 'FULL PROTECTION'],
  status: {
    idle:    ['ΠΑΡΑΚΟΛΟΥΘΗΣΗ...', 'MONITORING...'],
    shield:  ['ΦΥΛΑΧΤΟ ΕΝΕΡΓΟ', 'CHARM ACTIVE'],
    mirror:  ['ΚΑΘΡΕΦΤΗΣ ΕΝΕΡΓΟΣ', 'MIRROR ACTIVE'],
    moutza:  ['ΞΕΜΑΤΙΑΣΜΑ...', 'UNBINDING...'],
    cast:    ['ΡΙΧΝΕΙΣ ΜΑΤΙ!', 'You are casting the eye!'],
    nohand:  ['ΔΕΝ ΒΛΕΠΩ ΧΕΡΙ', 'NO HAND SEEN'],
  },
  certTitle:  ['ΠΙΣΤΟΠΟΙΗΤΙΚΟ ΞΕΜΑΤΙΑΣΜΑΤΟΣ', 'CERTIFICATE OF UNBINDING'],
  certBody:   ['Βεβαιώνεται ότι ο/η κάτοχος ξεματιάστηκε επιτυχώς.', 'This certifies that the bearer has been successfully unbound.'],
  certStats: {
    blocked:  ['Μάτια που μπλοκαρίστηκαν', 'Eyes blocked'],
    returned: ['Επιστράφηκαν στη γειτόνισσα', 'Returned to the neighbour'],
    hits:     ['Σε βρήκαν', 'Got through'],
    yawns:    ['Χασμουρητά γιαγιάς', 'Yiayia yawns'],
    crashes:  ['Κατάρρευση συστήματος', 'System crashes'],
    moutzes:  ['Μούντζες', 'Moutzes given'],
  },
  certSign:   ['Η γιαγιά', 'Yiayia'],
  download:   ['ΚΑΤΕΒΑΣΕ ΤΟ', 'DOWNLOAD'],
  again:      ['ΞΑΝΑ', 'AGAIN'],
  tired:      ['Η ΓΙΑΓΙΑ ΚΟΥΡΑΣΤΗΚΕ', 'YIAYIA IS TIRED'],
  nocam:      ['ΧΩΡΙΣ ΚΑΜΕΡΑ — πάτα και κράτα τα κουμπιά ή τα πλήκτρα 1–4', 'NO CAMERA — press and hold the buttons or keys 1–4'],
  sound:      ['ΗΧΟΣ', 'SOUND'],
};

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
