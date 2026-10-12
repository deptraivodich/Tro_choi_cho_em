import React from 'react';
import { Image, View } from 'react-native';
import { RACE_ASSETS, CharacterPose, CharacterType } from '../assets';
import { SPRITE_FRAMES, CHARACTER_ATLAS_SIZE, CHARACTER_CANVAS } from '../assets/spriteBounds';

// The original atlas contains complete feet that are absent from the extracted PNGs.
// Feet meet the selection ring centre; no bitmap is rewritten or stretched out of proportion.
export function TokenSprite({ character, pose, size }: { character: CharacterType; pose: CharacterPose; size: number }) {
  const actualPose = pose === 'avatar' ? 'idle_1' : pose;
  const bounds = SPRITE_FRAMES[character][actualPose];
  const factor = size / CHARACTER_CANVAS[character];
  return <View testID="player-sprite-clip" pointerEvents="none" collapsable={false} style={{ position: 'absolute',
    left: (size - bounds.width * factor) / 2, top: size * .85 - bounds.height * factor, width: bounds.width * factor,
    height: bounds.height * factor, overflow: 'hidden' }}>
    <Image source={RACE_ASSETS.characterAtlas} style={{ position: 'absolute', left: -bounds.x * factor,
      top: -bounds.y * factor, width: CHARACTER_ATLAS_SIZE.width * factor,
      height: CHARACTER_ATLAS_SIZE.height * factor }} resizeMode="stretch" />
  </View>;
}
