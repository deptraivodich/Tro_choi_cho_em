import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameBoardView } from '../components/GameBoardView';
import { MysteryRollModal } from '../components/MysteryRollModal';
import { Player } from '../types';

jest.mock('react-native-svg', () => ({ __esModule: true, default: 'svg', Line: 'line', G: 'g' }));

const players: Player[] = ['p1', 'p2'].map((id, i) => ({ id, name: id, character: i ? 'penguin' : 'fox', isBot: false,
  currentTileId: 'tile_4', pathHistory: ['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4'], position: 4,
  hasShield: false, cleanseCount: 0, skipNextTurn: false, currentPose: 'idle_1', rank: null }));
test('board render includes two stable player tokens without tile number labels', () => {
  const html = renderToStaticMarkup(<GameBoardView players={players} activePlayerIndex={0}
    boardWidth={620} boardHeight={348.75} moving={false} paused={false} actionId={1} onMovementComplete={() => {}} />);
  expect(html.match(/data-testid="token-/g)).toHaveLength(2);
  expect(html).toContain('token-p1'); expect(html).toContain('token-p2');
  expect(html).not.toContain('>Ô 4<');
});
test('hidden mystery modal does not mount a reel or launch a spin', () => {
  const complete = jest.fn();
  const html = renderToStaticMarkup(<MysteryRollModal visible={false} state={null} activePlayer={players[0]}
    paused={false} revealed={false} actionId={1} onSpinComplete={complete} onUseCleanse={() => {}} />);
  expect(html).toBe(''); expect(complete).not.toHaveBeenCalled();
});
