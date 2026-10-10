import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Line, G } from 'react-native-svg';
import { BOARD_TILES, SHORTCUTS } from '../data/boardConfig';
import { Player } from '../types/index';
import { RACE_ASSETS } from '../assets/index';
import { AnimatedToken } from './AnimatedToken';
import { tokenPlacements } from '../logic/tokenPlacement';

interface GameBoardViewProps {
  players: Player[];
  activePlayerIndex: number;
  boardWidth: number;
  boardHeight: number;
  activeForkTileId?: string | null;
  moving: boolean;
  paused: boolean;
  actionId: number;
  onMovementComplete: (id: number) => void;
}

export const GameBoardView: React.FC<GameBoardViewProps> = ({
  players,
  activePlayerIndex,
  boardWidth,
  boardHeight,
  activeForkTileId, moving, paused, actionId, onMovementComplete,
}) => {
  const markerRadius = Math.max(9, Math.min(15, boardWidth * 0.014));
  const placements = tokenPlacements(players, boardWidth, boardHeight);

  return (
    <View style={[styles.container, { width: boardWidth, height: boardHeight }]}>
      {/* 1. Background Landscape Map Image */}
      <Image
        source={RACE_ASSETS.mapLandscape}
        style={[styles.mapImage, { width: boardWidth, height: boardHeight }]}
        resizeMode="contain"
      />

      {/* 2. SVG Highlights for Shortcuts and Active Forks */}
      <Svg width={boardWidth} height={boardHeight} style={StyleSheet.absoluteFill}>
        {/* Draw active fork glowing path guides */}
        {activeForkTileId && (
          <G>
            {SHORTCUTS.filter((s) => s.forkTileId === activeForkTileId).map((s) => {
              const forkTile = BOARD_TILES[s.forkTileId];
              const mergeTile = BOARD_TILES[s.mergeTileId];
              const mainNextTile = BOARD_TILES[s.mainNextId];
              if (!forkTile || !mergeTile || !mainNextTile) return null;

              const fx = (forkTile.xPercent / 100) * boardWidth;
              const fy = (forkTile.yPercent / 100) * boardHeight;
              const mx = (mergeTile.xPercent / 100) * boardWidth;
              const my = (mergeTile.yPercent / 100) * boardHeight;
              const nx = (mainNextTile.xPercent / 100) * boardWidth;
              const ny = (mainNextTile.yPercent / 100) * boardHeight;

              return (
                <G key={s.id}>
                  {/* Glowing line for shortcut */}
                  <Line
                    x1={fx}
                    y1={fy}
                    x2={mx}
                    y2={my}
                    stroke="#10B981"
                    strokeWidth="5"
                    strokeDasharray="6 4"
                    opacity={0.9}
                  />
                  {/* Glowing line for main path */}
                  <Line
                    x1={fx}
                    y1={fy}
                    x2={nx}
                    y2={ny}
                    stroke="#F59E0B"
                    strokeWidth="5"
                    strokeDasharray="6 4"
                    opacity={0.9}
                  />
                </G>
              );
            })}
          </G>
        )}
      </Svg>

      {/* 3. Interactive / Visual Markers over Mystery Tiles */}
      {Object.values(BOARD_TILES).map((tile) => {
        const x = (tile.xPercent / 100) * boardWidth;
        const y = (tile.yPercent / 100) * boardHeight;

        // Skip start / finish as they are painted in background
        if (tile.type === 'start' || tile.type === 'finish') return null;

        const isHighlightFork = activeForkTileId === tile.id;

        return (
          <View
            key={tile.id}
            style={[
              styles.tileSpot,
              {
                left: x - markerRadius,
                top: y - markerRadius,
                width: markerRadius * 2,
                height: markerRadius * 2,
                borderRadius: markerRadius,
              },
              isHighlightFork && styles.highlightForkSpot,
            ]}
          >
            {isHighlightFork && (
              <View style={styles.forkPulseRing} />
            )}
          </View>
        );
      })}

      {/* 4. Character Tokens */}
      {players.map((player, index) => (
        <AnimatedToken key={player.id} player={player} placement={placements[player.id]}
          active={index === activePlayerIndex} moving={moving && index === activePlayerIndex}
          paused={paused} actionId={actionId} onComplete={onMovementComplete} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#0F291E',
    overflow: 'hidden',
    alignSelf: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  mapImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tileSpot: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightForkSpot: {
    backgroundColor: 'rgba(250, 204, 21, 0.4)',
    borderWidth: 2,
    borderColor: '#FDE047',
  },
  forkPulseRing: {
    position: 'absolute',
    width: '180%',
    height: '180%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FBBF24',
  },
  playerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#FACC15',
    backgroundColor: 'rgba(250, 204, 21, 0.45)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  characterSprite: {
    zIndex: 2,
  },
  statusIconsRow: {
    position: 'absolute',
    top: -6,
    flexDirection: 'row',
    gap: 2,
    zIndex: 10,
  },
  miniItemBadge: {
    width: 14,
    height: 14,
  },
});
