import { cancelAnimation, Easing, ReduceMotion, runOnJS, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { smoothStep, Point } from './cameraGeometry';

// Reference: native video frames 815–824, ~300 ms at 30 fps (± one frame).
// Each tile owns this entire duration, independent of dice count/remaining steps.
export const STEP_DURATION_MS = 300;
export const SHORTCUT_DURATION_MS = 1200;
export const SETTLE_DURATION_MS = 180;
export interface TokenMotionValues {
  from: SharedValue<Point>; to: SharedValue<Point>; progress: SharedValue<number>;
  key: SharedValue<string>; duration: SharedValue<number>; generation: SharedValue<number>;
}

// Execute ONLY on UI. Native shared-value writes from JS are queued; reading
// progress immediately after a JS reset can return the previous step's 1,
// producing duration * (1 - 1) = 0. Reset + remaining-time calculation must be atomic.
export function animateTokenMotion(values: TokenMotionValues, target: Point, key: string,
  duration: number, paused: boolean, moving: boolean, actionId: number, generation: number,
  complete: (id: number, generation: number) => void) {
  'worklet';
  cancelAnimation(values.progress);
  values.generation.value = generation;
  if (values.key.value !== key) {
    const t = smoothStep(values.progress.value);
    values.from.value = {
      x: values.from.value.x + (values.to.value.x - values.from.value.x) * t,
      y: values.from.value.y + (values.to.value.y - values.from.value.y) * t,
    };
    values.to.value = target;
    values.progress.value = 0;
    values.duration.value = duration;
    values.key.value = key;
  } else {
    // A viewport/occupancy update may adjust the endpoint, never restart the clock.
    values.to.value = target;
  }
  if (paused) return;
  const remaining = values.duration.value * (1 - values.progress.value);
  if (remaining <= 0) {
    if (moving) runOnJS(complete)(actionId, generation);
    return;
  }
  values.progress.value = withTiming(1, {
    duration: remaining, easing: Easing.linear,
    // Reduced motion removes gait/pose changes, not the essential, readable path.
    reduceMotion: ReduceMotion.Never,
  }, finished => {
    if (finished && moving && values.generation.value === generation)
      runOnJS(complete)(actionId, generation);
  });
}
export function stopTokenMotion(values: TokenMotionValues, generation: number) {
  'worklet';
  if (values.generation.value !== generation) return;
  values.generation.value = -1;
  cancelAnimation(values.progress);
}
