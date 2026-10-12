import React from 'react';
import { Image, View, StyleProp, ViewStyle } from 'react-native';
import { CharacterType, RACE_ASSETS } from '../assets';
import { AVATAR_BOUNDS } from '../assets/spriteBounds';

export function CharacterAvatar({ character, size, style }: {
  character: CharacterType; size: number; style?: StyleProp<ViewStyle>;
}) {
  const bounds = AVATAR_BOUNDS[character], factor = size / 128;
  return <View pointerEvents="none" style={[style, { width: size, height: size, overflow: 'hidden' }]}>
    <View testID={`race-portrait-${character}`} collapsable={false} style={{ position: 'absolute', overflow: 'hidden',
      left: bounds.x * factor, top: bounds.y * factor, width: bounds.width * factor, height: bounds.height * factor }}>
      <Image key={character} source={RACE_ASSETS.characters[character].avatar} resizeMode="contain"
        style={{ position: 'absolute', left: -bounds.x * factor, top: -bounds.y * factor, width: size, height: size }} />
    </View>
  </View>;
}
