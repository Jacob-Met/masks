// One source of truth, two explicit reading contracts.
// The playable view cannot receive the engine's omniscient proposition matrix.
export function presentCase(scene, recorded, requestedView) {
  const director = requestedView === "director";
  const privateIds = new Set(scene.directorOnlyEventIds || []);
  const events = recorded.events
    .filter((event) => director || !privateIds.has(event.id))
    .map(({ id, text, at }) => ({ id, text, at }));
  if (director) {
    return { lens: "director", events, matrix: recorded.matrix, notes: [] };
  }
  const notes = events.flatMap((event) => {
    const note = scene.caseNotes?.[event.id];
    return note ? [{ id: event.id, at: event.at, kind: note.kind,
      source: note.source, text: note.text }] : [];
  });
  return { lens: "story", events, matrix: [], notes };
}

// Transcript-level model inspection would spoil a character's private knowledge.
// The playable view retains the spoken answer and review count, but not prompts,
// rejected candidate text, or guard diagnostics. Director mode is explicit.
export function presentReply(recorded, requestedView) {
  if (requestedView === "director") return recorded;
  const { prompt, attempts, ...safe } = recorded;
  const records = Array.isArray(attempts) ? attempts : [];
  return { ...safe, attemptCount: records.length,
    blockedCount: records.filter((r) => r.violations?.length).length };
}
