import test from "node:test";
import assert from "node:assert/strict";
import { scene } from "../src/scene.mjs";
import { replay } from "../src/engine.mjs";

const run = (...ids) => replay(scene, ids);
const cred = (r, who, p) => (r.state.aware[who][p] ? r.state.aware[who][p].cred : null);

test("opening: each character holds a different slice of the morning", () => {
  const r = run();
  assert.equal(cred(r, "joss", "returned"), 1);
  assert.equal(cred(r, "mara", "returned"), null);
  assert.equal(cred(r, "venn", "at_box"), null);
  assert.equal(cred(r, "joss", "mara_saw"), null);
  assert.equal(cred(r, "mara", "stole"), 0.8);
  assert.equal(cred(r, "joss", "stole"), null);
});

test("determinism: same choices give identical minds", () => {
  assert.deepEqual(run("pier", "count").state.aware, run("pier", "count").state.aware);
});

test("telling transfers discounted belief, not knowledge", () => {
  const r = run("pier");
  assert.equal(r.state.aware.venn.at_box.mode, "told");
  assert.ok(r.state.aware.venn.at_box.cred < 0.95);
  assert.ok(cred(r, "venn", "stole") >= 0.4);
});

test("confronting makes Joss aware he was seen, and Mara doubts a little", () => {
  const r = run("confront");
  assert.equal(cred(r, "joss", "mara_saw"), 1);
  assert.equal(cred(r, "joss", "stole"), 0);
  assert.ok(cred(r, "mara", "stole") < 0.8);
  assert.equal(cred(r, "mara", "borrowed"), null);
});

test("ending: told but never counted leads to a wrongful hold", () => {
  const r = run("pier", "paperwork");
  assert.equal(r.ending.key, "hold");
});

test("ending: count after being told clears Joss and corrects Mara", () => {
  const r = run("pier", "count");
  assert.equal(r.ending.key, "cleared");
  assert.ok(cred(r, "mara", "stole") < 0.2);
  assert.equal(cred(r, "venn", "borrowed"), null);
});

test("ending: count without being told leaves Mara wrong", () => {
  const r = run("quiet", "count");
  assert.equal(r.ending.key, "routine");
  assert.equal(cred(r, "mara", "stole"), 0.8);
});

test("ending: Joss's explanation turns a hold into doubt, then a count", () => {
  assert.equal(run("pier", "ask_joss").ending.key, "count_late");
});

test("ending: nothing said", () => {
  assert.equal(run("quiet", "paperwork").ending.key, "quiet");
  assert.equal(run("confront", "paperwork").ending.key, "fester");
});

test("every path of choices resolves to an ending", () => {
  for (const a of scene.beats[0].options) for (const b of scene.beats[1].options) assert.ok(run(a.id, b.id).ending.key, `${a.id}/${b.id}`);
});

test("invalid choices are rejected", () => {
  assert.throws(() => run("nope"));
  assert.throws(() => run("quiet", "count", "count"));
});
