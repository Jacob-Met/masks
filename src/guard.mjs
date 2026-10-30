// The checker. Independent of the model: it only reads the engine's state.
import { stance } from "./engine.mjs";

export function propsInText(scene, text) {
  return scene.props.filter((p) => p.signals.some((r) => r.test(text))).map((p) => p.id);
}

// A line is rejected when it talks about a proposition the speaker is unaware of
// (cannot know), or voluntarily airs a secret the speaker is keeping.
export function checkLine(scene, state, who, line, extraAware = []) {
  const ch = scene.characters.find((c) => c.id === who);
  const aware = state.aware[who];
  const violations = [];
  for (const id of propsInText(scene, line)) {
    if (extraAware.includes(id)) continue;
    const p = scene.props.find((x) => x.id === id);
    if (!aware[id]) violations.push({ prop: id, kind: "cannot-know", why: `${ch.name} has no way to know that: "${p.text}".` });
    else if (ch.conceal.includes(id)) violations.push({ prop: id, kind: "secret", why: `${ch.name} is keeping this to themselves: "${p.text}".` });
  }
  return { ok: violations.length === 0, violations };
}

export function knowledgeBrief(scene, state, who) {
  const aware = state.aware[who];
  const lines = [];
  for (const p of scene.props) {
    const e = aware[p.id];
    if (!e) continue;
    const how = e.mode === "did" ? "you did this yourself" : e.mode === "saw" ? "you saw it yourself" : e.mode === "told" ? `${nameOf(scene, e.from)} told you` : e.mode === "deduced" ? "you worked this out from other things you know" : "someone just said it to you";
    const st = stance(e, p.truth);
    const level = e.cred >= 0.95 ? "you are certain" : e.cred >= 0.6 ? "you believe it" : e.cred >= 0.35 ? "you are unsure" : e.cred > 0.05 ? "you doubt it" : "you are sure it is not so";
    lines.push(`- ${p.text} (${level}; ${how})`);
    void st;
  }
  return lines;
}
const nameOf = (scene, id) => (scene.characters.find((c) => c.id === id) || { name: "someone" }).name;
