import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { scene } from "./src/scene.mjs";
import { replay, snapshot } from "./src/engine.mjs";
import { speak, MODEL } from "./src/voice.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4415);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

function game(pathStr) {
  const ids = pathStr ? pathStr.split(",").filter(Boolean) : [];
  const { state, beatIndex, ending } = replay(scene, ids);
  const beat = scene.beats[beatIndex];
  return {
    title: scene.title, setting: scene.setting,
    characters: scene.characters.map(({ id, name, role, color }) => ({ id, name, role, color })),
    ...snapshot(scene, state), path: ids,
    beat: beat ? { id: beat.id, prompt: beat.prompt, options: beat.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint })) } : null,
    ending: ending ? { key: ending.key, title: ending.title, text: ending.text } : null,
    model: MODEL, live: Boolean(process.env.NEBIUS_API_KEY),
  };
}

const json = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      if (url.pathname === "/api/game") return json(res, 200, game(url.searchParams.get("path") || ""));
      if (url.pathname === "/api/say" && req.method === "POST") {
        let body = ""; for await (const c of req) { body += c; if (body.length > 4000) break; }
        const { path = "", who, question = "" } = JSON.parse(body || "{}");
        if (!scene.characters.some((c) => c.id === who)) return json(res, 400, { error: "unknown character" });
        const q = String(question).slice(0, 300) || "What happened here this morning?";
        const { state } = replay(scene, path ? path.split(",").filter(Boolean) : []);
        return json(res, 200, await speak(scene, state, who, q));
      }
      let f = url.pathname === "/" ? "/index.html" : url.pathname;
      if (f.includes("..")) return json(res, 400, { error: "bad path" });
      const data = await readFile(join(here, "public", f));
      res.writeHead(200, { "content-type": types[extname(f)] || "application/octet-stream" });
      res.end(data);
    } catch (e) {
      json(res, e.code === "ENOENT" ? 404 : 400, { error: e.code === "ENOENT" ? "not found" : String(e.message) });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, () => console.log(`Masks on http://localhost:${PORT}  (Nemotron: ${process.env.NEBIUS_API_KEY ? "live" : "no key, scripted lines"})`));
}
