// "Short Count" - an original scene at a ferry landing. Three people, one cash box,
// four different versions of the same morning.
import { setDeduced } from "./engine.mjs";

export const characters = [
  { id: "mara", name: "Mara Quill", role: "Ticket clerk", persona: "Dry, watchful, tidy with money, quick to feel responsible for the office. Speaks in short plain sentences.", color: "#4fd1c5", conceal: [] },
  { id: "joss", name: "Joss Harrow", role: "Deckhand", persona: "Easygoing and proud, hates being pitied, avoids talking about money. Warm, a little evasive when cornered.", color: "#f08a5d", conceal: ["borrowed"] },
  { id: "venn", name: "Inspector Venn", role: "Harbour inspector", persona: "Courteous, exact, patient. Never accuses anyone without evidence and says so. Speaks formally.", color: "#b79cff", conceal: [] },
];

// signals: regexes that detect a line talking about this proposition.
export const props = [
  { id: "borrowed", text: "Joss borrowed 40 coins from the cash box last week", truth: true, signals: [/\bborrow/i, /\bowed?\b/i, /\bloan/i, /\bforty\b|\b40\b/i] },
  { id: "took_key", text: "Joss took the box key off its hook", truth: true, signals: [/\b(took|taken|grabbed|lifted|unhooked|had|holding|held)\b.{0,30}\bkey\b/i, /\bkey\b.{0,30}\b(in his hand|off the hook|in hand)\b/i] },
  { id: "at_box", text: "Joss opened the cash box at dawn", truth: true, signals: [/\b(open|opened|opening)\b.{0,30}\b(box|chest|lid)\b/i, /\b(box|chest|lid)\b.{0,25}\b(open|opened|up)\b/i] },
  { id: "returned", text: "Joss put the 40 coins back before locking it", truth: true, signals: [/\b(put|placed|slid|returned|replaced|paid)\b.{0,30}\b(back|coins?)\b/i, /\breturned\b/i, /\bput (it|them|the money) back\b/i] },
  { id: "box_full", text: "The cash box holds its full count", truth: true, signals: [/\bfull count\b/i, /\bcount (is|was|came)\b.{0,20}\b(right|correct|full|true)\b/i, /\bnothing (is |was )?missing\b/i, /\b(all|every) (the )?coins?\b/i, /\bbox is (full|whole|complete)\b/i] },
  { id: "stole", text: "Joss stole from the cash box", truth: false, signals: [/\bstol(e|en)\b/i, /\bsteal/i, /\bthie(f|ves)\b/i, /\btheft\b/i, /\bpilfer/i, /\bskimm/i] },
  { id: "mara_saw", text: "Mara watched Joss through the office window", truth: true, signals: [/\b(saw|seen|watched|spotted|spied)\b.{0,40}\b(joss|him|you)\b/i, /\bthrough the window\b/i, /\bby the window\b/i] },
  { id: "accused", text: "Joss has been openly accused", truth: true, signals: [/\baccus/i, /\bblam(e|ed|ing)\b/i, /\bsuspect/i, /\barrest/i, /\bcharge[ds]?\b/i] },
];

const E = (id, at, text, present, effects) => ({ id, at, text, present, effects });
const L = (who, prop, mode, cred, from) => ({ who, prop, mode, cred, from });

export const backstory = [
  E("b1", "last week", "Short of rent, Joss quietly borrowed 40 coins from the ferry office cash box, meaning to repay it.", ["joss"], [L("joss", "borrowed", "did", 1)]),
];

export const opening = [
  E("e1", "6:10, the ferry office", "Before anyone is in, Joss lifts the box key off its hook and opens the cash box.", ["joss"],
    [L("joss", "took_key", "did", 1), L("joss", "at_box", "did", 1)]),
  E("e2", "6:12, the ferry office", "Mara, crossing the yard with the morning float, glances through the office window. She sees Joss at the open box, key in his hand. A post hides his other hand.", ["joss", "mara"],
    [L("mara", "took_key", "saw", 1), L("mara", "at_box", "saw", 1), L("mara", "mara_saw", "did", 1)]),
  E("e3", "6:14, the ferry office", "Joss counts forty coins back into the box, locks it and hangs the key up. He does not know anyone saw him.", ["joss"],
    [L("joss", "returned", "did", 1), L("joss", "box_full", "did", 1)]),
];

const tellVenn = (cred = 0.85) => [
  L("venn", "took_key", "told", cred, "mara"), L("venn", "at_box", "told", cred, "mara"),
  { who: "venn", prop: "stole", mode: "told", cred: 0.5, from: "mara", opinion: true },
  L("venn", "mara_saw", "told", 1, "mara"),
];
const jossExplains = () => [L("mara", "returned", "told", 0.5, "joss"), L("venn", "returned", "told", 0.5, "joss")];

export const beats = [
  {
    id: "mara", prompt: "6:30. Mara has been carrying what she saw for a quarter hour. What does she do?",
    options: [
      { id: "confront", label: "Mara confronts Joss at the gangway", hint: "He finds out he was seen.",
        events: () => [E("c1", "6:30, the gangway", "Mara tells Joss she saw him at the open box. Joss goes pale, says he only put money back, and says nothing about where it came from.", ["mara", "joss"],
          [L("joss", "mara_saw", "told", 1, "mara"), L("joss", "accused", "told", 1, "mara"), L("mara", "returned", "told", 0.5, "joss"), L("joss", "stole", "heard", 0, "mara")])] },
      { id: "quiet", label: "Mara keeps it to herself", hint: "Nobody else learns anything yet.",
        events: () => [E("c2", "6:30, the yard", "Mara says nothing and sorts tickets. She keeps glancing at the box.", ["mara"], [])] },
      { id: "pier", label: "Mara waits at the pier for Inspector Venn", hint: "The inspector arrives early and is told.",
        events: () => [E("c3", "6:30, the pier", "Inspector Venn steps off the first boat. Mara tells her what she saw: the open box, the key in Joss's hand, and that she thinks he is stealing.", ["mara", "venn"], tellVenn())] },
    ],
  },
  {
    id: "venn", prompt: "7:00. Inspector Venn reaches the office for her monthly look at the books. What does she do first?",
    options: [
      { id: "count", label: "Venn counts the cash box", hint: "She sees the actual contents.",
        events: () => [E("v1", "7:00, the office", "Venn counts the box. Every coin is there.", ["venn", "mara", "joss"], [L("venn", "box_full", "saw", 1)])] },
      { id: "ask_joss", label: "Venn asks Joss for his account", hint: "What he says depends on what he thinks others know.",
        events: (s) => {
          const vennTold = !!s.aware.venn.at_box;
          const jossKnowsSeen = !!s.aware.joss.mara_saw;
          if (vennTold) return [E("v2a", "7:00, the office", "Venn tells Joss the clerk saw him at the open box. Joss insists he put money back, and keeps the rest of it to himself.", ["venn", "joss"],
            [L("joss", "accused", "told", 1, "venn"), L("joss", "mara_saw", "told", 1, "venn"), ...jossExplains().filter((e) => e.who === "venn")])];
          if (jossKnowsSeen) return [E("v2b", "7:00, the office", "Venn asks if there is anything to report. Joss, who knows Mara saw him, gets ahead of it: he opened the box and put money back.", ["venn", "joss"],
            [L("venn", "at_box", "told", 0.9, "joss"), L("venn", "returned", "told", 0.5, "joss")])];
          return [E("v2c", "7:00, the office", "Venn asks Joss if there is anything to report. Joss, who thinks he was unobserved, says no.", ["venn", "joss"], [])];
        } },
      { id: "ask_mara", label: "Venn asks Mara how the morning has been", hint: "Mara tells what she hasn't yet told.",
        events: (s) => s.aware.venn.at_box
          ? [E("v3a", "7:00, the office", "Venn asks Mara to repeat what she saw. The account does not change.", ["venn", "mara"], [])]
          : [E("v3b", "7:00, the office", "Venn asks Mara how the morning has been. Mara tells her about the open box and the key, and says she thinks Joss is stealing.", ["venn", "mara"], tellVenn())] },
      { id: "paperwork", label: "Venn goes straight to the ledgers", hint: "No one tells her anything.",
        events: () => [E("v4", "7:00, the office", "Venn spreads the ledgers on the counter and starts reading. Nobody speaks.", ["venn"], [])] },
    ],
  },
];

export function derive(s) {
  for (const c of characters) {
    const a = s.aware[c.id];
    const g = (p) => (a[p] ? a[p].cred : 0);
    const op = s.opinion[c.id].stole || 0;
    const jossActor = c.id === "joss";
    if (jossActor) {
      if (a.accused) setDeduced(s, c.id, "stole", 0);
      continue;
    }
    if (!a.at_box && !op) continue;
    let base = Math.max(0.8 * g("at_box"), op);
    base *= 1 - 0.65 * g("returned");
    base *= 1 - 0.95 * g("box_full");
    setDeduced(s, c.id, "stole", base);
  }
}

export function verdict(s) {
  const v = s.aware.venn;
  const vs = v.stole ? v.stole.cred : 0;
  const full = v.box_full && v.box_full.cred >= 0.95;
  const announce = (text) => E("x1", "later that morning", text, ["venn", "mara", "joss"],
    ["mara", "joss"].map((w) => L(w, "box_full", "told", 0.9, "venn")));
  if (full && v.at_box) return { key: "cleared", title: "The count clears him", text: "Venn weighs the clerk's account against a full box and lets Joss go. Mara learns she was wrong. Nobody ever learns about the 40 coins he borrowed, because nobody asked the question that leads there.", events: [announce("Venn tells both of them the box is whole and the matter is closed.")] };
  if (full) return { key: "routine", title: "A clean count, a wrong belief", text: "The inspection passes without a word. The box is full, and Venn has no reason to say so aloud. Mara still believes Joss was stealing, and Joss does not know she watched him.", events: [] };
  if (vs >= 0.6) return { key: "hold", title: "Joss is held on a false belief", text: "Venn acts on what she has been told: an open box, a key in his hand, a clerk who is sure. She never counts the box, so the one fact that would end it never reaches her. Joss is held pending inquiry for something he did not do.", events: [E("x2", "later that morning", "Venn detains Joss pending inquiry and seals the box unopened.", ["venn", "mara", "joss"], [L("joss", "accused", "told", 1, "venn"), L("mara", "accused", "saw", 1)])] };
  if (vs >= 0.3) return { key: "count_late", title: "Doubt sends her to the box", text: "Venn does not trust her suspicion enough to act on it, and does not trust Joss's word enough to drop it. So she counts. The box is whole, Joss is cleared, and the inspector's doubt did the work that certainty would have skipped.", events: [E("x3", "later that morning", "Venn counts the box. It is whole. She tells Mara and Joss so.", ["venn", "mara", "joss"], [L("venn", "box_full", "saw", 1), L("mara", "box_full", "told", 0.9, "venn"), L("joss", "box_full", "told", 0.9, "venn")])] };
  const m = s.aware.mara.stole ? s.aware.mara.stole.cred : 0;
  if (m >= 0.5 && s.aware.joss.mara_saw) return { key: "fester", title: "Nothing happens, and it keeps happening", text: "Venn leaves no wiser. Mara still half-believes Joss stole, Joss knows she knows, and the office runs on a silence that means different things to each of them.", events: [] };
  return { key: "quiet", title: "Everyone carries a private morning", text: "Nothing is said and nothing changes. Mara saw something, Joss did something, and neither knows what the other holds.", events: [] };
}

// The playable investigation begins with Mara's view through the window.
 // Only the director's lens may reveal Joss's unobserved opening actions.
export const directorOnlyEventIds = ["e1", "e3"];

// Authored notes distinguish testimony from what a witness directly checked.
// They are keyed by playable events, never derived from omniscient world truth.
export const caseNotes = {
  e2: { kind: "Observed", source: "Mara · through the window",
        text: "Joss was at the open box with its key. A post hid his other hand; Mara did not see what went into or out of the box." },
  c1: { kind: "Claimed", source: "Joss · at the gangway",
        text: "Joss says he was putting money back. No one has checked the count." },
  c2: { kind: "Unresolved", source: "Mara · the yard",
        text: "Mara keeps her suspicion private. Venn has not heard her account." },
  c3: { kind: "Reported", source: "Mara → Inspector Venn",
        text: "Mara describes an open box and the key in Joss's hand. Her suspicion of theft is an inference, not an observed missing count." },
  v1: { kind: "Counted", source: "Inspector Venn · cash box",
        text: "Venn counts every coin and finds the box full. The count does not establish what happened before she arrived." },
  v2a: { kind: "Claimed", source: "Joss → Inspector Venn",
        text: "Joss says he returned money. The box has not yet been counted." },
  v2b: { kind: "Claimed", source: "Joss → Inspector Venn",
        text: "Joss volunteers that he opened the box and put money back. Venn has not verified the count." },
  v2c: { kind: "Claimed", source: "Joss → Inspector Venn",
        text: "Joss says he has nothing to report. This is not a count or an independent observation." },
  v3a: { kind: "Reported", source: "Mara → Inspector Venn",
        text: "Mara repeats the account she already gave; the retelling adds no direct observation." },
  v3b: { kind: "Reported", source: "Mara → Inspector Venn",
        text: "Mara describes the key and the open box, then voices suspicion. She could not see Joss's obscured hand." },
  v4: { kind: "Unresolved", source: "Inspector Venn · ledgers",
        text: "Venn reads paperwork without asking the witnesses or checking the cash count." },
  x2: { kind: "Unresolved", source: "Inspector Venn · pending inquiry",
        text: "Joss is held on Mara's report. Venn has not counted the sealed box, so the alleged shortage is not established." },
  x3: { kind: "Counted", source: "Inspector Venn · after questioning",
        text: "After hearing conflicting accounts, Venn checks the cash and finds its full count. The inspection cannot establish what happened earlier." },
};

// Authored witness conclusions must never inherit omniscient ending narration.
// Even a finished case can establish a count without proving a hidden motive.
export const witnessEndings = {
  cleared: { title: "The box checks out",
    text: "Venn checks the cash and finds the full count. She tells Mara and Joss there is no shortage to pursue. Mara saw the open box, but the count cannot tell her what happened before she looked in." },
  routine: { title: "An ordinary inspection",
    text: "The inspection finds the box intact. Mara never tells Venn what she saw through the window, so her question remains between her and the morning." },
  hold: { title: "An inquiry without a count",
    text: "Venn acts on Mara's account and detains Joss pending inquiry, sealing the box without opening it. A witness has spoken; the money has not been checked. The question remains unresolved." },
  count_late: { title: "Doubt leads to evidence",
    text: "After hearing competing accounts, Venn checks the cash instead of treating suspicion as proof. The count is full. What happened before the inspection remains outside the count itself." },
  fester: { title: "The silence stays",
    text: "Venn leaves without pursuing the account. Mara and Joss return to work, both aware of an uneasy conversation, and neither has established what happened out of sight." },
  quiet: { title: "No one asks",
    text: "Venn finishes her paperwork and departs. Mara keeps what she saw to herself. There has been no shared account and no inspection that settles her concern." },
};

export const scene = { id: "short-count", title: "Short Count", characters, props, backstory, opening, beats, derive, verdict, directorOnlyEventIds, caseNotes, witnessEndings,
  setting: "Pell's Landing, a small river ferry office at dawn. There is a locked cash box, a key on a hook by the door, and one window facing the yard." };
export default scene;
