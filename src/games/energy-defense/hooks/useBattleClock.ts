import { useCallback, useEffect } from 'react';
import { useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';

/** One cosmetic clock for atlas poses, ambient motion and all combat layers. */
export function useBattleClock(active: boolean) {
  const clock = useSharedValue(0);
  const advance = useCallback((info: FrameInfo) => {
    'worklet';
    clock.set(clock.get() + (info.timeSincePreviousFrame ?? 0));
  }, [clock]);
  const frame = useFrameCallback(advance, false);
  useEffect(() => {
    frame.setActive(active);
    return () => frame.setActive(false);
  }, [active, frame]);
  return clock;
}
