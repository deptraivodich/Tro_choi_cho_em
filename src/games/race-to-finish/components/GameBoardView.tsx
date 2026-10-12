import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Player } from '../types/index';
import { RACE_ASSETS } from '../assets/index';
import { AnimatedToken } from './AnimatedToken';
import { tokenPlacements } from '../logic/tokenPlacement';
import { BoardCorrections } from './BoardCorrections';

// Only the bottom, painted mock dice panel is clipped; the playable map is intact.
export const PLAYABLE_BOARD_HEIGHT = 0.80;

interface GameBoardViewProps {
  immersive?: boolean;
  players: Player[];
  activePlayerIndex: number;
  boardWidth: number;
  boardHeight: number;
  shortcut?: boolean;
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
  shortcut = false, moving, paused, actionId, onMovementComplete, immersive = false,
}) => {
  const placements = tokenPlacements(players, boardWidth, boardHeight);

  return (
    <View testID="race-board" style={[styles.container, { width: boardWidth, height: boardHeight * PLAYABLE_BOARD_HEIGHT },
      immersive && { borderRadius: 0, elevation: 0, shadowOpacity: 0 }]}>
      {/* 1. Background Landscape Map Image */}
      <Image
        source={RACE_ASSETS.mapLandscape}
        style={[styles.mapImage, { width: boardWidth, height: boardHeight }]}
        resizeMode="contain"
      />
      <BoardCorrections width={boardWidth} height={boardHeight} />

      {/* 4. Character Tokens */}
      {players.map((player, index) => (
        <AnimatedToken key={player.id} player={player} placement={placements[player.id]}
          active={index === activePlayerIndex} moving={moving && index === activePlayerIndex}
          paused={paused} shortcut={shortcut && index === activePlayerIndex} actionId={actionId} onComplete={onMovementComplete} />
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
});
