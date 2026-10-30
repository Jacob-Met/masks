import test from "node:test";
import assert from "node:assert/strict";
import { scene } from "../src/scene.mjs";
import { replay } from "../src/engine.mjs";
import { checkLine } from "../src/guard.mjs";
import { speak, buildMessages, cleanReply } from "../src/voice.mjs";

const mind = (...ids) => replay(scene, ids).state;
const fakeFetch = (...lines) => { let i = 0; const calls = []; const f = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), auth: init.headers.authorization }); const l = lines[Math.min(i++, lines.length - 1)]; return { ok: true, json: async () => ({ choices: [{ message: { content: l } }] }) }; }; f.calls = calls; return f; };

test("guard flags a line about something the speaker cannot know", () => {
  const s = mind("quiet");
  assert.equal(checkLine(scene, s, "venn", "Joss put the forty coins back, I'm told.").ok, false);
  assert.equal(checkLine(scene, s, "venn", "I only arrived this morning.").ok, true);
  assert.equal(checkLine(scene, s, "mara", "I saw him at the open box, and I think he stole.").ok, true);
});

test("guard flags a secret the speaker is keeping", () => {
  const s = mind("quiet");
  const v = checkLine(scene, s, "joss", "I borrowed forty coins last week.");
  assert.equal(v.ok, false);
  assert.equal(v.violations[0].kind, "secret");
});

test("the prompt never contains facts the character cannot know", () => {
  const s = mind("quiet");
  const sys = buildMessages(scene, s, "venn", "What happened?")[0].content;
  assert.ok(!/forty|40 coins|stole|borrowed/i.test(sys));
  const mara = buildMessages(scene, s, "mara", "What happened?")[0].content;
  assert.ok(/Joss stole from the cash box/.test(mara) && /you believe it/.test(mara));
  assert.ok(!/borrowed/.test(mara));
});

test("a leaking reply is rejected, fed back, and the retry is accepted", async () => {
  const s = mind("quiet");
  const f = fakeFetch("Joss returned the forty coins this morning.", "I know nothing about that. I only just arrived.");
  const r = await speak(scene, s, "venn", "What do you make of Joss?", { fetchImpl: f, apiKey: "test-key" });
  assert.equal(r.source, "nemotron");
  assert.equal(r.attempts.length, 2);
  assert.equal(r.attempts[0].ok, false);
  assert.match(f.calls[1].body.messages.at(-1).content, /rejected/);
  assert.equal(f.calls[0].url, "https://api.tokenfactory.nebius.com/v1/chat/completions");
  assert.equal(f.calls[0].auth, "Bearer test-key");
  assert.ok(f.calls[0].body.max_tokens >= 1500);
});

test("persistent leaks fall back to the scripted line, which passes the guard", async () => {
  const s = mind("quiet");
  const r = await speak(scene, s, "venn", "Hello?", { fetchImpl: fakeFetch("He stole it and returned the forty coins."), apiKey: "k" });
  assert.equal(r.source, "fallback");
  assert.equal(checkLine(scene, s, "venn", r.line).ok, true);
});

test("a fact mentioned in the player's question is allowed in the reply as hearsay", async () => {
  const s = mind("quiet");
  const r = await speak(scene, s, "venn", "Did Joss steal anything?", { fetchImpl: fakeFetch("I can't say whether anyone stole anything. I have seen nothing."), apiKey: "k" });
  assert.equal(r.source, "nemotron");
});

test("no key gives a graceful scripted line, no network call", async () => {
  const f = fakeFetch("x");
  const r = await speak(scene, mind("quiet"), "mara", "Hi", { fetchImpl: f, apiKey: "" });
  assert.equal(r.source, "fallback");
  assert.match(r.reason, /NEBIUS_API_KEY/);
  assert.equal(f.calls.length, 0);
});

test("cleanReply strips think blocks", () => {
  assert.equal(cleanReply("<think>hmm</think>Hello there."), "Hello there.");
});
