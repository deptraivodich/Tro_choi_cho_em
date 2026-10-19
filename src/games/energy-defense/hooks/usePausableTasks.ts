import { useEffect, useState } from 'react';
import { PausableTasks } from '../logic/pausable-tasks';

export function usePausableTasks(paused: boolean) {
  const [tasks] = useState(() => new PausableTasks());
  useEffect(() => { tasks.setPaused(paused); }, [tasks, paused]);
  useEffect(() => tasks.clear, [tasks]);
  return tasks;
}
