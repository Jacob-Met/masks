// Deterministic epistemic-state engine: who has seen, been told, or concluded what.
// No randomness, no clock, no network. Same choices in -> same minds out.

export const RANK = { did: 4, saw: 3, told: 2, heard: 1, deduced: 0 };

export function newState(scene) {
  const s = { events: [], aware: {}, opinion: {}, choices: [] };
  for (const c of scene.characters) { s.aware[c.id] = {}; s.opinion[c.id] = {}; }
  for (const ev of scene.backstory) applyEvent(s, scene, ev, true);
  return s;
}

function learn(s, eff) {
  const { who, prop, mode, cred, from = null } = eff;
  const cur = s.aware[who][prop];
  if (eff.opinion) { s.opinion[who][prop] = Math.max(s.opinion[who][prop] || 0, cred); return; }
  if (cur && RANK[cur.mode] > RANK[mode]) return;
  if (cur && RANK[cur.mode] === RANK[mode] && cur.cred > cred) return;
  s.aware[who][prop] = { cred, mode, from };
}

export function applyEvent(s, scene, ev, silent = false) {
  for (const e of ev.effects || []) learn(s, e);
  if (!silent) s.events.push({ id: ev.id, text: ev.text, at: ev.at, present: ev.present || [] });
  derive(s, scene);
  return s;
}

// Re-compute everything that is concluded rather than perceived.
function derive(s, scene) {
  for (const c of scene.characters) for (const [p, e] of Object.entries(s.aware[c.id])) if (e.mode === "deduced") delete s.aware[c.id][p];
  scene.derive(s);
}

export function setDeduced(s, who, prop, cred) {
  const cur = s.aware[who][prop];
  if (cur && cur.mode !== "deduced") return;
  s.aware[who][prop] = { cred: Math.max(0, Math.min(1, +cred.toFixed(3))), mode: "deduced", from: null };
}

export function stance(entry, truth) {
  if (!entry) return "unaware";
  const c = entry.cred;
  if (c >= 0.95) return truth ? "knows" : "certain-wrong";
  if (c >= 0.6) return "believes";
  if (c >= 0.35) return "unsure";
  if (c > 0.05) return "doubts";
  return "rejects";
}

// Does this character hold a belief that contradicts the world?
export function isWrong(entry, truth) {
  if (!entry) return false;
  return truth ? entry.cred < 0.35 : entry.cred >= 0.6;
}

export function replay(scene, choiceIds) {
  const s = newState(scene);
  for (const ev of scene.opening) applyEvent(s, scene, ev);
  const beats = scene.beats;
  let i = 0;
  for (const id of choiceIds) {
    const beat = beats[i];
    if (!beat) throw new Error("too many choices");
    const opt = beat.options.find((o) => o.id === id);
    if (!opt) throw new Error(`unknown choice ${id} for beat ${beat.id}`);
    for (const ev of opt.events(s)) applyEvent(s, scene, ev);
    s.choices.push(id);
    i++;
  }
  let ending = null;
  if (i >= beats.length) {
    ending = scene.verdict(s);
    for (const ev of ending.events || []) applyEvent(s, scene, ev);
  }
  return { state: s, beatIndex: i, ending };
}

export function snapshot(scene, state) {
  const matrix = scene.props.map((p) => ({
    id: p.id, text: p.text, truth: p.truth,
    cells: Object.fromEntries(scene.characters.map((c) => {
      const e = state.aware[c.id][p.id];
      return [c.id, e ? { stance: stance(e, p.truth), cred: e.cred, mode: e.mode, from: e.from, wrong: isWrong(e, p.truth) } : { stance: "unaware", wrong: false }];
    })),
  }));
  return { matrix, events: state.events };
}
