import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle, useDerivedValue, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import type { Enemy } from '../logic/controller';
import { pathHeading, pathPosition, travelled } from '../logic/path';
import { clamp01, SHOT, walkFrame, worldToMap, type Point } from '../presentation/combat';
type Props = { creep: Enemy; scale: number; active: boolean; tracked: boolean; attacked: boolean;
  clock: SharedValue<number>; shotStart: SharedValue<number>; targetPoint: SharedValue<Point> };
const atlas = require('../assets/round3/enemies-atlas.png');
export const CreatureSprite = React.memo(function CreatureSprite({ creep, scale, tracked, attacked, clock, shotStart, targetPoint }: Props) {
  const reduced = useReducedMotion();
  const row = creep.type === 'scout' ? 0 : creep.type === 'slime' ? 1 : 2;
  const stride = row === 0 ? 3.2 : row === 1 ? 3.5 : 3.1;
  const size = Math.max(26, (row === 2 ? 72 : 62) * scale);
  const distance = useDerivedValue(() => travelled(creep, attacked ? Math.min(clock.get(), shotStart.get() + SHOT.impact) : clock.get()));
  const location = useDerivedValue(() => {
    const p = pathPosition(distance.get()), map = worldToMap(p.x, p.y);
    const angle = pathHeading(distance.get()), lane = (creep.id % 3 - 1) * 9;
    return { x: map.x - Math.sin(angle) * lane, y: map.y + Math.cos(angle) * lane };
  });
  const heading = useDerivedValue(() => pathHeading(distance.get()));
  useAnimatedReaction(() => ({ p: location.get(), angle: heading.get(), tracked }), value => {
    if (value.tracked) {
      const bodyOffset = -size / scale * .36;
      targetPoint.set({ x: value.p.x - bodyOffset * Math.sin(value.angle), y: value.p.y + bodyOffset * Math.cos(value.angle) });
    }
  }, [tracked, size, scale]);
  const position = useAnimatedStyle(() => ({
    transform: [{ translateX: location.get().x * scale - size / 2 }, { translateY: location.get().y * scale - size * .890625 }],
  }));
  const pose = useAnimatedStyle(() => {
    const ms = attacked ? clock.get() - shotStart.get() : -1;
    const hit = ms >= SHOT.impact && ms < SHOT.defeat;
    const defeat = ms >= SHOT.defeat ? clamp01((ms - SHOT.defeat) / (SHOT.end - SHOT.defeat)) : 0;
    const gait = distance.get() / stride * Math.PI / 2;
    return { opacity: 1 - defeat, transform: [
      { translateY: -(reduced ? 0 : Math.abs(Math.sin(gait)) * (row === 2 ? .5 : 1.2)) - defeat * size * .15 },
      { translateX: hit && !reduced ? Math.sin((ms - SHOT.impact) / 20) * 2 : 0 },
      { rotate: (heading.get() + (hit && !reduced ? -.08 : 0)) + 'rad' },
      { scale: 1 - defeat * .55 },
    ] };
  });
  const frame = useDerivedValue(() => reduced ? 0 : walkFrame(distance.get(), stride));
  const frameStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -frame.get() * size }, { translateY: -row * size }] }));
  const flash = useAnimatedStyle(() => {
    const ms = attacked ? clock.get() - shotStart.get() : -1;
    return { opacity: ms >= SHOT.impact && ms < SHOT.impact + 110 ? .65 * (1 - (ms - SHOT.impact) / 110) : 0 };
  });
  return <Animated.View pointerEvents="none" testID={'energy-creep-' + creep.id} style={[s.entity, { width: size, height: size }, position]}>
    <View style={[s.shadow, { left: size * .22, width: size * .56, top: size * .84, height: size * .11 }]} />
    <Animated.View testID={'energy-creep-pose-' + creep.id} style={[StyleSheet.absoluteFill, { transformOrigin: [size / 2, size * .89, 0] }, pose]}>
      <View style={s.crop}><Animated.Image testID={'energy-sprite-frame-' + creep.id} source={atlas} fadeDuration={0} resizeMode="stretch" style={[{ width: size * 4, height: size * 3 }, frameStyle]} />
        {attacked && <Animated.View style={[StyleSheet.absoluteFill, flash]}><Animated.Image source={atlas} tintColor="#FFF1C2" fadeDuration={0} resizeMode="stretch" style={[{ width: size * 4, height: size * 3 }, frameStyle]} /></Animated.View>}
      </View>
    </Animated.View>
  </Animated.View>;
});
const s = StyleSheet.create({ entity: { position: 'absolute', top: 0, left: 0 }, crop: { flex: 1, overflow: 'hidden' },
  shadow: { position: 'absolute', borderRadius: 30, backgroundColor: 'rgba(38,48,25,.25)' } });
