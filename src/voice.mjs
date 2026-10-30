// Nemotron on Nebius Token Factory voices one character, from that character's own
// knowledge state only. The engine's guard then checks the line before it is shown.
import { checkLine, knowledgeBrief, propsInText } from "./guard.mjs";

export const BASE_URL = process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1";
export const MODEL = process.env.MASKS_MODEL || "nvidia/nemotron-3-super-120b-a12b";

export function buildMessages(scene, state, who, question, feedback = [], heardIds = []) {
  const ch = scene.characters.find((c) => c.id === who);
  const know = knowledgeBrief(scene, state, who);
  const memory = state.events.filter((e) => e.present.includes(who)).map((e) => `- ${e.at}: ${e.text}`);
  const others = scene.characters.filter((c) => c.id !== who).map((c) => `${c.name} (${c.role})`).join(", ");
  const heard = heardIds.map((id) => scene.props.find((p) => p.id === id).text);
  const sys = [
    `You are ${ch.name}, ${ch.role}, in a short interactive story. Setting: ${scene.setting}`,
    `Personality: ${ch.persona}`,
    `Others in the story: ${others}.`,
    `Reply as ${ch.name}, in first person, one to three sentences of spoken dialogue. No stage directions, no quotation marks, no narration, no out-of-character remarks.`,
    `Your whole mind is the two lists below. You know nothing else about this morning. If asked about anything that is not in your lists, say honestly that you do not know or have no idea. Speak naturally, as a person would, not as a list being read out. Never guess at hidden facts, and never state that something is true if the list says you only believe it or doubt it.`,
    ch.conceal.length ? `You are keeping some things private. Do not volunteer anything you would want hidden unless the list says you were confronted with it.` : "",
    `WHAT YOU WITNESSED:\n${memory.length ? memory.join("\n") : "- Nothing of note."}`,
    `WHAT YOU KNOW AND BELIEVE:\n${know.length ? know.join("\n") : "- Nothing about the cash box or what has happened this morning."}`,
    heard.length ? `JUST SAID TO YOU (you have not verified it):\n${heard.map((h) => `- ${h}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  const msgs = [{ role: "system", content: sys }, { role: "user", content: question }];
  if (feedback.length) msgs.push({ role: "user", content: `Your last reply was rejected because: ${feedback.join(" ")} Reply again as ${ch.name}, without touching on those things.` });
  return msgs;
}

export function cleanReply(text) {
  if (!text) return "";
  let t = String(text).replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "").trim();
  t = t.replace(/^[A-Za-z .]+:\s+/, (m) => (m.length < 24 ? "" : m)).replace(/^["“]|["”]$/g, "").trim();
  return t;
}

export async function callNemotron(messages, { fetchImpl = fetch, apiKey = process.env.NEBIUS_API_KEY, model = MODEL, signal } = {}) {
  if (!apiKey) { const e = new Error("NEBIUS_API_KEY is not set"); e.code = "NO_KEY"; throw e; }
  const res = await fetchImpl(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.7 }),
    signal,
  });
  if (!res.ok) { const e = new Error(`Token Factory returned ${res.status}`); e.code = "HTTP"; throw e; }
  const j = await res.json();
  return cleanReply(j.choices?.[0]?.message?.content);
}

export function fallbackLine(scene, state, who, heardIds = []) {
  const a = state.aware[who];
  const c = (p) => (a[p] ? a[p].cred : null);
  if (who === "mara") {
    if (c("returned") !== null && c("stole") !== null && c("stole") < 0.6) return "He says he put money back. I only saw the box open and the key in his hand, so I can't say more than that.";
    if (c("box_full") >= 0.9) return "If the count is whole, then I was wrong about him, and I'll say so.";
    return "I saw Joss at the open box with the key in his hand. I can't tell you what was in his other hand.";
  }
  if (who === "joss") {
    if (c("accused") !== null) return "I opened the box, yes, and I put money back before I locked it. That's all I'll say about it.";
    return "Nothing to report. Quiet morning, boats on time.";
  }
  if (c("stole") !== null && c("stole") >= 0.6) return "I have a clerk's account of an open box and a key, and I act on evidence. I have not yet seen the contents myself.";
  if (c("box_full") >= 0.9) return "The count is in order. Beyond that, I have nothing I am prepared to state.";
  if (c("at_box") !== null) return "I have been told the box was opened this morning. I can't say more until I have verified it.";
  return "I only arrived this morning. I have nothing to report.";
}

// Voice one line. Up to `tries` model attempts; each rejected line goes back with the reason.
export async function speak(scene, state, who, question, opts = {}) {
  const { tries = 3 } = opts;
  const heardIds = propsInText(scene, question).filter((id) => !state.aware[who][id]);
  const attempts = [];
  const feedback = [];
  let prompt = null;
  for (let i = 0; i < tries; i++) {
    const messages = buildMessages(scene, state, who, question, feedback, heardIds);
    if (!prompt) prompt = messages[0].content;
    let line;
    try { line = await callNemotron(messages, opts); }
    catch (e) {
      if (e.code === "NO_KEY") return { source: "fallback", reason: "NEBIUS_API_KEY is not set, so this is the engine's scripted line.", line: fallbackLine(scene, state, who, heardIds), attempts, prompt, ok: true };
      attempts.push({ line: null, error: e.message });
      continue;
    }
    if (!line) { attempts.push({ line: null, error: "empty reply" }); continue; }
    const check = checkLine(scene, state, who, line, heardIds);
    attempts.push({ line, ok: check.ok, violations: check.violations });
    if (check.ok) return { source: "nemotron", model: opts.model || MODEL, line, attempts, prompt, ok: true };
    feedback.length = 0;
    feedback.push(...check.violations.map((v) => v.why));
  }
  return { source: "fallback", reason: "Nemotron's lines were rejected or unavailable, so this is the engine's scripted line.", line: fallbackLine(scene, state, who, heardIds), attempts, prompt, ok: true };
}
