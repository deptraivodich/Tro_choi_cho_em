import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { defaultSetupName } from '../logic/playerIdentity';
import { tokenGait } from '../logic/tokenGait';
import { fitToBoard } from '../logic/cameraGeometry';
import { RaceHUD } from '../components/RaceHUD';
import { Player } from '../types';

test('default names follow selected characters even after a swap or a mode change', () => {
  expect(defaultSetupName('single', 1, 'bunny')).toBe('Thỏ Tím Máy');
  expect(defaultSetupName('single', 2, 'penguin')).toBe('Cánh Cụt Máy');
  expect(defaultSetupName('single', 3, 'fox')).toBe('Cáo Con Máy');
  expect(defaultSetupName('single', 0, 'turtle')).toBe('Em');
  expect(defaultSetupName('local_multiplayer', 2, 'bunny')).toBe('Người chơi 3');
});

test('HUD identity, active portrait and participant id agree at every turn in a swapped roster', () => {
  const players: Player[] = (['turtle', 'bunny', 'penguin', 'fox'] as const).map((character, index) => ({
    id: `p-${index + 1}`, name: defaultSetupName('single', index, character), character, isBot: index > 0,
    position: 0, currentTileId: 'tile_0', pathHistory: ['tile_0'], currentPose: 'idle_1',
    hasShield: false, cleanseCount: 0, skipNextTurn: false, rank: null,
  }));
  for (const player of players) {
    const html = renderToStaticMarkup(<RaceHUD player={player} players={players} canRoll={!player.isBot}
      rolling={false} intro={false} message="" onRoll={() => {}} onPause={() => {}} />);
    const label = html.split('data-testid="race-current-player"')[1].split('data-testid="race-player-roster"')[0];
    expect(html).toContain(`aria-label="${player.id}"`);
    expect(label).toContain(player.name);
    for (const other of players.filter(participant => participant.id !== player.id)) expect(label).not.toContain(other.name);
    expect(html).toContain(`race-portrait-${player.character}`);
    expect((html.match(/data-testid="race-avatar-/g) || []).length).toBe(4);
  }
});

test.each([640, 780, 800])('landscape %i follows with modestly wider zoom, still above board fit', width => {
  const bounds = fitToBoard(width, 360);
  expect(bounds.zoom / (360 / 285)).toBeCloseTo(.90476, 4);
  expect(bounds.zoom).toBeGreaterThan(bounds.fit);
});

test.each([false, true])('gait is visibly animated and returns to idle for shortcut=%s', shortcut => {
  const frames = Array.from({ length: 101 }, (_, index) => tokenGait(index / 100, 50, true, shortcut, false));
  expect(frames[0]).toEqual({ lift: 0, tilt: 0, squash: 1 });
  expect(frames[100]).toEqual(frames[0]);
  expect(Math.min(...frames.map(frame => frame.lift))).toBeLessThan(-5);
  expect(Math.max(...frames.map(frame => frame.tilt))).toBeGreaterThan(2);
  for (const frame of frames) {
    expect(frame.lift).toBeGreaterThanOrEqual(-5.25);
    expect(frame.squash).toBeLessThanOrEqual(1.035);
  }
});

test('idle and accessibility reduced motion have no bob or residual transform', () => {
  expect(tokenGait(.4, 50, false, false, false)).toEqual({ lift: 0, tilt: 0, squash: 1 });
  expect(tokenGait(.4, 50, true, true, true)).toEqual({ lift: 0, tilt: 0, squash: 1 });
});
