import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseGameTimerProps {
  initialSeconds?: number;
  autoStart?: boolean;
}

export function useGameTimer({ initialSeconds = 0, autoStart = true }: UseGameTimerProps = {}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(!autoStart);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickTime = useRef<number>(Date.now());

  const tick = useCallback(() => {
    if (!isPausedRef.current) {
      const now = Date.now();
      const delta = (now - lastTickTime.current) / 1000;
      if (delta >= 1) {
        setElapsedSeconds((prev) => prev + Math.floor(delta));
        lastTickTime.current = now;
      }
    } else {
      lastTickTime.current = Date.now();
    }
  }, []);

  useEffect(() => {
    lastTickTime.current = Date.now();
    timerRef.current = setInterval(tick, 500);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active') {
        // Automatically pause when app enters background
        setIsPaused(true);
      }
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      subscription.remove();
    };
  }, [tick]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    lastTickTime.current = Date.now();
    setIsPaused(false);
  }, []);

  const reset = useCallback((newInitial = 0) => {
    lastTickTime.current = Date.now();
    setElapsedSeconds(newInitial);
  }, []);

  return {
    elapsedSeconds,
    isPaused,
    pause,
    resume,
    reset,
  };
}
