import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server.mjs";

// Deliberately hits the REAL HTTP entry point rather than only the narrative helper.
test("witness endings never narrate a secret or omniscient verdict; director retains original", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const first of ["confront", "quiet", "pier"]) for (const second of ["count", "ask_joss", "ask_mara", "paperwork"]) {
      const path = [first, second].join(",");
      const story = await (await fetch(base + "/api/game?path=" + path)).json();
      const director = await (await fetch(base + "/api/game?path=" + path + "&view=director")).json();
      assert.equal(story.lens, "story");
      assert.equal(director.lens, "director");
      assert.equal(story.ending.key, director.ending.key);
      assert.doesNotMatch(story.ending.text, /borrowed|40 coins|forty coins|something he did not do|wrong belief|he was wrong/i, path);
      assert.equal(story.ending?.title.length > 2, true);
      assert.equal(director.ending?.title.length > 2, true);
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("no missing authored witness ending can fall through to the omniscient one", async () => {
  const { scene } = await import("../src/scene.mjs");
  const { replay } = await import("../src/engine.mjs");
  const { presentEnding } = await import("../src/perspective.mjs");
  const allPaths = scene.beats[0].options.flatMap((a) => scene.beats[1].options.map((b) => [a.id,b.id]));
  for (const ids of allPaths) {
    const ending = replay(scene, ids).ending;
    assert.deepEqual(presentEnding(scene, ending, "story"), {
      key: ending.key, title: scene.witnessEndings[ending.key].title,
      text: scene.witnessEndings[ending.key].text
    });
    assert.equal(presentEnding(scene, ending, "director").text, ending.text);
    const unsafeScene = { ...scene, witnessEndings: {} };
    assert.throws(() => presentEnding(unsafeScene, ending, "story"), /missing playable ending/);
  }
  assert.equal(presentEnding(scene, null, "story"), null);
});

test("late counts and unverified holds appear in the actual witness case file", async () => {
  const { scene } = await import("../src/scene.mjs");
  const { replay, snapshot } = await import("../src/engine.mjs");
  const { presentCase } = await import("../src/perspective.mjs");
  const late = presentCase(scene, snapshot(scene, replay(scene, ["pier", "ask_joss"]).state), "story");
  const hold = presentCase(scene, snapshot(scene, replay(scene, ["pier", "paperwork"]).state), "story");
  assert.equal(late.notes.find((n) => n.id === "x3")?.kind, "Counted");
  assert.equal(hold.notes.find((n) => n.id === "x2")?.kind, "Unresolved");
  assert.doesNotMatch(JSON.stringify(late), /Joss borrowed|Joss counts forty|Joss put the 40 coins back/);
});
