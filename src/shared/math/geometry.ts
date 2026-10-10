export interface GridPoint {
  x: number;
  y: number;
}

/**
 * Calculate area of arbitrary block collection (number of unique cells)
 */
export function calculateGridArea(cells: GridPoint[]): number {
  const set = new Set<string>();
  cells.forEach(c => set.add(`${c.x},${c.y}`));
  return set.size;
}

/**
 * Calculate perimeter of arbitrary block collection
 * Removes interior shared edges between adjacent blocks
 */
export function calculateGridPerimeter(cells: GridPoint[]): number {
  const set = new Set<string>();
  cells.forEach(c => set.add(`${c.x},${c.y}`));

  let perimeter = 0;
  // 4 directions: up, down, left, right
  const neighbors = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  for (const cell of set) {
    const [x, y] = cell.split(',').map(Number);
    for (const { dx, dy } of neighbors) {
      const neighborKey = `${x + dx},${y + dy}`;
      // If neighbor is NOT in the shape, this is an exterior boundary edge
      if (!set.has(neighborKey)) {
        perimeter++;
      }
    }
  }

  return perimeter;
}

/**
 * Shape area formulas for primary school geometry
 */
export const shapeFormulas = {
  square: {
    name: 'Hình vuông',
    formula: 'S = a × a, P = 4 × a',
    area: (a: number) => a * a,
    perimeter: (a: number) => 4 * a,
  },
  rectangle: {
    name: 'Hình chữ nhật',
    formula: 'S = a × b, P = (a + b) × 2',
    area: (a: number, b: number) => a * b,
    perimeter: (a: number, b: number) => (a + b) * 2,
  },
  triangle: {
    name: 'Hình tam giác',
    formula: 'S = (đáy × chiều cao) : 2',
    note: 'Chiều cao là đoạn thẳng vuông góc hạ từ đỉnh xuống đáy (không phải cạnh xiên)',
    area: (base: number, height: number) => (base * height) / 2,
  },
  trapezoid: {
    name: 'Hình thang',
    formula: 'S = [(đáy lớn + đáy bé) × chiều cao] : 2',
    note: 'Chiều cao là khoảng cách vuông góc giữa hai đáy song song (không phải cạnh bên)',
    area: (baseA: number, baseB: number, height: number) => ((baseA + baseB) * height) / 2,
  },
};
