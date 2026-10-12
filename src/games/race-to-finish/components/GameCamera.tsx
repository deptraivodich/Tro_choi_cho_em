import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useSharedValue, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { fitToBoard, clampToBounds, cameraTranslation, smoothStep } from '../logic/cameraGeometry';
import { RACE_ASSETS } from '../assets';
import { CameraTracking } from './CameraTracking';
import { GameBoardView } from './GameBoardView';
import type { Player } from '../types';

export const CAMERA_MODE = { intro: 0, focusCurrentPlayer: 1, manualPan: 2, followMovement: 3, transitionToPlayer: 4, recenterForRoll: 5 } as const;
interface Props {
  width: number; height: number; players: Player[]; activePlayerIndex: number;
  moving: boolean; shortcut: boolean; paused: boolean; actionId: number; sessionId: number;
  onMovementComplete: (id: number) => void; onIntroComplete: () => void; reduced: boolean;
  panEnabled: boolean; rolling: boolean; focusRequest: number; onFocusComplete: (request: number) => void;
}
export function GameCamera(props: Props) {
  const { width, height, paused, sessionId, reduced } = props;
  const bounds = useMemo(() => fitToBoard(width, height), [width, height]);
  const tracked = useSharedValue({ x: 80, y: 290 });
  const center = useSharedValue({ x: bounds.worldWidth / 2, y: bounds.worldHeight / 2 });
  const scale = useSharedValue(bounds.fit * 1.06);
  const elapsed = useSharedValue(0);
  const introDone = useSharedValue(false);
  const frozen = useSharedValue(paused);
  const mode = useSharedValue<number>(CAMERA_MODE.intro);
  const panStart = useSharedValue({ x: bounds.worldWidth / 2, y: bounds.worldHeight / 2 });
  const focusStart = useSharedValue({ x: bounds.worldWidth / 2, y: bounds.worldHeight / 2 });
  const focusScale = useSharedValue(bounds.zoom);
  const focusElapsed = useSharedValue(0);
  const focusRequest = useSharedValue(0);
  const focusCallback = useRef(props.onFocusComplete);
  const currentRequest = useRef(props.focusRequest);
  const callback = useRef(props.onIntroComplete);
  const currentSession = useRef(sessionId);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useLayoutEffect(() => { callback.current = props.onIntroComplete; currentSession.current = sessionId; }, [props.onIntroComplete, sessionId]);
  useLayoutEffect(() => { focusCallback.current = props.onFocusComplete; currentRequest.current = props.focusRequest; }, [props.onFocusComplete, props.focusRequest]);
  const notify = (id: number) => { if (mounted.current && id === currentSession.current) callback.current(); };
  const notifyFocus = (request: number) => { if (mounted.current && request === currentRequest.current) focusCallback.current(request); };
  useEffect(() => { frozen.set(paused); }, [paused, frozen]);
  useEffect(() => {
    elapsed.set(0); introDone.set(false);
    mode.set(CAMERA_MODE.intro); focusRequest.set(0);
    center.set({ x: bounds.worldWidth / 2, y: bounds.worldHeight / 2 });
    scale.set(bounds.fit * 1.06);
    // Viewport changes retain intro progress; a new session explicitly resets it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  useEffect(() => {
    if (!props.focusRequest) return;
    focusStart.set(center.value); focusScale.set(scale.value); focusElapsed.set(0);
    focusRequest.set(props.focusRequest); mode.set(CAMERA_MODE.recenterForRoll);
  }, [props.focusRequest, center, scale, focusStart, focusScale, focusElapsed, focusRequest, mode]);
  useEffect(() => {
    if (!introDone.value || mode.value === CAMERA_MODE.recenterForRoll) return;
    // Actual motion always owns tracking. Turn changes and bot rolls may focus
    // only while manual inspection has not taken ownership of the camera.
    if (props.moving) mode.set(CAMERA_MODE.followMovement);
    else if (mode.value !== CAMERA_MODE.manualPan) mode.set(CAMERA_MODE.transitionToPlayer);
  }, [props.moving, props.activePlayerIndex, props.rolling, introDone, mode]);
  const pan = useMemo(() => Gesture.Pan().minDistance(8).enabled(props.panEnabled && !paused && !props.moving)
    .onStart(() => {
      if (!introDone.value) return;
      panStart.set(center.value); mode.set(CAMERA_MODE.manualPan);
    }).onUpdate(event => {
      if (mode.value !== CAMERA_MODE.manualPan || frozen.value) return;
      const currentScale = Math.max(bounds.fit, scale.value);
      center.set(clampToBounds({ x: panStart.value.x - event.translationX / currentScale,
        y: panStart.value.y - event.translationY / currentScale }, currentScale, bounds));
    }), [props.panEnabled, props.moving, paused, introDone, panStart, center, mode, frozen, scale, bounds]);
  useFrameCallback(frame => {
    if (frozen.value) return;
    const elapsedFrame = Math.max(0, frame.timeSincePreviousFrame ?? 0);
    const dt = Math.min(elapsedFrame, 50);
    const focus = { x: tracked.value.x + bounds.origin.x, y: tracked.value.y + bounds.origin.y };
    if (!introDone.value) {
      elapsed.set(elapsed.value + elapsedFrame);
      const time = elapsed.value;
      const zoomProgress = smoothStep((time - 2200) / (reduced ? 100 : 900));
      scale.set(time < 400 ? bounds.fit * (1.06 - .06 * smoothStep(time / 400))
        : bounds.fit + (bounds.zoom - bounds.fit) * zoomProgress);
      const target = clampToBounds(focus, scale.value, bounds);
      center.set(clampToBounds({ x: bounds.worldWidth / 2 + (target.x - bounds.worldWidth / 2) * zoomProgress,
        y: bounds.worldHeight / 2 + (target.y - bounds.worldHeight / 2) * zoomProgress }, scale.value, bounds));
      if (zoomProgress === 1) { introDone.set(true); mode.set(CAMERA_MODE.focusCurrentPlayer); runOnJS(notify)(sessionId); }
    } else if (mode.value === CAMERA_MODE.manualPan) {
      // Do not reclaim the view on idle renders, question feedback or turn changes.
      return;
    } else if (mode.value === CAMERA_MODE.recenterForRoll) {
      focusElapsed.set(focusElapsed.value + dt);
      const t = smoothStep(focusElapsed.value / (reduced ? 100 : 400));
      scale.set(focusScale.value + (bounds.zoom - focusScale.value) * t);
      const target = clampToBounds(focus, scale.value, bounds);
      center.set(clampToBounds({ x: focusStart.value.x + (target.x - focusStart.value.x) * t,
        y: focusStart.value.y + (target.y - focusStart.value.y) * t }, scale.value, bounds));
      if (t === 1) { mode.set(CAMERA_MODE.focusCurrentPlayer); runOnJS(notifyFocus)(focusRequest.value); }
    } else {
      const smoothing = 1 - Math.exp(-dt / (reduced ? 30 : 95));
      scale.set(scale.value + (bounds.zoom - scale.value) * smoothing);
      // Follow the rendered sprite continuously, never the engine's next destination.
      const target = clampToBounds(focus, scale.value, bounds);
      center.set(clampToBounds({ x: center.value.x + (target.x - center.value.x) * smoothing,
        y: center.value.y + (target.y - center.value.y) * smoothing }, scale.value, bounds));
    }
  });
  const worldStyle = useAnimatedStyle(() => {
    const renderScale = Math.max(bounds.fit, scale.value);
    const translation = cameraTranslation(clampToBounds(center.value, renderScale, bounds), renderScale, bounds);
    return { transform: [{ translateX: translation.x }, { translateY: translation.y }, { scale: renderScale }] };
  });
  return <GestureDetector gesture={pan}><View testID="game-camera" collapsable={false} style={[styles.viewport, { width, height }]}>
    <Animated.View testID="camera-world" style={[styles.world, { width: bounds.worldWidth, height: bounds.worldHeight }, worldStyle]}>
      <Image source={RACE_ASSETS.background} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={{ position: 'absolute', left: bounds.origin.x, top: bounds.origin.y }}>
        <CameraTracking.Provider value={tracked}>
          <GameBoardView players={props.players} activePlayerIndex={props.activePlayerIndex} boardWidth={1024} boardHeight={576}
            immersive moving={props.moving} shortcut={props.shortcut} paused={paused} actionId={props.actionId}
            onMovementComplete={props.onMovementComplete} />
        </CameraTracking.Provider>
      </View>
    </Animated.View>
  </View></GestureDetector>;
}
const styles = StyleSheet.create({ viewport: { overflow: 'hidden', backgroundColor: '#064E3B' },
  world: { position: 'absolute', left: 0, top: 0 } });
