const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let path = [], g = null, who = "mara", lens = "story", askEpoch = 0, loadEpoch = 0;
const presets = ["What happened here this morning?", "What do you make of Joss?", "Did anyone touch the cash box?", "What will you do next?"];
const MASK = {
  mara: '<svg viewBox="0 0 48 48"><path d="M6 14c6-6 30-6 36 0 1 14-6 28-18 28S5 28 6 14z" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="17" cy="21" rx="4.5" ry="2.5" fill="currentColor"/><ellipse cx="31" cy="21" rx="4.5" ry="2.5" fill="currentColor"/><path d="M19 34c3 2 7 2 10 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  joss: '<svg viewBox="0 0 48 48"><path d="M6 14c6-6 30-6 36 0 1 14-6 28-18 28S5 28 6 14z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 20l9 3M37 20l-9 3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M18 35h12" stroke="currentColor" stroke-width="2"/></svg>',
  venn: '<svg viewBox="0 0 48 48"><path d="M6 14c6-6 30-6 36 0 1 14-6 28-18 28S5 28 6 14z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="22" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="31" cy="22" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M24 24v8h4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};
const LABEL = { knows: "Knows", "certain-wrong": "Certain", believes: "Believes", unsure: "Unsure", doubts: "Doubts", rejects: "Rules out", unaware: "No idea" };

async function load() {
  const requestId = ++loadEpoch;
  const params = new URLSearchParams({ path: path.join(","), view: lens });
  const next = await (await fetch("/api/game?" + params.toString())).json();
  if (requestId !== loadEpoch) return;
  g = next;
  render();
}
function renderPerspective(cols) {
  const director = g.lens === "director";
  $("#lens").textContent = director ? "Return to witness view" : "Reveal all minds · spoilers";
  $("#lens").setAttribute("aria-pressed", String(director));
  $("#legend").hidden = !director;
  $("#matrix").hidden = !director;
  $("#matrixViewport").hidden = !director;
  $("#matrixHint").hidden = !director;
  $("#notebook").hidden = director;
  $("#voiceTabs").innerHTML = cols.map((c) =>
    '<button type="button" class="mask" data-who="' + esc(c.id) +
    '" aria-pressed="' + String(c.id === who) + '" style="--cc:' + esc(c.color) + '">' +
    MASK[c.id] + '<span class="nm">' + esc(c.name) + '</span>' +
    '<span class="rl">' + esc(c.role) + '</span></button>').join("");
  if (director) return;
  const cards = g.notes.map((n) =>
    '<article class="note-card"><div class="note-meta"><span class="note-kind">' +
    esc(n.kind) + '</span><span>' + esc(n.source) + '</span></div>' +
    '<p>' + esc(n.text) + '</p></article>').join("");
  $("#notebook").innerHTML =
    '<div class="notebook-head"><span class="folio-mark">CASE FILE / 01</span>' +
    '<h2>What can be established?</h2><p>Witnessed details, claims and inspected facts ' +
    'are not interchangeable. The unopened count and other people\'s private thoughts stay concealed.</p></div>' +
    '<div class="note-stack">' + (cards || '<p class="hint">Nothing observed yet.</p>') +
    '</div><p class="veil-cue">Every account is partial. Question a witness or make the next choice.</p>';
}

function render() {
  const m = $("#model");
  m.textContent = g.live ? `Nemotron live: ${g.model.split("/")[1]}` : "No API key: scripted lines";
  m.className = "pill" + (g.live ? " live" : "");
  $("#events").innerHTML = g.events.map((e) => `<li><span class="at">${esc(e.at)}</span>${esc(e.text)}</li>`).join("");
  const beat = $("#beat");
  if (g.beat) {
    beat.innerHTML = `<h2>${esc(g.beat.prompt)}</h2><div class="opts">${g.beat.options.map((o) => `<button class="opt" data-id="${o.id}"><b>${esc(o.label)}</b><span>${esc(o.hint)}</span></button>`).join("")}</div>`;
    beat.querySelectorAll(".opt").forEach((b) => (b.onclick = () => { path.push(b.dataset.id); load(); }));
  } else if (g.ending) {
    beat.innerHTML = `<div class="ending"><h2>${esc(g.ending.title)}</h2><p>${esc(g.ending.text)}</p><p class="hint">Compare the columns: every one of them acted on a different morning. Ask any of them what they think now.</p></div>`;
  }
  const cols = g.characters;
  renderPerspective(cols);
  let h = `<div class="mh" role="columnheader"></div><div class="mh truth" role="columnheader" style="align-self:end">Truth</div>`;
  for (const c of cols) h += `<div class="mh" role="columnheader"><button class="mask" data-who="${c.id}" aria-pressed="${c.id === who}" style="--cc:${c.color}">${MASK[c.id]}<span class="nm">${esc(c.name)}</span><span class="rl">${esc(c.role)}</span></button></div>`;
  for (const r of g.matrix) {
    h += `<div class="ptext" role="rowheader">${esc(r.text)}</div><div class="truth ${r.truth ? "t" : "f"}">${r.truth ? "true" : "false"}</div>`;
    for (const c of cols) {
      const x = r.cells[c.id];
      if (x.stance === "unaware") { h += `<div class="cell un"><span class="st">No idea</span></div>`; continue; }
      const cls = x.wrong ? "wrong" : x.mode === "told" ? "told" : x.mode === "deduced" ? "deduced" : "";
      const how = { did: "did it", saw: "saw it", told: `told${x.from ? " by " + cols.find((k) => k.id === x.from)?.name.split(" ")[0] : ""}`, deduced: "worked out", heard: "just heard" }[x.mode];
      h += `<div class="cell ${cls}"><span class="st">${LABEL[x.stance]}${x.cred < 0.95 && x.cred > 0.05 ? " " + Math.round(x.cred * 100) + "%" : ""}</span><span class="bar"><i style="width:${Math.round(x.cred * 100)}%"></i></span><small>${how}${x.wrong ? ", wrongly" : ""}</small></div>`;
    }
  }
  $("#matrix").innerHTML = h;
  document.querySelectorAll(".mask").forEach((b) => (b.onclick = () => { who = b.dataset.who; ++askEpoch; $("#reply").innerHTML = ""; render(); }));
  const c = cols.find((k) => k.id === who);
  $("#voice").style.setProperty("--cc", c.color);
  $("#askLabel").textContent = `Ask ${c.name.split(" ")[0] === "Inspector" ? "Venn" : c.name.split(" ")[0]}`;
  $("#chips").innerHTML = presets.map((p) => `<button type="button">${esc(p)}</button>`).join("");
  $("#chips").querySelectorAll("button").forEach((b) => (b.onclick = () => { $("#q").value = b.textContent; ask(); }));
}
async function ask() {
  const token = ++askEpoch;
  const askedWho = who, askedLens = lens;
  const q = $("#q").value.trim() || presets[0];
  const btn = $("#ask");
  btn.disabled = true;
  btn.textContent = "Asking...";
  $("#reply").innerHTML = '<p class="hint">Listening to the witness...</p>';
  const c = g.characters.find((k) => k.id === askedWho);
  try {
    const response = await fetch("/api/say", { method: "POST",
      body: JSON.stringify({ path: path.join(","), who: askedWho, question: q, view: askedLens }) });
    const r = await response.json();
    if (token !== askEpoch || askedLens !== lens || askedWho !== who) return;
    if (!response.ok) throw new Error(r.error || "The witness could not answer.");
    const attempts = Array.isArray(r.attempts) ? r.attempts : [];
    const rejected = attempts.filter((a) => a.violations && a.violations.length);
    const badge = r.source === "nemotron"
      ? '<span class="badge ok">Knowledge guard passed</span><span class="badge">' +
        esc(r.model || "Nemotron") + '</span>'
      : '<span class="badge no">Scripted line</span><span class="badge">' + esc(r.reason || "") + '</span>';
    const diagnostics = askedLens === "director"
      ? rejected.map((a) => '<div class="rej">Rejected: "' + esc(a.line) + '"<br>' +
          a.violations.map((v) => esc(v.why)).join(" ") + '</div>').join("") +
        (r.prompt ? '<details><summary>What the model was shown</summary><pre>' +
          esc(r.prompt) + '</pre></details>' : "")
      : '<p class="review-note">The private model prompt and rejected drafts are hidden in witness view. ' +
        (r.blockedCount ? String(r.blockedCount) + ' rejected draft(s).' : 'Open the director\'s lens to inspect the mechanism.') +
        '</p>';
    $("#reply").innerHTML = '<p class="say" style="--cc:' + esc(c.color) + '">' +
      esc(r.line) + '</p>' + badge + diagnostics;
  } catch (e) {
    if (token === askEpoch) $("#reply").innerHTML = '<p class="hint">Request failed: ' + esc(e.message) + '</p>';
  } finally {
    if (token === askEpoch) { btn.disabled = false; btn.textContent = "Ask"; }
  }
}
$("#askForm").onsubmit = (e) => { e.preventDefault(); ask(); };
$("#lens").onclick = () => { lens = lens === "story" ? "director" : "story";
  ++askEpoch; $("#reply").innerHTML = ""; $("#ask").disabled = false; $("#ask").textContent = "Ask"; load(); };
$("#restart").onclick = () => { path = []; lens = "story"; who = "mara";
  ++askEpoch; $("#reply").innerHTML = ""; $("#q").value = ""; load(); };
load();
