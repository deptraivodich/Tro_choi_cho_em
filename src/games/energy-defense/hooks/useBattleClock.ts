import { useCallback, useEffect } from 'react';
import { useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';

/** One gameplay/presentation clock. Suspended frames never create catch-up spawn bursts. */
export function useBattleClock(active: boolean) {
  const clock = useSharedValue(0);
  const advance = useCallback((info: FrameInfo) => {
    'worklet';
    clock.set(clock.get() + Math.min(100, Math.max(0, info.timeSincePreviousFrame ?? 0)));
  }, [clock]);
  const frame = useFrameCallback(advance, false);
  useEffect(() => {
    frame.setActive(active);
    return () => frame.setActive(false);
  }, [active, frame]);
  return clock;
}
