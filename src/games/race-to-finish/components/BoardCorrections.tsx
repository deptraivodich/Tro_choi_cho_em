import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { RACE_ASSETS } from '../assets';
import { TILE_ARTWORK_SOURCES, getTile, getTileDirection } from '../data/boardConfig';

// Reuse circular artwork through clipped views, leaving the original map intact.
// Use the board's clean, right-pointing single arrow (tile_41). Rotating a
// two-headed source still leaves two heads, as the new acceptance PNGs show.
export const ARROW_CORRECTIONS: readonly string[] = [
  'tile_4', 'tile_8', 'tile_9', 'tile_13', 'tile_16', 'tile_17', 'tile_18',
  'tile_20', 'tile_21', 'tile_29', 'tile_30', 'tile_31', 'tile_32', 'tile_34', 'tile_35',
  'tile_40', 'tile_45', 'tile_47',
];

export function BoardCorrections({ width, height }: { width: number; height: number }) {
  const radius = width * 19 / 1024;
  const patch = (id: string, x: number, y: number, sourceX: number, sourceY: number, rotate = 0) => (
    <View key={id} testID={`board-correction-${id}`} pointerEvents="none" style={{
      position: 'absolute', left: x * width / 100 - radius, top: y * height / 100 - radius,
      width: radius * 2, height: radius * 2, borderRadius: radius, overflow: 'hidden',
    }}>
      <View style={{ width: radius * 2, height: radius * 2, borderRadius: radius,
        overflow: 'hidden', transform: [{ rotate: `${rotate}deg` }] }}>
        <Image source={RACE_ASSETS.mapLandscape} resizeMode="stretch" style={{ position: 'absolute',
          width, height, left: radius - sourceX * width / 100, top: radius - sourceY * height / 100 }} />
      </View>
    </View>
  );
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {[...new Set([...ARROW_CORRECTIONS, ...Object.keys(TILE_ARTWORK_SOURCES)])].map(tileId => {
      const tile = getTile(tileId);
      const arrow = ARROW_CORRECTIONS.includes(tileId);
      const source = getTile(arrow ? 'tile_41' : TILE_ARTWORK_SOURCES[tileId]);
      const angle = arrow ? getTileDirection(tileId, width, height)! : 0;
      return patch(tile.id, tile.xPercent, tile.yPercent, source.xPercent, source.yPercent, angle);
    })}
  </View>;
}
