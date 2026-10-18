// plan.js — the day-by-day UGC NET JRF (Psychology) plan, Oct 18 → Dec 16, 2026.
//
// Task ids are "<date>-<index>". Your ticks/edits are stored against these ids, so if you ever
// edit this file, only APPEND tasks at the end of a day; never reorder or delete existing ones.

export const PLAN_START = "2026-10-18";
export const PLAN_END = "2026-12-16";
export const EXAM_DATE = "2026-12-16"; // assumed; change it in Settings once NTA publishes the shift

export const CATS = ["Psychology", "Paper 1", "Mock", "Commute", "MBA", "MAPC", "Research", "Personal", "Other"];
export const NET_CATS = ["Psychology", "Paper 1", "Mock"]; // counted in "NET hours"
export const SECTIONS = ["Morning", "Afternoon", "Evening", "Night Study"];
export const SECTION_HINT = {
  "Morning": "before you leave (weekends: from ~8)",
  "Afternoon": "weekends and light days",
  "Evening": "after you are back, ~7:30 pm",
  "Night Study": "the late block on your long days",
};
export const PHASES = {
  P0: "Exams & deadlines",
  P1: "Syllabus pass",
  P1b: "Patch & mocks",
  P2: "Revision",
  EV: "Event",
};

export const UNITS = {
  U1: { name: "Emergence of psychology & Indian psychology", tier: "A", budget: 12 },
  U2: { name: "Research methodology & statistics", tier: "A", budget: 16 },
  U3: { name: "Psychological testing", tier: "B", budget: 8 },
  U4: { name: "Biological basis of behaviour", tier: "A", budget: 14 },
  U5: { name: "Attention, perception, learning, memory", tier: "C", budget: 7 },
  U6: { name: "Thinking, intelligence, creativity", tier: "C", budget: 5 },
  U7: { name: "Personality, motivation, emotion, stress", tier: "B", budget: 10 },
  U8: { name: "Social psychology", tier: "A", budget: 14 },
  U9: { name: "Human development & interventions", tier: "A", budget: 14 },
  U10: { name: "Emerging areas", tier: "C", budget: 4 },
};

export const UNIT_FLOW =
  "10 PYQs first → full-course PDF → doubt lectures at 1.25–1.5x → revision PDF → ma'am's 5h unit session replay at 2x → PYQs + MCQs → error log → one-page sheet (photograph it for the commute). Move on at ~75% on 30 MCQs or when the time runs out, and flag the unit for pass #2.";

// ---- tiny constructors -------------------------------------------------------------------
const P1 = (t, m = 60, n = "", s = "Morning") => ({ s, c: "Paper 1", t: `Paper 1 · ${t}`, m, n });
const CV = (u) => ({ s: "Morning", c: "Commute", t: `Commute · ma'am's 20-min concept video at 2x (${u})`, m: 10, u });
const U = (u, t, m, s = "Evening", n = "") => ({ s, c: "Psychology", t: `${u} · ${t}`, m, u, n });
const RP = (u, s = "Morning", n = "") => ({
  s, c: "Psychology", t: `${u} · Hafsa ma'am's 5h unit session, replay at 2x (~2.5h)`, m: 150, u,
  n: n || "Watch alongside your revision PDF. Pause on doubts and write them in the error log. If this unit's session isn't out yet, swap in another unit's replay (Edit → date).",
});
const MK = (t, m, s = "Evening", n = "") => ({ s, c: "Mock", t, m, n });
const CU = (t, m = 180, s = "Morning") => ({ s, c: "Psychology", t: `Catch-up · ${t}`, m });
const OT = (c, t, m, s = "Evening", n = "") => ({ s, c, t, m, n });

const day = (date, phase, mode, commit, tasks) => ({ date, phase, mode, commit, tasks });

const DAYS = [
  // ============================ PHASE 0 · exams and deadlines ============================
  day("2026-10-18", "P0", "Light day (~1h)", "You said: only a little study today", [
    P1("Higher-ed one-pager: commissions & policies in order (Wood's Dispatch, Hunter, Hartog, Radhakrishnan, Mudaliar, Kothari, NEP)", 60,
      "Add regulators (UGC, NAAC, AICTE, NIRF) and schemes. Use your June, KSET and TGSET misses.", "Afternoon"),
  ]),
  day("2026-10-19", "P0", "Light day (~1h)", "", [
    P1("Higher-ed one-pager, part 2: ancient institutions, post-independence growth, SWAYAM / SWAYAM Prabha, CBCS. Then 10 PYQs.", 60, "", "Evening"),
  ]),
  day("2026-10-20", "P0", "Flex day", "No NET planned (you didn't mention this day)", [
    OT("MAPC", "Practical record: write up whatever is pending (optional)", 120, "Evening", "Do this only if you have the energy. The record is due 30 Oct."),
  ]),
  day("2026-10-21", "P0", "Light day (~1h)", "", [
    P1("Environment one-pager: pollution types, acid-rain gases, climate agreements + years, ISA, SDGs, energy sources, biomedical waste, soil texture, coal ranks", 60, "", "Evening"),
  ]),
  day("2026-10-22", "P0", "Light day (~1h)", "MBA exam tomorrow", [
    P1("Environment, part 2 (bioaccumulation, food chains, disasters, landslides) + 10 quant questions (ratio, ages)", 60, "", "Afternoon"),
    OT("MBA", "MBA prep for tomorrow's exam", 120, "Evening"),
  ]),
  day("2026-10-23", "EV", "MBA exam", "MBA end-term exam", [OT("MBA", "MBA end-term exam", 180, "Morning")]),
  day("2026-10-24", "EV", "MBA exam", "MBA end-term exam", [OT("MBA", "MBA end-term exam", 180, "Morning")]),
  day("2026-10-25", "P0", "MA work day", "Practical record due 30 Oct · synopsis due 31 Oct", [
    OT("MAPC", "Practical record: main push", 240, "Morning", "Aim to finish today or tomorrow. 28–30 Oct are blocked."),
    OT("MAPC", "Project synopsis: first full draft", 120, "Afternoon"),
  ]),
  day("2026-10-26", "P0", "MA work day", "MBA exam tomorrow", [
    OT("MAPC", "Finish and submit the practical record if you can", 120, "Morning"),
    OT("MAPC", "Finish the synopsis draft", 60, "Afternoon"),
    OT("MBA", "MBA prep for tomorrow's exam", 120, "Evening"),
  ]),
  day("2026-10-27", "EV", "MBA exam", "MBA end-term exam", [
    OT("MBA", "MBA end-term exam", 180, "Morning"),
    P1("PYQ review, at most 1 hour (optional)", 60, "", "Evening"),
  ]),
  day("2026-10-28", "EV", "MBA exam + Neurosymp", "MBA exam · Neurosymp at BITS, day 1", [
    OT("MBA", "MBA end-term exam", 180, "Morning"),
    OT("Research", "Neurosymp at BITS, day 1", 240, "Afternoon"),
  ]),
  day("2026-10-29", "EV", "Neurosymp", "Neurosymp at BITS, day 2", [
    OT("Research", "Neurosymp at BITS, day 2", 240, "Morning"),
    OT("MAPC", "Synopsis polish (if there is a gap)", 60, "Evening"),
  ]),
  day("2026-10-30", "EV", "MBA exam + Neurosymp", "MBA exam · Neurosymp day 3 · practical record due today", [
    OT("MBA", "MBA end-term exam", 180, "Morning"),
    OT("Research", "Neurosymp at BITS, day 3", 240, "Afternoon"),
    OT("MAPC", "Practical record submitted (due today)", 30, "Evening"),
  ]),
  day("2026-10-31", "EV", "MBA exam", "MBA exam · synopsis due today", [
    OT("MBA", "MBA end-term exam", 180, "Morning"),
    OT("MAPC", "Project synopsis submitted (due today)", 30, "Evening"),
  ]),
  day("2026-11-01", "P0", "NET warm-up", "MBA exam on 3 Nov", [
    P1("Restart: quant (ratio, ages, time-speed-distance) + reread your Higher-ed and Environment one-pagers", 120, "", "Morning"),
    OT("MBA", "MBA prep for 3 Nov", 180, "Afternoon"),
  ]),
  day("2026-11-02", "P0", "Timetable day", "College timetable and MA practical date arrive", [
    OT("Other", "Timetable is out: pick your lightest weekday, then use 'Swap day' to rearrange the study load", 20, "Morning",
      "Plan assumes: Mon 2h, Tue 5h, Wed 8h (heaviest study day), Thu 5h, Fri 5h. Swap Wed with your actual lightest day."),
    OT("MBA", "MBA prep for 3 Nov", 180, "Afternoon"),
    OT("MAPC", "Check the MA practical date and move the MA prep blocks (15 and 22 Nov) accordingly", 10, "Evening"),
  ]),
  day("2026-11-03", "EV", "MBA exam", "MBA end-term exam (last one)", [
    OT("MBA", "MBA end-term exam", 180, "Morning"),
  ]),

  // ============================ PHASE 1 · the syllabus pass ============================
  day("2026-11-04", "P1", "Long study day (8h)", "Syllabus pass starts", [
    P1("Quant + DI drills (30 questions) and Logic: terms and propositions"),
    CV("U2"),
    U("U2", "Stats & research: descriptive stats, normal curve, hypothesis testing, Type I/II error, power, effect size", 240, "Evening",
      `Start with 10 PYQs. Then: ${UNIT_FLOW}`),
    U("U2", "Sampling, scales of measurement, parametric vs non-parametric tests. 10 PYQs, error log", 180, "Night Study"),
  ]),
  day("2026-11-05", "P1", "Study day (5h)", "", [
    P1("Number series, coding-decoding, ratio drills"),
    CV("U2"),
    U("U2", "Correlation family (rank, biserial, point-biserial, tetrachoric, phi, partial, multiple), regression, SEE, factor analysis", 240),
  ]),
  day("2026-11-06", "P1", "Study day (5h)", "", [
    P1("Data interpretation: tables and graphs, 30 minutes of timed sets + logic terms"),
    CV("U2"),
    U("U2", "ANOVA family (one-way, factorial, ANCOVA, MANOVA, MANCOVA), RBD, Latin square, repeated measures, quasi-experimental, single-subject designs", 240),
  ]),
  day("2026-11-07", "P1", "Saturday (10h)", "First P1 sectional today", [
    RP("U2", "Morning"),
    U("U2", "Finish: qualitative and mixed-methods designs, grounded theory. 30 MCQs, one-page sheet", 60, "Morning"),
    U("U3", "Test construction, item analysis, reliability types, Spearman-Brown, SEM", 120, "Afternoon"),
    MK("P1 sectional (quant + DI), timed", 120, "Evening"),
    MK("Analysis of the sectional + error log", 60, "Evening"),
    P1("Logic: fallacies and categorical propositions", 90, "", "Night Study"),
  ]),
  day("2026-11-08", "P1", "Sunday buffer", "Catch-up first; RMET phase 2 today", [
    CU("anything skipped this week"),
    RP("U3", "Afternoon"),
    U("U3", "Validity types (incl. shrinkage), norms, scaling (Thurstone, Likert, Guttman), WAIS/WMI, projective tests (TAT, CAT, Rorschach, DAP, Blacky)", 90, "Afternoon"),
    OT("Research", "RMET phase 2 project", 90, "Evening"),
  ]),
  day("2026-11-09", "P1", "Light study day (2h)", "", [
    P1("Number systems, series, coding-decoding"),
    CV("U3"),
    U("U3", "PYQs + MCQs. Test chronology ladder (Binet → MMPI → TAT → Rorschach)", 60),
  ]),
  day("2026-11-10", "P1", "Study day (5h)", "", [
    P1("Fallacies, with 10 PYQs"),
    CV("U4"),
    U("U3", "Finish: applications, career guidance. One-page sheet", 60),
    U("U4", "Neurons, action potential order, synapse, neurotransmitters, catecholamine synthesis order", 180),
  ]),
  day("2026-11-11", "P1", "Long study day (8h)", "", [
    P1("Categorical propositions, obversion, square of opposition"),
    CV("U4"),
    U("U4", "CNS/PNS, brain divisions with structures (tele-, di-, mes-, meta-, myelencephalon), sensory systems", 240),
    U("U4", "Neuroplasticity, methods (lesion, EEG, PET, MRI), sleep stages + brain waves", 180, "Night Study"),
  ]),
  day("2026-11-12", "P1", "Study day (5h)", "", [
    P1("Indian logic: pramanas, anumana, vyapti, hetvabhasa"),
    CV("U4"),
    U("U4", "Hunger/thirst/sleep/sex (hypothalamic nuclei), limbic system + emotion, hormones, genetics (Down, Klinefelter, Turner, Tay-Sachs, PKU). PYQs + MCQs, one-page sheet", 240),
  ]),
  day("2026-11-13", "P1", "Study day (5h)", "", [
    P1("Research aptitude: validity, ethics, h-index, i10, impact factor, referencing"),
    CV("U1"),
    U("U1", "Gita, Upanishads (Katha chariot, Taittiriya koshas, Mandukya), Ashtanga yoga order, chitta vritti, Buddhism (Eightfold path in Pali)", 240),
  ]),
  day("2026-11-14", "P1", "Saturday (10h)", "First full P2 mock today", [
    RP("U4", "Morning"),
    U("U1", "Sufism path, Integral Yoga (order of transformation), history of Indian psychology (Seal, Sengupta, Ramachandra Rao, Misra)", 150, "Morning"),
    MK("Full P2 mock, timed", 120, "Afternoon"),
    MK("P2 mock analysis + error log", 120, "Afternoon"),
    P1("Teaching aptitude: constructivism, evaluation, CBCS, MOOCs", 60, "", "Evening"),
  ]),
  day("2026-11-15", "P1", "Sunday buffer", "Catch-up first · RMET · MA practical prep (move once the date is known)", [
    CU("anything skipped this week"),
    RP("U1", "Afternoon"),
    U("U1", "Western side: Greek → modern, schools, four founding paths, paradigms, existential worlds, Freud's texts", 60, "Afternoon"),
    OT("Research", "RMET phase 2 project", 90, "Evening"),
    OT("MAPC", "MA practical exam prep (placeholder block)", 180, "Evening"),
  ]),
  day("2026-11-16", "P1", "Light study day (2h)", "", [
    P1("Communication models: Berlo, Schramm, Aristotle, Nowak–Warneryd"),
    CV("U1"),
    U("U1", "PYQs + MCQs, one-page sheet, history chronology ladder", 60),
  ]),
  day("2026-11-17", "P1", "Study day (5h)", "", [
    P1("Communication theorists, barriers, mass media (cultivation, agenda-setting)"),
    CV("U9"),
    U("U9", "Psychopathology: MSE, classification, delirium vs dementia, schizophrenia symptoms, substance use", 240),
  ]),
  day("2026-11-18", "P1", "Long study day (8h)", "", [
    P1("ICT: acronyms, networks LAN/WAN/MAN/PAN, e-governance"),
    CV("U9"),
    U("U9", "Therapies, part 1: psychoanalysis, Rogers, Gestalt concepts, logotherapy, ACT, behaviour therapy", 240),
    U("U9", "Therapies, part 2: REBT, CBT (Beck), MBCT, DBT, IPT, TA, analytical therapy stages, family therapy", 180, "Night Study"),
  ]),
  day("2026-11-19", "P1", "Study day (5h)", "", [
    P1("ICT + the IT Act"),
    CV("U8"),
    U("U9", "Counselling skills, MI stages, development (Piaget sequences, Erikson, Kohlberg, Marcia, Arnett, Rowe & Kahn, teratogens, Kübler-Ross), RtI. PYQs, one-page sheet", 180),
    U("U8", "Start: history, attribution (Jones–Davis, Kelley, bias blind spot)", 60),
  ]),
  day("2026-11-20", "P1", "Study day (5h)", "", [
    P1("Higher-ed revisit: one-pager from memory, then check"),
    CV("U8"),
    U("U8", "Attitudes (TPB, dissonance), persuasion (ELM, foot-in-door, lure, that's-not-all), conformity, compliance, obedience, social facilitation/loafing, social cognition", 240),
  ]),
  day("2026-11-21", "P1", "Saturday (10h)", "Full P2 mock #2 today", [
    RP("U9", "Morning"),
    U("U8", "Prosocial (Latané & Darley), aggression (frustration–aggression, GAM), intergroup (contact conditions, realistic conflict, RD, SIT), stereotypes, self", 90, "Morning"),
    MK("Full P2 mock, timed", 120, "Afternoon"),
    MK("P2 mock analysis + error log", 120, "Afternoon"),
    P1("Mixed P1 practice set", 120, "", "Evening"),
  ]),
  day("2026-11-22", "P1", "Sunday buffer", "Catch-up first · RMET · MA practical prep (move once the date is known)", [
    CU("anything skipped this week"),
    RP("U8", "Afternoon"),
    U("U8", "Group dynamics, leadership styles, family systems (Bateson, Lidz, Bowen, Wynne), gender (Peplau, glass elevator), applied social psychology", 60, "Afternoon"),
    OT("Research", "RMET phase 2 project", 90, "Evening"),
    OT("MAPC", "MA practical exam prep (placeholder block)", 180, "Evening"),
  ]),
  day("2026-11-23", "P1", "Light study day (2h)", "", [
    P1("Environment revisit: one-pager from memory, then check"),
    CV("U8"),
    U("U8", "PYQs + MCQs", 60),
  ]),
  day("2026-11-24", "P1", "Study day (5h)", "", [
    P1("Higher-ed chronology: Wood's Dispatch → NEP, from memory"),
    CV("U7"),
    U("U8", "Finish: one-page sheet + social psychology chronology ladder", 60),
    U("U7", "Personality: psychoanalytic, neo-Freudian, Sullivan, Horney, Allport, Cattell, Eysenck, McCrae–Costa, Rogers, Rotter", 180),
  ]),
  day("2026-11-25", "P1", "Long study day (8h)", "", [
    P1("Mixed set: 40 questions, timed"),
    CV("U7"),
    U("U7", "Motivation (McDougall, Murray, Atkinson, Maslow, arousal, Yerkes–Dodson, flow), emotion theories + brain", 240),
    U("U7", "Stress & coping (GAS, Lazarus, SIT, PMR order), health models (HBM, TPB, locus of control). PYQs + one-page sheet", 180, "Night Study"),
  ]),
  day("2026-11-26", "P1", "Study day (5h)", "", [
    P1("Mixed practice set"),
    CV("U5"),
    U("U5", "Perception: Gestalt laws, constancies, illusions, depth cues, motion, signal detection, attention (cocktail party), retina cells", 240),
  ]),
  day("2026-11-27", "P1", "Study day (5h)", "", [
    P1("Mixed practice set"),
    CV("U5"),
    U("U5", "Learning (classical/operant, schedules, latent learning, Bandura) + memory (stages, levels of processing, constructive memory, forgetting, false memory). PYQs", 180),
    U("U6", "Start the unit", 60),
  ]),
  day("2026-11-28", "P1", "Saturday (10h)", "Full P2 mock #3 today", [
    RP("U7", "Morning"),
    U("U6", "Thinking, concept formation, problem solving, heuristics, language & thought (Whorf), intelligence theories ladder, creativity, Flynn effect", 90, "Morning"),
    U("U10", "Stigma, marginalisation, cultural bias, peace psychology, wellbeing (Ryff, VIA), PNI, chronic illness, technology", 60, "Afternoon"),
    MK("Full P2 mock, timed", 120, "Afternoon"),
    MK("P2 mock analysis + error log", 120, "Evening"),
    P1("Mixed practice set", 60, "", "Evening"),
  ]),
  day("2026-11-29", "P1", "Sunday buffer", "First pass of the syllabus is complete after today", [
    CU("anything skipped this week"),
    RP("U5", "Afternoon"),
    U("U10", "PYQs + MCQs, one-page sheet", 60, "Afternoon"),
    P1("Mixed practice set", 60, "", "Evening"),
    OT("Research", "RMET phase 2 project", 90, "Evening"),
  ]),

  // ============================ PHASE 1b · patch, ends 3 Dec ============================
  day("2026-11-30", "P1b", "Light study day (2h)", "", [
    P1("Mixed practice set"),
    U("U2", "Patch: redo wrong questions from the error log + 30 fresh MCQs", 60),
  ]),
  day("2026-12-01", "P1b", "Study day (5h)", "", [
    P1("Mixed practice set"),
    U("U8", "Patch from the error log, then 30 MCQs", 120),
    U("U4", "Patch from the error log, then 30 MCQs", 120),
  ]),
  day("2026-12-02", "P1b", "Long study day (8h)", "P1 full mock today", [
    MK("P1 full paper, timed", 60, "Morning"),
    MK("P1 analysis + error log", 120, "Morning"),
    U("U2", "Patch from the error log", 120, "Evening"),
    U("U1", "Patch from the error log", 120, "Evening"),
    P1("Quant: timed drills", 60, "", "Night Study"),
    U("U3", "Patch any unit under 75% (see the Units tab)", 60, "Night Study"),
  ]),
  day("2026-12-03", "P1b", "Study day (5h)", "Syllabus is finished today · full P2 mock #4", [
    MK("Full P2 paper, timed", 120, "Evening"),
    MK("P2 analysis + error log", 120, "Evening"),
    P1("Quant: timed drills", 60, "", "Night Study"),
  ]),

  // ============================ PHASE 2 · revision ============================
  day("2026-12-04", "P2", "Study day (5h)", "P1 full mock #2", [
    MK("P1 full paper, timed", 60, "Evening"),
    MK("P1 analysis + error log", 60, "Evening"),
    U("U7", "Patch from the error log", 60, "Evening"),
    U("U5", "Patch from the error log", 60, "Night Study"),
    P1("Quant: timed drills", 60, "", "Night Study"),
  ]),
  day("2026-12-05", "P2", "Saturday (10h)", "Combined mock at your exam slot", [
    MK("Combined P1 + P2 mock at your exam time (3h)", 180, "Afternoon", "Start at the same clock time as your NTA shift."),
    MK("Mock analysis + error log", 180, "Evening"),
    U("U8", "Patch from the error log", 60, "Morning"),
    U("U9", "Patch from the error log", 60, "Morning"),
    P1("One-pagers: Higher-ed, Environment, Logic", 120, "", "Night Study"),
  ]),
  day("2026-12-06", "P2", "Sunday revision", "Last full-length day before midterms", [
    RP("U6", "Morning", "Tier-C unit. If you are behind, watch at 2.5x or skip."),
    RP("U10", "Afternoon", "Tier-C unit. If you are behind, watch at 2.5x or skip."),
    U("U3", "Reread one-page sheets (U3, U10)", 60, "Evening"),
    P1("Higher-ed, Environment and Logic sheets", 90, "", "Evening"),
  ]),
  day("2026-12-07", "P2", "Midterm day (1h)", "MBA midterm", [
    OT("MBA", "MBA midterm", 120, "Morning"),
    MK("Error log: U2, U3, U4", 60, "Evening"),
  ]),
  day("2026-12-08", "P2", "Midterm day (1h)", "MBA midterm", [
    OT("MBA", "MBA midterm", 120, "Morning"),
    MK("Error log: U1, U9, U8", 60, "Evening"),
  ]),
  day("2026-12-09", "P2", "Midterm day (1h)", "MBA midterm", [
    OT("MBA", "MBA midterm", 120, "Morning"),
    MK("Error log: U7, U5, U6, U10", 60, "Evening"),
  ]),
  day("2026-12-10", "P2", "Midterm day (1h)", "MBA midterm", [
    OT("MBA", "MBA midterm", 120, "Morning"),
    P1("Formula sheet + 15 quant questions", 60, "", "Evening"),
  ]),
  day("2026-12-11", "P2", "Midterm day (1h)", "MBA midterm", [
    OT("MBA", "MBA midterm", 120, "Morning"),
    P1("Higher-ed + Environment sheets + Logic", 60, "", "Evening"),
  ]),
  day("2026-12-12", "EV", "ACCS conference", "ACCS 2026 · no study", [OT("Research", "ACCS 2026 conference, day 1", 480, "Morning")]),
  day("2026-12-13", "EV", "ACCS conference", "ACCS 2026 · no study", [OT("Research", "ACCS 2026 conference, day 2", 480, "Morning")]),
  day("2026-12-14", "EV", "ACCS conference", "ACCS 2026 · no study", [OT("Research", "ACCS 2026 conference, day 3", 480, "Morning")]),
  day("2026-12-15", "P2", "Light day (2h)", "Exam tomorrow (assumed date)", [
    MK("Skim chronology ladders, one-page sheets and quant formulas", 120, "Evening"),
    OT("Personal", "Check admit card, route and ID. Sleep early.", 15, "Night Study"),
  ]),
  day("2026-12-16", "EV", "EXAM DAY (assumed)", "UGC NET Psychology: confirm the date once NTA publishes the shift", [
    OT("Personal", "Sit the exam. Attempt every question; there is no negative marking.", 180, "Morning"),
  ]),
];

// ---- derive ids and add exercise every third day ------------------------------------------
const startMs = Date.parse(PLAN_START + "T00:00:00Z");
export const PLAN = DAYS.map((d) => {
  const n = Math.round((Date.parse(d.date + "T00:00:00Z") - startMs) / 86400000);
  const weekend = [0, 6].includes(new Date(d.date + "T12:00:00Z").getUTCDay());
  const tasks = [...d.tasks];
  if (n % 3 === 0 && d.date !== PLAN_END) {
    tasks.push({ s: weekend ? "Afternoon" : "Evening", c: "Personal", t: "Exercise · 20 minutes", m: 20 });
  }
  return { ...d, tasks: tasks.map((t, i) => ({ ...t, id: `${d.date}-${i}`, ord: i * 10 })) };
});
export const PLAN_BY_DATE = Object.fromEntries(PLAN.map((d) => [d.date, d]));
