import test from "node:test";
import assert from "node:assert/strict";
import { scene } from "../src/scene.mjs";
import { replay, snapshot } from "../src/engine.mjs";
import { presentCase, presentReply } from "../src/perspective.mjs";
import { createServer } from "../server.mjs";

test("default playable view never sends hidden opening or truth matrix", () => {
  const original = snapshot(scene, replay(scene, []).state);
  assert.equal(original.events.length, 3);
  assert.ok(original.matrix.some((p) => p.id === "borrowed"));
  const view = presentCase(scene, original, undefined);
  assert.equal(view.lens, "story");
  assert.deepEqual(view.events.map((x) => x.id), ["e2"]);
  assert.deepEqual(view.notes.map((x) => x.id), ["e2"]);
  assert.deepEqual(view.matrix, []);
  assert.doesNotMatch(JSON.stringify(view), /Joss borrowed|Joss counts forty|Joss put the 40 coins back/);
});

test("story lens includes only authored, visible claims on every completed branch", () => {
  for (const a of scene.beats[0].options) for (const b of scene.beats[1].options) {
    for (const ids of [[], [a.id], [a.id, b.id]]) {
      const original = snapshot(scene, replay(scene, ids).state);
      const view = presentCase(scene, original, "story");
      assert.deepEqual(view.matrix, []);
      assert.equal(view.events.some((e) => ["e1", "e3"].includes(e.id)), false);
      assert.equal(view.notes.every((n) => view.events.some((e) => e.id === n.id)), true);
      assert.ok(view.notes.every((n) => ["Observed", "Claimed", "Reported", "Counted", "Unresolved"].includes(n.kind)));
    }
  }
});

test("director lens preserves complete engine evidence, without changing outcomes", () => {
  const run = replay(scene, ["pier", "count"]);
  const original = snapshot(scene, run.state);
  assert.deepEqual(presentCase(scene, original, "director").matrix, original.matrix);
  assert.deepEqual(presentCase(scene, original, "director").events, original.events.map(({id,at,text}) => ({id,at,text})));
  assert.equal(run.ending.key, "cleared");
});

test("invalid view fails closed; model private attempts and prompt withheld until explicit director lens", () => {
  const stored = { source: "nemotron", line: "I was at the office.",
    model: "model", prompt: "private knowledge", reason: "",
    attempts: [{line:"secret", violations:[{why:"secret leak"}]}, {line:"safe", violations:[]}] };
  const safe = presentReply(stored, "stroy");
  assert.equal(safe.line, stored.line);
  assert.equal(safe.blockedCount, 1);
  assert.equal(safe.attemptCount, 2);
  assert.ok(!("prompt" in safe) && !("attempts" in safe));
  assert.deepEqual(presentReply(stored, "director"), stored);
});

test("real HTTP game route defaults to playable view, director requires opt-in", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const query of ["", "?view=typo", "?view=director-ish", "?path=pier"]) {
      const response = await fetch(base + "/api/game" + query);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.lens, "story");
      assert.equal(data.matrix.length, 0);
      assert.ok(!data.events.some((e) => e.id === "e1" || e.id === "e3"));
    }
    const director = await (await fetch(base + "/api/game?view=director")).json();
    assert.ok(director.matrix.some((r) => r.id === "borrowed"));
    assert.ok(director.events.some((r) => r.id === "e1"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
