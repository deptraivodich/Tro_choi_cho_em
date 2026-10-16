type Task = { callback: () => void; remaining: number; started: number; handle?: ReturnType<typeof setTimeout> };

/** Owns delayed shot completions; visual pause must not advance the puzzle. */
export class PausableTasks {
  private paused = false;
  private nextId = 0;
  private tasks = new Map<number, Task>();
  constructor(private now: () => number = Date.now) {}

  schedule = (callback: () => void, delay: number) => {
    const id = ++this.nextId;
    const task: Task = { callback, remaining: Math.max(0, delay), started: this.now() };
    this.tasks.set(id, task);
    if (!this.paused) this.arm(id, task);
    return id;
  };

  private arm(id: number, task: Task) {
    task.started = this.now();
    task.handle = setTimeout(() => {
      if (!this.tasks.delete(id)) return;
      task.callback();
    }, task.remaining);
  }

  setPaused(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    for (const [id, task] of this.tasks) {
      if (paused) {
        clearTimeout(task.handle);
        task.remaining = Math.max(0, task.remaining - (this.now() - task.started));
      } else this.arm(id, task);
    }
  }

  clear = () => {
    for (const task of this.tasks.values()) clearTimeout(task.handle);
    this.tasks.clear();
  };
}
