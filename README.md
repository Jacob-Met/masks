# Masks

Playable stories where characters observe, believe and know different things. A deterministic epistemic-state engine tracks who saw, was told or worked out what. Nemotron voices a character strictly from that character's own knowledge, and the engine checks the line for forbidden knowledge before it is shown.

The bundled scene, "Short Count", is a ferry office with a cash box, a clerk who saw something, a deckhand with a secret and an inspector who has only been told.

## Quick start

Requires Node 22+. No npm dependencies.

```
export NEBIUS_API_KEY=...   # Nebius Token Factory key
node server.mjs             # http://localhost:4415
node --test                 # 19 tests, no network needed
```

Without a key the app still runs and uses scripted lines, labelled as such in the UI.

## How it uses NVIDIA Nemotron on Nebius Token Factory

- Model: `nvidia/nemotron-3-super-120b-a12b` (override with `MASKS_MODEL`), called server-side at `https://api.tokenfactory.nebius.com/v1/chat/completions`. The browser never sees the key.
- Why this size: dialogue must stay inside a strict knowledge list (belief vs. certainty, secrets), which needs solid instruction following.
- What it does: for each question, the prompt contains only what that character witnessed and believes, with credence levels and sources. Nemotron answers in character.
- How it is checked: `src/guard.mjs` is independent of the model. It rejects lines that mention something the speaker cannot know, or that airs a secret they are keeping. A rejected line goes back to the model with the reason (up to 3 tries), then falls back to a scripted line. The UI shows rejected attempts and the prompt.

## Limits

- One scene. The guard detects propositions with regex signals, so it can both over- and under-flag paraphrases.
- Reasoning-model latency makes replies take several seconds.

## License

MIT
