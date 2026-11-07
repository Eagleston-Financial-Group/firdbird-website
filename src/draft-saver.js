// Serializes writes so slow responses cannot replace newer answers. Data stays in memory,
// never localStorage. A stale server revision requires an explicit reload, not an overwrite.
export class DraftSaver {
  constructor({ save, onSaved, onState, delay = 650, maxWait = 2000, retryDelay = 3000 }) {
    Object.assign(this, { save, onSaved, onState, delay, maxWait, retryDelay });
    this.revision = null; this.sequence = 0; this.savedSequence = 0;
    this.queue = Promise.resolve(); this.closed = false; this.conflict = false; this.pending = 0;
  }
  seed(draft) { this.revision = draft?.revision ?? null; this.sequence = 0; this.savedSequence = 0; this.conflict = false; this.clearTimers(); }
  get dirty() { return this.sequence > this.savedSequence; }
  clearTimers() { clearTimeout(this.timer); clearTimeout(this.maxTimer); clearTimeout(this.retryTimer); this.maxTimer = null; }
  change(snapshot) {
    this.latest = snapshot; this.sequence += 1;
    if (this.closed || this.conflict) return;
    this.onState('unsaved'); clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush().catch(() => {}), this.delay);
    this.maxTimer ||= setTimeout(() => this.flush().catch(() => {}), this.maxWait);
  }
  enqueue(action) { this.pending += 1; const run = this.queue.catch(() => {}).then(action).finally(() => { this.pending -= 1; }); this.queue = run; return run; }
  flush() {
    this.clearTimers();
    return this.enqueue(async () => {
      if (this.closed || this.conflict) { if (this.conflict) throw new Error('Load the latest saved draft before continuing.'); return; }
      while (this.dirty && !this.closed) {
        const sequence = this.sequence, snapshot = this.latest;
        this.onState('saving');
        try {
          const result = await this.save(snapshot, this.revision);
          if (result.draft) { this.revision = result.draft.revision; this.onSaved(result.draft); }
          this.savedSequence = sequence;
          this.onState(this.dirty ? 'saving' : 'saved');
        } catch (error) {
          this.conflict = error.status === 409;
          this.onState(this.conflict ? 'conflict' : 'error', error.message);
          if (!this.closed && !this.conflict) this.retryTimer = setTimeout(() => this.flush().catch(() => {}), this.retryDelay);
          throw error;
        }
      }
    });
  }
  async exclusive(action) {
    await this.flush();
    return this.enqueue(async () => {
      if (this.conflict) throw new Error('Load the latest saved draft before continuing.');
      try {
        const result = await action(this.revision);
        if (result.draft) { this.revision = result.draft.revision; this.onSaved(result.draft); }
        return result;
      } catch (error) {
        if (error.status === 409) { this.conflict = true; this.onState('conflict', error.message); }
        throw error;
      }
    });
  }
  close() { this.closed = true; this.clearTimers(); }
}
