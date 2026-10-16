import { PausableTasks } from '../logic/pausable-tasks';

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('shot completion retains its remaining time through pause and resumes once', () => {
  const tasks = new PausableTasks(), complete = jest.fn();
  tasks.schedule(complete, 600);
  jest.advanceTimersByTime(200); tasks.setPaused(true);
  jest.advanceTimersByTime(2000); expect(complete).not.toHaveBeenCalled();
  tasks.setPaused(false); jest.advanceTimersByTime(399); expect(complete).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1); expect(complete).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(2000); expect(complete).toHaveBeenCalledTimes(1);
});

test('repeated pause/resume signals do not duplicate or change deadlines', () => {
  const tasks = new PausableTasks(), complete = jest.fn();
  tasks.schedule(complete, 600); jest.advanceTimersByTime(100);
  tasks.setPaused(true); tasks.setPaused(true); jest.advanceTimersByTime(300);
  tasks.setPaused(false); tasks.setPaused(false); jest.advanceTimersByTime(500);
  expect(complete).toHaveBeenCalledTimes(1);
});

test('new work scheduled while paused waits for its entire duration after resume', () => {
  const tasks = new PausableTasks(), complete = jest.fn();
  tasks.setPaused(true); tasks.schedule(complete, 800); jest.advanceTimersByTime(1000);
  expect(complete).not.toHaveBeenCalled(); tasks.setPaused(false);
  jest.advanceTimersByTime(799); expect(complete).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1); expect(complete).toHaveBeenCalledTimes(1);
});

test('exit/replay clears old callbacks without canceling a new session', () => {
  const tasks = new PausableTasks(), old = jest.fn(), next = jest.fn();
  tasks.schedule(old, 600); jest.advanceTimersByTime(200); tasks.clear();
  tasks.schedule(next, 800); jest.advanceTimersByTime(800);
  expect(old).not.toHaveBeenCalled(); expect(next).toHaveBeenCalledTimes(1);
});

test('clear also removes work suspended by pause', () => {
  const tasks = new PausableTasks(), complete = jest.fn();
  tasks.schedule(complete, 600); tasks.setPaused(true); tasks.clear();
  tasks.setPaused(false); jest.advanceTimersByTime(1000);
  expect(complete).not.toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
});
