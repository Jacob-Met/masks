const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let path = [], g = null, who = "mara";
const presets = ["What happened here this morning?", "What do you make of Joss?", "Did anyone touch the cash box?", "What will you do next?"];
const MASK = {
  mara: '<svg viewBox="0 0 48 48"><path d="M6 14c6-6 30-6 36 0 1 14-6 28-18 28S5 28 6 14z" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="17" cy="21" rx="4.5" ry="2.5" fill="currentColor"/><ellipse cx="31" cy="21" rx="4.5" ry="2.5" fill="currentColor"/><path d="M19 34c3 2 7 2 10 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  joss: '<svg viewBox="0 0 48 48"><path d="M6 14c6-6 30-6 36 0 1 14-6 28-18 28S5 28 6 14z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 20l9 3M37 20l-9 3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M18 35h12" stroke="currentColor" stroke-width="2"/></svg>',
  venn: '<svg viewBox="0 0 48 48"><path d="M6 14c6-6 30-6 36 0 1 14-6 28-18 28S5 28 6 14z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="22" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="31" cy="22" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M24 24v8h4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};
const LABEL = { knows: "Knows", "certain-wrong": "Certain", believes: "Believes", unsure: "Unsure", doubts: "Doubts", rejects: "Rules out", unaware: "No idea" };

async function load() {
  g = await (await fetch(`/api/game?path=${path.join(",")}`)).json();
  render();
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
  document.querySelectorAll(".mask").forEach((b) => (b.onclick = () => { who = b.dataset.who; $("#reply").innerHTML = ""; render(); }));
  const c = cols.find((k) => k.id === who);
  $("#voice").style.setProperty("--cc", c.color);
  $("#askLabel").textContent = `Ask ${c.name.split(" ")[0] === "Inspector" ? "Venn" : c.name.split(" ")[0]}`;
  $("#chips").innerHTML = presets.map((p) => `<button type="button">${esc(p)}</button>`).join("");
  $("#chips").querySelectorAll("button").forEach((b) => (b.onclick = () => { $("#q").value = b.textContent; ask(); }));
}
async function ask() {
  const q = $("#q").value.trim() || presets[0];
  const btn = $("#ask"); btn.disabled = true; btn.textContent = "Asking...";
  $("#reply").innerHTML = `<p class="hint">Nemotron is answering from ${esc(who)}'s own mind...</p>`;
  const c = g.characters.find((k) => k.id === who);
  try {
    const r = await (await fetch("/api/say", { method: "POST", body: JSON.stringify({ path: path.join(","), who, question: q }) })).json();
    const rejected = r.attempts.filter((a) => a.violations && a.violations.length);
    const badge = r.source === "nemotron"
      ? `<span class="badge ok">Check passed: nothing ${esc(c.name.split(" ")[0])} cannot know</span><span class="badge">${esc(r.model.split("/")[1])} via Nebius, attempt ${r.attempts.length}</span>`
      : `<span class="badge no">Scripted line</span><span class="badge">${esc(r.reason)}</span>`;
    const rej = rejected.map((a) => `<div class="rej">Rejected: "${esc(a.line)}"<br>${a.violations.map((v) => esc(v.why)).join(" ")}</div>`).join("");
    $("#reply").innerHTML = `<p class="say" style="--cc:${c.color}">${esc(r.line)}</p>${badge}${rej}<details><summary>What the model was shown</summary><pre>${esc(r.prompt)}</pre></details>`;
  } catch (e) { $("#reply").innerHTML = `<p class="hint">Request failed: ${esc(e.message)}</p>`; }
  btn.disabled = false; btn.textContent = "Ask";
}
$("#askForm").onsubmit = (e) => { e.preventDefault(); ask(); };
$("#restart").onclick = () => { path = []; $("#reply").innerHTML = ""; $("#q").value = ""; load(); };
load();
