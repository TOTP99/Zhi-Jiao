/* ============================================================================
   Yumiao (Yumao Lingju) - Palm module English dictionary, en-CA
   File: js/17c-palm-en.js  (new file - original files untouched)
   Source translations: ~/workspace/palm-en-translation.md (2026-11-23,
   standard Canadian English, ~250-300 strings, palm module only)
   Source code base: wip11 / wip13 (identical package, 77 files, v3.0.0)
   Keys mirror the original Chinese tables in js/17-palm.js and
   js/17b-palm-insight.js exactly, by id and option index, so the wiring
   step is a lookup swap, not a re-translation:
     LINES  17-palm.js:852-893  (6 lines, 25 options, [name,trait,reading,tip])
     DIAG   17-palm.js:895-929  (6 groups, 21 options, [name,level,saying,advice])
     DOCTOR_IF 17-palm.js:930-937, LV_LABEL :938, CONF_LABEL :364,
     FAIL_TEXT :1262-1268, HINTS :1081-1084, FOOT :1085-1088
   This file contains ONLY strings - no logic, no DOM, no behaviour change.
   It does NOT switch the app to English by itself. Wiring (user's step):
     1. Copy this file into the package as js/17c-palm-en.js
     2. index.html:653 - add 'js/17c-palm-en.js' to the lazy() list for
        openPalmPanel, after js/17b-palm-insight.js, so it loads with palm
     3. In 17-palm.js / 17b-palm-insight.js, when English is on, read from
        window.PALM_EN instead of LINES / DIAG / DOCTOR_IF / LV_LABEL /
        CONF_LABEL / FAIL_TEXT / HINTS / FOOT and the HTML_BODY literals.
        Date: dateText() must switch to en-CA month names (PALM_EN.months).
        Tests: tests.html Chinese palm assertions (e.g. :850/:852) must be
        synced or they go red when English strings are live - see the
        translation draft section G.
   One fill-in, marked below: DIAG temp desc 'Palm temperature' - the
   translation draft table omitted that one desc; it is a direct rendering
   of the original desc, not a new translation choice.
   Placeholders: {good} {weak} {lines} {hand} {new} {old} {tags} {names}
   {dense} {sparse} {governs} {palmLen} {fingerLen} - substitute at the
   call site the same way the Chinese code joins the lists.
   ========================================================================== */
(function () {
  'use strict';
  var PALM_EN = {
    meta: { lang: 'en-CA', module: 'palm', source: 'palm-en-translation.md 2026-11-23' },
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'],

    /* --- A. Shell / entry (index.html:109, :461-468) --- */
    shell: {
      entryCard: 'Palm Analysis',
      modalTitle: 'Palm Analysis',
      closeAria: 'Close',
      retake: 'Take Another',
      back: 'Back to Edit',
      copy: 'Copy Result'
    },

    /* --- A. Intro / empty / busy (17-palm.js HTML_BODY) --- */
    intro: 'Take or choose a photo of your palm. The main lines are detected automatically \u2014 please check them against the photo. The photo is processed only on this device; it is never uploaded or saved.',
    emptyTitle: 'No photo yet',
    emptyDesc: 'Hold your palm facing the camera, fingers naturally spread, in even light, with your wrist in the frame.',
    busyAnalyzing: 'Analyzing\u2026',

    actions: {
      shoot: 'Take Photo',
      pick: 'Choose from Photos',
      overlay: 'Annotations',
      guide: 'Reference Diagram',
      reset: 'Start Over'
    },

    guide: {
      title: 'Photo not coming out clear? These tips help.',
      tips: [
        'Spread your palm fully, with your thumb in the frame',
        'Even light, no strong glare',
        'Include your wrist if you can',
        'Use the rear camera, about 20\u201330 cm away',
        'A line not clear? Take another photo: lines already read clearly are kept, and only clearer ones are updated.'
      ],
      retake: 'Take Another',
      manual: 'Choose Manually from the Photo',
      diagramAria: 'Positions of the six palm lines',
      diagramCaption: 'Reference diagram: thumb on the left, palm facing the camera. Line positions vary from person to person \u2014 use this only as a guide.'
    },

    hand: { label: 'Hand photographed', left: 'Left hand', right: 'Right hand' },
    mode: { fortune: 'Fortune Reading', diag: 'Palm Diagnosis' },
    generate: {
      generic: 'Generate Reading',
      fortune: 'Generate Fortune Reading',
      diag: 'Generate Palm Check'
    },

    hints: {
      fortune: 'Lines the app detected are already selected (marked "Detected"). Please check them against the photo; for anything you are unsure about, choose it yourself. Anything left unselected is not included in the reading.',
      diag: 'Colour is affected by lighting and the camera, so it cannot be judged reliably from a photo. Compare the photo with your own hand and pick the description that fits. Anything left unselected is not included.'
    },
    foot: {
      fortune: 'Palm readings come from traditional palmistry, for entertainment and reflection only.',
      diag: 'Palm diagnosis is a traditional observation. It is not a medical diagnosis \u2014 if you feel unwell, please see a doctor promptly.'
    },
    moreLines: 'More lines (optional)',
    detectedChip: 'Detected',
    confLabel: { 3: 'Clear', 2: 'Fair', 1: 'Unclear' },
    confNote: {
      unclear: 'Unclear \u2014 please choose yourself or retake',
      notDetected: 'Not detected \u2014 please choose yourself or retake'
    },
    lvLabel: { ok: 'Common', watch: 'Worth noting', doctor: 'See a doctor' },

    /* --- B. LINES (17-palm.js:852-893) - same shape as LINES, English only --- */
    lines: [
      { id: 'life', name: 'Life line', desc: 'The arc curving around the base of the thumb; governs vitality and foundation.', opts: [
        ['Long and deep', 'Abundant vitality', 'A long, deep life line traditionally indicates abundant vitality and a solid foundation, with strong stamina; fortune tends to settle after middle age.', 'Keep a regular routine and put your energy into long-term pursuits.'],
        ['Clear and unbroken', 'Steady foundation', 'A clear, unbroken life line traditionally indicates a life of measured ups and downs, with a knack for turning trouble aside and helpful people nearby.', 'When a problem comes, hold your pace \u2014 help often arrives while you persist.'],
        ['Short and shallow', 'Conserve your energy', 'A short, shallow life line traditionally indicates weaker innate vitality; keep regular hours, balance work and rest, and steady effort can make up the difference.', 'Leave yourself time to recover \u2014 don\u2019t run on empty.'],
        ['Broken / discontinuous', 'Life in stages', 'A broken life line traditionally indicates a life lived in distinct stages, with a turning point around middle age; measured steps and a steady pace will carry you through.', 'Before big decisions, leave yourself a buffer \u2014 and get a checkup once a year.'],
        ['Forked at the end', 'A varied later life', 'A life line that forks at the end traditionally indicates change in later years \u2014 perhaps a move or travel \u2014 and a widening circle of people and activity.', 'Try new circles and interests; there\u2019s no need to stay in one place.']
      ] },
      { id: 'heart', name: 'Heart line', desc: 'The horizontal line across the upper palm; governs feelings and relationships.', opts: [
        ['Long and curving', 'Loyal and warm-hearted', 'A long, gently curving heart line traditionally indicates deep feeling and loyalty, warmth toward others, and easy popularity.', 'Say what matters to you out loud \u2014 it brings people closer.'],
        ['Long and straight', 'Steady in love', 'A long, straight heart line traditionally indicates steady feelings and strong commitment, expressed quietly and built to last.', 'Speak up now and then, so the people who matter can hear it.'],
        ['Short and curving', 'Passionate', 'A short, curving heart line traditionally indicates feelings that run hot and direct; give relationships time and patience.', 'Pause half a beat before judging \u2014 give each other time.'],
        ['Short and straight', 'Reserved and rational', 'A short, straight heart line traditionally indicates a rational, reserved nature; love tends to arrive later and deepen with time.', 'Don\u2019t rush to define the relationship \u2014 spend time together and let it show itself.'],
        ['Broken / discontinuous', 'Love with ups and downs', 'A broken heart line traditionally indicates a love life with ups and downs; talk more, guess less, and the relationship grows steadier for it.', 'When there\u2019s a misunderstanding, speak first \u2014 don\u2019t guess.'],
        ['Forked at the end', 'Wide circle', 'A heart line that forks at the end traditionally indicates broad popularity and a wide emotional life; focus your care to find something solid.', 'Be open to many people, but invest your care in the ones who matter.']
      ] },
      { id: 'head', name: 'Head line', desc: 'The horizontal line across the middle of the palm; governs thinking and talent.', opts: [
        ['Long and straight', 'Thorough thinker', 'A long, straight head line traditionally indicates careful thought and clear logic, well suited to practical work, management, and business.', 'For important decisions, write out the pros and cons first \u2014 your orderliness is your edge.'],
        ['Curving downward', 'Sharp intuition', 'A head line that curves downward traditionally indicates a rich imagination, keen sensitivity, and strong intuition, suited to the arts, creative work, and design.', 'Jot down ideas as they come, then test them against the facts.'],
        ['Short and shallow', 'Decisive', 'A short, shallow head line traditionally indicates a direct style, focused on the present; leave a little room for thought before acting.', 'Before you act, ask once more: "What am I missing?"'],
        ['Broken / discontinuous', 'Active mind', 'A broken head line traditionally indicates an active mind that is easily distracted; break big tasks down and finish them one by one.', 'Split big goals into small steps and complete them in turn.'],
        ['Forked at the end', 'Many talents', 'A head line that forks at the end traditionally indicates many talents and a lively mind; developing one or two side pursuits suits both reason and feeling.', 'Pick one side pursuit and see it through \u2014 don\u2019t leave it as an idea.']
      ] },
      { id: 'fate', name: 'Career line', desc: 'The vertical line running from the base of the palm toward the middle finger; governs career.', opts: [
        ['Deep and straight', 'Clear goals', 'A deep, straight career line traditionally indicates clear goals and steady advancement, with achievements showing after middle age and help from others.', 'Break long-term goals into yearly ones and move forward steadily.'],
        ['Shallow and broken', 'Changing career', 'A shallow, broken career line traditionally indicates a career of changes and new stages; build on your own experience, and persistence pays off.', 'With each change, carry away one skill you can use elsewhere.'],
        ['Faint or absent', 'Free spirit', 'A faint career line traditionally indicates a free, unconventional spirit; arrange your own livelihood and let opportunity come in its own time.', 'Even in freedom, keep a direction \u2014 set yourself one baseline goal.'],
        ['Rising from the life line', 'Self-made', 'A career line rising from the life line traditionally indicates building from nothing on your own effort, with comfort in later years.', 'A reputation and body of work you built yourself count for more than connections.']
      ] },
      { id: 'marriage', name: 'Marriage line', desc: 'The short horizontal line(s) on the edge of the palm below the little finger (optional).', manual: true, opts: [
        ['One deep, long line', 'Devoted', 'A single deep, long marriage line traditionally indicates devotion and a happy marriage, lasting through the years.', ''],
        ['Several shallow, short lines', 'Many romances', 'Several shallow, short marriage lines traditionally indicate many romantic prospects; a later marriage tends to be steadier.', ''],
        ['Forked at the end', 'Needs understanding', 'A marriage line that forks at the end traditionally indicates occasional quarrels between partners; mutual understanding keeps the home in harmony.', '']
      ] },
      { id: 'sun', name: 'Sun line', desc: 'The vertical line below the ring finger (optional).', manual: true, opts: [
        ['Clear, deep, and long', 'Fame and fortune', 'A clear, deep, long sun line traditionally indicates both reputation and wealth, especially prominent in later years.', ''],
        ['Shallow, short, or absent', 'Beyond fame and fortune', 'A shallow, short, or absent sun line traditionally indicates little attachment to fame or fortune; cultivate yourself, and wealth comes by honest means.', '']
      ] }
    ],

    /* --- C. DIAG (17-palm.js:895-929) - same shape as DIAG, English only --- */
    diag: [
      { id: 'color', name: 'Palm colour', desc: 'The overall colour of the palm \u2014 compare in natural light.', opts: [
        ['Even and rosy', 'ok', 'A rosy, even palm colour is traditionally seen as balanced energy and blood.', 'Keep regular hours and moderate exercise.'],
        ['Pale', 'watch', 'A pale palm is traditionally linked to low energy, cold, or fatigue; a cold room or freshly washed hands can do the same.', 'Keep warm, eat regularly, and get enough sleep. If you often feel cold, tired, or dizzy over a long period, ask your doctor about a blood test.'],
        ['Dark red', 'watch', 'A dark red palm is traditionally linked to internal heat, late nights, or sluggish circulation; drinking or recent exercise can also cause it.', 'Cut back on late nights, spicy food, alcohol, and smoking, and drink more water. If it persists, mention it at your next checkup.'],
        ['Yellowish', 'watch', 'A yellowish palm is traditionally linked to digestion; eating a lot of carrots, oranges, and similar foods can also yellow the palms.', 'Rule out diet first. If the whites of your eyes or your skin are also noticeably yellow, please see a doctor promptly.'],
        ['Bluish or purplish', 'doctor', 'A bluish or purplish palm is traditionally linked to cold or sluggish circulation; brief appearances in cold weather are common.', 'Warm up first and watch. If the colour persists in a warm place, or comes with shortness of breath or chest tightness, please see a doctor promptly.']
      ] },
      { id: 'temp', name: 'Palm temperature', desc: 'Palm temperature', opts: [
        ['Warm', 'ok', 'A warm palm is traditionally seen as good circulation and ample energy.', ''],
        ['Cool', 'watch', 'A cool palm is traditionally linked to lower energy and cold hands and feet; tension, sitting too long, or a cold room can also cause it.', 'Keep warm, soak your feet in warm water before bed, and move your hands and feet to help circulation.'],
        ['Damp, hot, and sweaty', 'watch', 'A damp, hot, sweaty palm is traditionally linked to internal heat or dampness; tension and hot weather can also cause it.', 'Eat lightly and keep regular hours. If heavy sweating persists and affects daily life, please see a doctor.']
      ] },
      { id: 'thenar', name: 'Thenar eminence', desc: 'The mound at the base of the thumb, traditionally linked to digestion.', opts: [
        ['Full and rosy', 'ok', 'A full, rosy thenar eminence is traditionally seen as good digestion.', ''],
        ['Thin and pale', 'watch', 'A thin, pale thenar eminence is traditionally linked to weaker digestion; recent weight loss or overwork can also thin it.', 'Eat smaller, more frequent meals and chew well. If your weight has dropped without a clear reason, please see a doctor.'],
        ['Visible veins', 'watch', 'Visible veins on the thenar eminence are traditionally linked to cold or sluggish digestion; they are also common in people with thin skin.', 'Eat lightly, avoid cold and raw food, and exercise moderately.']
      ] },
      { id: 'hypo', name: 'Hypothenar eminence', desc: 'The mound on the little-finger side of the palm, traditionally linked to vitality.', opts: [
        ['Full and rosy', 'ok', 'A full, rosy hypothenar eminence is traditionally seen as abundant vitality.', ''],
        ['Flat and pale', 'watch', 'A flat, pale hypothenar eminence is traditionally linked to lower vitality; sitting too long and poor sleep can also cause it.', 'Get to bed early and do moderate exercise several times a week.']
      ] },
      { id: 'fingers', name: 'Fingers', desc: 'Finger shape and fingertips.', opts: [
        ['Long and flexible', 'ok', 'Long, flexible fingers are traditionally seen as good circulation and supple joints.', ''],
        ['Enlarged joints', 'watch', 'Enlarged finger joints are often linked to joint strain or cold, and are more noticeable in damp weather.', 'Keep your hands warm and avoid long, repeated strain. If your joints feel stiff for more than half an hour after waking, please see a doctor.'],
        ['Pale, cold fingertips', 'watch', 'Pale, cold fingertips are traditionally linked to poor circulation at the extremities; brief appearances in the cold are common.', 'Move and massage your fingers often. If they repeatedly turn white or purple in the cold and it hurts, please see a doctor.']
      ] },
      { id: 'nails', name: 'Nails', desc: 'Nail colour and texture.', opts: [
        ['Rosy and smooth', 'ok', 'Rosy, smooth nails are traditionally seen as ample energy and blood.', ''],
        ['Pale and dull', 'watch', 'Pale, dull nails are traditionally linked to low blood; low iron, poor nutrition, or long-term overwork can also turn nails pale and brittle.', 'Get enough sleep and eat a balanced diet. If it persists, ask your doctor to check your iron levels.'],
        ['Many vertical ridges', 'ok', 'Vertical ridges are very common with age and are traditionally linked to overwork.', 'Rest more and stay hydrated.'],
        ['Few or no lunulae', 'ok', 'Few or faint lunulae (the pale half-moons at the nail base) vary greatly from person to person and are usually nothing to worry about.', 'Keep regular hours and eat a balanced diet.'],
        ['Dark vertical band or deformity', 'doctor', 'A dark brown or black vertical band, or a nail that is noticeably thickened or misshapen, needs a doctor\u2019s assessment.', 'In particular, if a dark band on a single nail is gradually widening, please see a doctor promptly \u2014 do not try to judge it yourself.']
      ] }
    ],

    doctorTitle: 'See a doctor if you notice any of these',
    doctorIf: [
      'The same change lasting more than two weeks, or getting worse',
      'Fingers repeatedly turning white or purple in the cold, with pain',
      'A single dark vertical band on a nail, or a nail that is noticeably thickened or misshapen',
      'Palms, the whites of the eyes, or skin turning noticeably yellow',
      'Hand changes together with chest tightness, shortness of breath, ongoing fatigue, or unexplained weight loss',
      'Any change that worries you \u2014 asking a doctor directly is always more reliable than judging it yourself'
    ],

    /* --- D. Auto reading (js/17b-palm-insight.js) --- */
    auto: {
      title: 'Auto Reading',
      textTitle: 'Auto Reading (generated from the recognition results, for reference only)',
      sections: { lines: 'Four lines', mounts: 'Mounts', markings: 'Special markings', shape: 'Palm shape' },
      disclaimer: 'This auto-reading is generated from this session\u2019s measurements and is for reference only; please confirm manually.',
      labelParts: {
        long: 'long', medium: 'medium', short: 'short',
        deep: 'deep', clear: 'clear',
        unbroken: 'unbroken', occasional: 'occasional breaks',
        straight: 'straight', slightlyCurved: 'slightly curved', curved: 'curved',
        down: 'curving downward', flat: 'straight'
      },
      /* rateLine sentences, keyed by the same branches as 17b rateLine() */
      lineSentences: {
        life: {
          long: 'A long life line traditionally indicates abundant vitality and strong stamina.',
          medium: 'A life line of medium length traditionally indicates steady, moderate vitality.',
          short: 'A short life line traditionally indicates weaker innate vitality; keep regular hours and balance work with rest.',
          brokenSuffix: 'With occasional breaks in the line, life traditionally comes in distinct stages, with a turning point around middle age; hold a steady pace and it will pass smoothly.'
        },
        heart: {
          longCurved: 'A long, slightly curving heart line traditionally indicates loyalty and deep feeling.',
          longStraight: 'A long, straight heart line traditionally indicates steady feelings and strong commitment.',
          shortCurved: 'A short, curving heart line traditionally indicates feelings that run hot and direct.',
          shortStraight: 'A short, straight heart line traditionally indicates a reserved, rational nature that rarely shows its feelings.',
          mediumCurved: 'A heart line of medium length with a slight curve traditionally indicates fine, sensitive feelings.',
          mediumStraight: 'A heart line of medium length running straight traditionally indicates steady, grounded emotions.',
          brokenSuffix: 'With occasional breaks in the line, the path of love traditionally has its ups and downs; talk more and guess less.'
        },
        head: {
          longDown: 'A long head line curving downward traditionally indicates a rich imagination and sharp intuition.',
          longStraight: 'A long, straight head line traditionally indicates careful thought and clear logic.',
          medium: 'A head line of medium length traditionally indicates a flexible mind focused on what works.',
          short: 'A short head line traditionally indicates a direct style, focused on the present.',
          brokenSuffix: 'With occasional breaks in the line, the mind is traditionally active but easily distracted; break big tasks down.'
        },
        fate: {
          deep: 'A deep, clear career line traditionally indicates clear goals and steady advancement.',
          visible: 'A clearly visible career line traditionally indicates a career built mostly on one\u2019s own steady accumulation, advancing step by step.'
        }
      },
      mounts: [
        { id: 'venus', name: 'Mount of Venus', key: 'vitality and family' },
        { id: 'jupiter', name: 'Mount of Jupiter', key: 'ambition and drive' },
        { id: 'saturn', name: 'Mount of Saturn', key: 'steadiness and endurance' },
        { id: 'sun', name: 'Mount of the Sun', key: 'reputation and talent' },
        { id: 'mercury', name: 'Mount of Mercury', key: 'dexterity and sociability' },
        { id: 'luna', name: 'Mount of Luna', key: 'imagination and intuition' },
        { id: 'mars', name: 'Plain of Mars', key: 'courage and resolve' }
      ],
      mountsDenseOnly: 'Denser texture on {names}.',
      mountsDenseSparse: 'Denser texture on {dense}; sparser on {sparse}.',
      /* {governs} = e.g. 'Mount of Venus governs vitality and family, Mount of Jupiter governs ambition and drive' */
      mountsTradition: 'Traditionally, {governs}. For reference only.',
      markings: {
        cross: { name: 'Mystic Cross', text: 'A cross between the head and heart lines traditionally indicates sharp intuition and strong insight.' },
        solomon: { name: 'Ring of Solomon', text: 'An arc at the base of the index finger traditionally indicates intelligence, a love of learning, and keen perception.' }
      },
      shape: {
        longer: 'longer than average', wider: 'wider than average', balanced: 'Well proportioned',
        template: 'Palm shape: {shape} (palm length is about {palmLen}\u00d7 palm width; finger length about {fingerLen}\u00d7 palm width).'
      }
    },

    /* --- E. Reports (17-palm.js:940-1030 buildFortune / buildDiag) --- */
    report: {
      fortuneTitle: 'Palm Reading',
      diagTitle: 'Palm Self-Check',
      overallLabel: 'Overall impression',
      overallTemplate: 'This palm is marked by: {tags}. Each line is read below, for reference only.',
      suggestionsLabel: 'Suggestions',
      fortuneDisclaimer: 'Palm readings come from traditional palmistry, for entertainment and self-reflection only. They are not advice for any decision.',
      diagOverall: {
        doctor: 'Some of the items you selected should be confirmed by a doctor \u2014 please read the "See a doctor" entries below first.',
        watch: 'Most of the items you selected are common changes, with a few worth noting \u2014 see below.',
        ok: 'Everything you selected is a common appearance with no particular cause for concern.'
      },
      diagOverallLabel: 'Overall',
      adviceLabel: 'Advice:',
      diagDisclaimer: 'Palm diagnosis is a traditional observation, for reference only. It is not a substitute for a medical diagnosis. If you feel unwell, please see a doctor promptly.',
      handNoteBase: 'By tradition, men read the left hand and women the right; the left hand reflects what is innate, the right hand what comes after.',
      handNote: {
        maleLeftMatch: 'Based on your profile, the left hand is recommended (this photo is of the left hand).',
        maleLeftMismatch: 'Based on your profile, the left hand is recommended, so please take another photo of the left hand to compare.',
        femaleRightMatch: 'Based on your profile, the right hand is recommended (this photo is of the right hand).',
        femaleRightMismatch: 'Based on your profile, the right hand is recommended, so please take another photo of the right hand to compare.'
      }
    },

    /* --- F. Status, photos, warnings, failures, progress --- */
    status: {
      shotsLabel: 'Photos taken: {n} \u2014 tap to view:',
      shotName: 'Photo {n}',
      /* short line names on photo chips (code strips the line suffix) */
      shotLineShort: { life: 'Life', heart: 'Heart', head: 'Head', fate: 'Career' },
      retakeImproved: 'Retake helped: {lines} have been updated; lines that were already clear have been kept.',
      retakeNoBetter: 'This photo has no lines clearer than before; the earlier results have been kept.',
      /* first photo: no 'retake' in the weak clause (code omits it on first shot) */
      detectedFirst: 'Detected so far: {good}; {weak} is not clear enough \u2014 please choose it yourself.',
      detectedRetake: 'Detected so far: {good}; {weak} is not clear enough \u2014 retake or choose it yourself.',
      noneClear: 'None of the lines are clear enough. Please choose them yourself from the photo.',
      looksLikeHand: 'This looks like the {hand} hand. If that is wrong, switch it below.',
      handMismatch: 'This looks like the {new} hand, different from the earlier {old} hand, so the photos were not combined. To switch hands, tap "Start Over".',
      warnsPrefix: 'Please note: {warns} \u2014 check them.',
      warns: {
        sideCut: 'The edge of the palm is cut off, so the life and heart lines may be inaccurate',
        wristCut: 'The wrist is cut off, so the life and career lines may be inaccurate',
        fingersClosed: 'The fingers are together, so positioning may be off',
        heartHeadMerged: 'The heart and head lines are running in the same groove \u2014 please choose the heart line yourself',
        darkBlurry: 'The photo is dark or blurry'
      },
      straightened: 'Straightened to the standard position.',
      notStraightened: 'Not straightened; the original reading stands.',
      earlierKept: 'The earlier results have been kept.',
      needLine: 'Please select at least one line',
      needObservation: 'Please select at least one observation'
    },
    fail: {
      nohand: 'No palm found. Fill the frame with your palm against a plain background and retake the photo \u2014 or choose manually below.',
      palmcut: 'The palm is incomplete or the light is too weak to locate the lines. Include your fingers and wrist in even light and retake \u2014 or choose manually.',
      lowcontrast: 'The photo is too dark or blurry to read the lines. Retake in bright, even light, with the camera in focus \u2014 or choose manually.',
      decode: 'This photo could not be read. Please try a different JPG or PNG photo.',
      heic: 'This is a HEIC photo, which this browser cannot read. Choose a JPG or PNG from your photo library, or save the photo as JPG first \u2014 or choose manually below.',
      error: 'Something went wrong during recognition. Please retake the photo \u2014 or choose manually below.'
    },
    file: {
      choosePhoto: 'Please choose a photo (JPG or PNG)',
      tooLarge: 'This photo is too large (over 10 MB). Please choose a smaller one.'
    },
    /* prog() strings: the call sites append '\u2026' themselves (onProgress t + '\u2026'), so store without it */
    progress: {
      findPalm: 'Finding palm',
      straighten: 'Straightening palm',
      extractLines: 'Extracting lines',
      traceLines: 'Tracing main lines',
      cropPalm: 'Cropping palm',
      definePalm: 'Defining palm area',
      readPhoto: 'Reading photo',
      readFullPhoto: 'Reading full-resolution photo'
    }
  };
  if (typeof window !== 'undefined') window.PALM_EN = PALM_EN;
  if (typeof module !== 'undefined' && module.exports) module.exports = PALM_EN;
})();
