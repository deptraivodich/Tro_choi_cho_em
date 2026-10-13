import React from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { RACE_ASSETS, CharacterPose, CharacterType } from '../assets';
import { SPRITE_FRAMES, CHARACTER_ATLAS_SIZE, CHARACTER_CANVAS } from '../assets/spriteBounds';

// One atlas image, complete original frames, stable feet. Pose and gait use the
// same per-tile UI clock as position, so every step has both walk poses.
export function TokenSprite({ character, pose, size, progress, moving = false, shortcut = false, reduced = false }: {
  character: CharacterType; pose: CharacterPose; size: number; progress?: SharedValue<number>;
  moving?: boolean; shortcut?: boolean; reduced?: boolean;
}) {
  const actualPose = pose === 'avatar' ? 'idle_1' : pose;
  const poses = SPRITE_FRAMES[character];
  const factor = size / CHARACTER_CANVAS[character];
  const frameBounds = (p: number) => {
    'worklet';
    if (!moving || !progress || reduced) return poses[actualPose];
    const phase = Math.floor(Math.min(.999999, p) * (shortcut ? 8 : 2)) % 2;
    return phase === 0 ? poses.walk_1 : poses.walk_2;
  };
  const clipStyle = useAnimatedStyle(() => {
    // Direct read makes progress an input of each UI mapper (including web).
    const bounds = frameBounds(progress?.value ?? 1);
    return { left: (size - bounds.width * factor) / 2, top: size * .85 - bounds.height * factor,
      width: bounds.width * factor, height: bounds.height * factor };
  });
  const atlasStyle = useAnimatedStyle(() => {
    // Direct read makes progress an input of each UI mapper (including web).
    const bounds = frameBounds(progress?.value ?? 1);
    return { left: -bounds.x * factor, top: -bounds.y * factor };
  });
  return <Animated.View testID="player-sprite-clip" pointerEvents="none" collapsable={false}
    style={[{ position: 'absolute', overflow: 'hidden' }, clipStyle]}>
    <Animated.Image source={RACE_ASSETS.characterAtlas} style={[{ position: 'absolute',
      width: CHARACTER_ATLAS_SIZE.width * factor, height: CHARACTER_ATLAS_SIZE.height * factor }, atlasStyle]} resizeMode="stretch" />
  </Animated.View>;
}
