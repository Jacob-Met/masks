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

## Play the mystery before inspecting the mechanism

**Witness view** is the default. The opening shows only what Mara could
observe through the ferry-office window. Each choice adds a case-file card
marked **Observed**, **Claimed**, **Reported**, **Counted**, or **Unresolved**
instead of pretending that suspicion and verification are the same thing.
The full underlying world-truth matrix and Joss's unobserved opening actions
are deliberately withheld during play. You can still question any character.

The case ending is also narrated from what witnesses could establish, not from hidden backstory. The director retains the complete original epilogue.

**Reveal all minds · spoilers** switches explicitly to the original director's
belief matrix, all opening events, and inspectable model prompts and rejected
attempts. You can return to witness view. Changing lenses clears the displayed
reply so a previously exposed prompt does not remain on screen. **Revisit decision** steps back to the previous choice without losing the earlier choices; **Start over**
returns to the default unspoiled case.

The playable HTTP game response omits omniscient matrix data and private opening
events by default. The reply API omits private model prompts and rejected text
by default; an explicit director request includes them. These are
**presentation/spoiler boundaries, not access control**: someone inspecting the
local application may deliberately select the director view, and the dialogue
guard remains a bounded regex heuristic rather than a privacy guarantee.
The offline scripted dialogue path needs no credential or external service.

### Reproducible offline review package

Run python3 scripts/package.py to create a ZIP, checksum sidecar and internal
file-hash manifest in dist/. Extract the ZIP, enter its masks/ directory, run
node --test, then node server.mjs. The package contains the source application,
tests and README, but no keys or network dependencies.

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
