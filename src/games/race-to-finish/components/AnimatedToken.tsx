import React, { useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, runOnUI } from 'react-native-reanimated';
import { Player } from '../types/index';
import { RACE_ASSETS } from '../assets/index';
import { TokenPlacement } from '../logic/tokenPlacement';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCameraTracking } from './CameraTracking';
import { smoothStep } from '../logic/cameraGeometry';
import { TokenSprite } from './TokenSprite';
import { tokenGait } from '../logic/tokenGait';
import { animateTokenMotion, stopTokenMotion, STEP_DURATION_MS, SHORTCUT_DURATION_MS, SETTLE_DURATION_MS } from '../logic/tokenMotion';

interface Props {
  player: Player; placement: TokenPlacement; active: boolean; moving: boolean; paused: boolean;
  shortcut?: boolean; actionId: number; onComplete: (id: number) => void;
}
export function AnimatedToken({ player, placement, active, moving, paused, shortcut = false, actionId, onComplete }: Props) {
  const from = useSharedValue({ x: placement.x, y: placement.y });
  const to = useSharedValue({ x: placement.x, y: placement.y });
  const progress = useSharedValue(1);
  const tracked = useCameraTracking();
  const key = useSharedValue('');
  const duration = useSharedValue(STEP_DURATION_MS);
  const generation = useSharedValue(0);
  const values = useMemo(() => ({ from, to, progress, key, duration, generation }), [from, to, progress, key, duration, generation]);
  const sequence = useRef(0);
  const completedAction = useRef<number | null>(null);
  const current = useRef({ actionId, moving, paused });
  const callback = useRef(onComplete);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useLayoutEffect(() => { callback.current = onComplete; current.current = { actionId, moving, paused }; }, [onComplete, actionId, moving, paused]);
  const reduced = useReducedMotion();
  const finish = useCallback((id: number, run: number) => {
    if (!mounted.current || sequence.current !== run || current.current.actionId !== id ||
        !current.current.moving || current.current.paused || completedAction.current === id) return;
    completedAction.current = id;
    callback.current(id);
  }, []);
  useLayoutEffect(() => {
    const runSequence = sequence;
    const run = ++runSequence.current;
    // Idle renders/turn IDs do not restart placement settling. Each moving action
    // is exactly one fresh tile clock; pause/resume keeps its key and progress.
    const motionKey = moving ? `step:${actionId}` : `idle:${placement.x}:${placement.y}`;
    runOnUI(animateTokenMotion)(values, { x: placement.x, y: placement.y }, motionKey,
      moving ? (shortcut ? SHORTCUT_DURATION_MS : STEP_DURATION_MS) : SETTLE_DURATION_MS,
      paused, moving, actionId, run, finish);
    return () => {
      runSequence.current++;
      runOnUI(stopTokenMotion)(values, run);
    };
  }, [placement.x, placement.y, moving, paused, actionId, shortcut, values, finish]);
  useAnimatedReaction(() => {
    const t = smoothStep(progress.value);
    return { x: from.value.x + (to.value.x - from.value.x) * t + placement.size / 2,
      y: from.value.y + (to.value.y - from.value.y) * t + placement.size * .65 };
  }, position => { if (active && tracked) tracked.set(position); }, [active, tracked, placement.size]);
  const animatedStyle = useAnimatedStyle(() => {
    const t = smoothStep(progress.value);
    return { transform: [{ translateX: from.value.x + (to.value.x - from.value.x) * t },
      { translateY: from.value.y + (to.value.y - from.value.y) * t }] };
  });
  const depth = useAnimatedStyle(() => {
    const t = smoothStep(progress.value);
    const feet = from.value.y + (to.value.y - from.value.y) * t + placement.size;
    return { zIndex: (active ? 1000 : 10) + Math.round(feet) };
  });
  const gait = useAnimatedStyle(() => {
    const frame = tokenGait(progress.value, placement.size, moving, shortcut, reduced);
    return { transform: [{ translateY: frame.lift }, { rotate: `${frame.tilt}deg` }, { scaleY: frame.squash }] };
  });
  return (
    <>
    {active && <Animated.View testID={`player-selection-${player.id}`} pointerEvents="none"
      style={[styles.token, { width: placement.size, height: placement.size, zIndex: 1 }, animatedStyle]}>
      <View style={styles.halo} />
    </Animated.View>}
    <Animated.View testID={`token-${player.id}`} accessibilityLabel={`${player.name}: ${player.currentTileId}`}
      collapsable={false} pointerEvents="none" style={[styles.token, { width: placement.size, height: placement.size }, animatedStyle, depth]}>
      <Animated.View testID={`player-gait-${player.id}`} style={[{ width: placement.size, height: placement.size }, gait]}>
        <TokenSprite character={player.character} pose={player.currentPose} size={placement.size}
          progress={progress} moving={moving} shortcut={shortcut} reduced={reduced} />
      </Animated.View>
      <View style={styles.items}>
        {player.hasShield && <Image source={RACE_ASSETS.items.shield} style={styles.badge} />}
        {player.cleanseCount > 0 && <Image source={RACE_ASSETS.items.cleanse} style={styles.badge} />}
      </View>
    </Animated.View>
    </>
  );
}
const styles = StyleSheet.create({
  token: { position: 'absolute', left: 0, top: 0 },
  halo: { position: 'absolute', width: '90%', height: '30%', bottom: 0, left: '5%', borderRadius: 99,
    backgroundColor: 'rgba(250,204,21,0.55)', borderColor: '#FDE047', borderWidth: 2 },
  items: { position: 'absolute', top: -8, right: -4, flexDirection: 'row' }, badge: { width: 16, height: 16 },
});
