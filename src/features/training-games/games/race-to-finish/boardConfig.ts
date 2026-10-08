import { BoardTile } from './types';

// 21 stone tiles arranged in 7 rows x 3 columns zic-zac
// Row 0 (bottom): 1 -> 2 -> 3
// Row 1: 6 <- 5 <- 4
// Row 2: 7 -> 8 -> 9
// Row 3: 12 <- 11 <- 10
// Row 4: 13 -> 14 -> 15
// Row 5: 18 <- 17 <- 16
// Row 6 (top): 19 -> 20 -> 21

export const BOARD_TILES: Record<number, BoardTile> = {
  1: {
    index: 1,
    type: 'normal',
    row: 0,
    col: 0,
    direction: 'right',
    label: '1',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  2: {
    index: 2,
    type: 'bonus_step_1',
    row: 0,
    col: 1,
    direction: 'right',
    label: '2',
    shortDesc: 'Tiến thêm 1 ô',
    itemKey: 'wing',
    bonusValue: 1,
    tileStyle: 'bonus',
  },
  3: {
    index: 3,
    type: 'normal',
    row: 0,
    col: 2,
    direction: 'right',
    label: '3',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  4: {
    index: 4,
    type: 'retreat_1',
    row: 1,
    col: 2,
    direction: 'left',
    label: '4',
    shortDesc: 'Lùi 1 ô',
    itemKey: 'back_arrow',
    bonusValue: -1,
    tileStyle: 'penalty',
  },
  5: {
    index: 5,
    type: 'bonus_step_2',
    row: 1,
    col: 1,
    direction: 'left',
    label: '5',
    shortDesc: 'Tiến thêm 2 ô',
    itemKey: 'wing',
    bonusValue: 2,
    tileStyle: 'bonus',
  },
  6: {
    index: 6,
    type: 'normal',
    row: 1,
    col: 0,
    direction: 'left',
    label: '6',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  7: {
    index: 7,
    type: 'reset_start',
    row: 2,
    col: 0,
    direction: 'right',
    label: '7',
    shortDesc: 'Về ô xuất phát (0)',
    itemKey: 'portal',
    tileStyle: 'penalty',
  },
  8: {
    index: 8,
    type: 'normal',
    row: 2,
    col: 1,
    direction: 'right',
    label: '8',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  9: {
    index: 9,
    type: 'shield',
    row: 2,
    col: 2,
    direction: 'right',
    label: '9',
    shortDesc: 'Nhận khiên bảo vệ',
    itemKey: 'shield',
    tileStyle: 'bonus',
  },
  10: {
    index: 10,
    type: 'normal',
    row: 3,
    col: 2,
    direction: 'left',
    label: '10',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  11: {
    index: 11,
    type: 'skip_turn',
    row: 3,
    col: 1,
    direction: 'left',
    label: '11',
    shortDesc: 'Mất lượt kế tiếp',
    itemKey: 'hourglass',
    tileStyle: 'penalty',
  },
  12: {
    index: 12,
    type: 'normal',
    row: 3,
    col: 0,
    direction: 'left',
    label: '12',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  13: {
    index: 13,
    type: 'cleanse',
    row: 4,
    col: 0,
    direction: 'right',
    label: '13',
    shortDesc: 'Nhận Sao Giải Bất Lợi',
    itemKey: 'cleanse',
    tileStyle: 'bonus',
  },
  14: {
    index: 14,
    type: 'retreat_2',
    row: 4,
    col: 1,
    direction: 'right',
    label: '14',
    shortDesc: 'Lùi 2 ô',
    itemKey: 'back_arrow',
    bonusValue: -2,
    tileStyle: 'penalty',
  },
  15: {
    index: 15,
    type: 'normal',
    row: 4,
    col: 2,
    direction: 'right',
    label: '15',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  16: {
    index: 16,
    type: 'normal',
    row: 5,
    col: 2,
    direction: 'left',
    label: '16',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  17: {
    index: 17,
    type: 'bonus_step_1',
    row: 5,
    col: 1,
    direction: 'left',
    label: '17',
    shortDesc: 'Tiến thêm 1 ô',
    itemKey: 'wing',
    bonusValue: 1,
    tileStyle: 'bonus',
  },
  18: {
    index: 18,
    type: 'normal',
    row: 5,
    col: 0,
    direction: 'left',
    label: '18',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  19: {
    index: 19,
    type: 'skip_turn',
    row: 6,
    col: 0,
    direction: 'right',
    label: '19',
    shortDesc: 'Mất lượt kế tiếp',
    itemKey: 'hourglass',
    tileStyle: 'penalty',
  },
  20: {
    index: 20,
    type: 'normal',
    row: 6,
    col: 1,
    direction: 'right',
    label: '20',
    shortDesc: 'Ô thường',
    tileStyle: 'neutral',
  },
  21: {
    index: 21,
    type: 'finish',
    row: 6,
    col: 2,
    direction: 'right',
    label: '21',
    shortDesc: 'VỀ ĐÍCH CHIẾN THẮNG',
    itemKey: 'trophy',
    tileStyle: 'finish',
  },
};

// Normalized board coordinate configuration (relative percentages 0..100)
// Columns: 0 (left: 23%), 1 (center: 50%), 2 (right: 77%)
// Rows: 0 (bottom: 63%) up to 6 (top: 20%)
export const COL_X_PERCENT: Record<number, number> = {
  0: 23.5,
  1: 50.0,
  2: 76.5,
};

// Row Y percentages from bottom (row 0) to top (row 6)
export const ROW_Y_PERCENT: Record<number, number> = {
  0: 64.0, // Tiles 1, 2, 3
  1: 56.6, // Tiles 6, 5, 4
  2: 49.3, // Tiles 7, 8, 9
  3: 42.0, // Tiles 12, 11, 10
  4: 34.6, // Tiles 13, 14, 15
  5: 27.3, // Tiles 18, 17, 16
  6: 20.0, // Tiles 19, 20, 21
};

// Start plank position (Tile 0)
export const START_POSITION = {
  xPercent: 19.0,
  yPercent: 73.0,
};

/**
 * Returns normalized coordinate percentage { x, y } for tile index 0..21
 */
export function getTileNormalizedCoords(tileIndex: number): { x: number; y: number } {
  if (tileIndex <= 0) {
    return { x: START_POSITION.xPercent, y: START_POSITION.yPercent };
  }
  const tile = BOARD_TILES[tileIndex];
  if (!tile) {
    // clamp to tile 21
    return { x: COL_X_PERCENT[2], y: ROW_Y_PERCENT[6] };
  }
  return {
    x: COL_X_PERCENT[tile.col],
    y: ROW_Y_PERCENT[tile.row],
  };
}

/**
 * Compute character standing offset when multiple players occupy the same tile.
 * Up to 4 players arranged neatly around tile center so they don't cover numbers.
 */
export function getPlayerTileOffset(playerIndex: number, totalAtTile: number): { offsetX: number; offsetY: number } {
  if (totalAtTile <= 1) {
    return { offsetX: 0, offsetY: -16 };
  }

  // 2 players: left-right offset
  if (totalAtTile === 2) {
    const dx = playerIndex === 0 ? -18 : 18;
    return { offsetX: dx, offsetY: -16 };
  }

  // 3 or 4 players: compact 2x2 grid offset
  const offsets = [
    { offsetX: -18, offsetY: -26 },
    { offsetX: 18, offsetY: -26 },
    { offsetX: -18, offsetY: -8 },
    { offsetX: 18, offsetY: -8 },
  ];
  return offsets[playerIndex % offsets.length];
}

/**
 * Directional path connections 1->2->...->21 for connecting arrows
 */
export interface BoardArrow {
  fromIndex: number;
  toIndex: number;
  type: 'straight' | 'curve_up';
}

export const BOARD_ARROWS: BoardArrow[] = [
  // Row 0: 1 -> 2 -> 3
  { fromIndex: 1, toIndex: 2, type: 'straight' },
  { fromIndex: 2, toIndex: 3, type: 'straight' },
  // Turn up: 3 -> 4
  { fromIndex: 3, toIndex: 4, type: 'curve_up' },

  // Row 1: 4 -> 5 -> 6 (moving left)
  { fromIndex: 4, toIndex: 5, type: 'straight' },
  { fromIndex: 5, toIndex: 6, type: 'straight' },
  // Turn up: 6 -> 7
  { fromIndex: 6, toIndex: 7, type: 'curve_up' },

  // Row 2: 7 -> 8 -> 9
  { fromIndex: 7, toIndex: 8, type: 'straight' },
  { fromIndex: 8, toIndex: 9, type: 'straight' },
  // Turn up: 9 -> 10
  { fromIndex: 9, toIndex: 10, type: 'curve_up' },

  // Row 3: 10 -> 11 -> 12 (moving left)
  { fromIndex: 10, toIndex: 11, type: 'straight' },
  { fromIndex: 11, toIndex: 12, type: 'straight' },
  // Turn up: 12 -> 13
  { fromIndex: 12, toIndex: 13, type: 'curve_up' },

  // Row 4: 13 -> 14 -> 15
  { fromIndex: 13, toIndex: 14, type: 'straight' },
  { fromIndex: 14, toIndex: 15, type: 'straight' },
  // Turn up: 15 -> 16
  { fromIndex: 15, toIndex: 16, type: 'curve_up' },

  // Row 5: 16 -> 17 -> 18 (moving left)
  { fromIndex: 16, toIndex: 17, type: 'straight' },
  { fromIndex: 17, toIndex: 18, type: 'straight' },
  // Turn up: 18 -> 19
  { fromIndex: 18, toIndex: 19, type: 'curve_up' },

  // Row 6: 19 -> 20 -> 21
  { fromIndex: 19, toIndex: 20, type: 'straight' },
  { fromIndex: 20, toIndex: 21, type: 'straight' },
];
