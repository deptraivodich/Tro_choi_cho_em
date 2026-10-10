import { Fraction, simplifyFraction, gcd, areFractionsEqual, addFractions } from './fraction';
import { MassUnit } from './units';
import { PRNG } from './prng';

// ============================================================================
// 1. ENERGY DEFENSE GENERATOR
// ============================================================================

export interface EnergyPiece {
  id: string;
  display: string;
  fraction: Fraction;
  numericVal: number;
}

export interface EnergyDefenseProblem {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  targetDisplay: string;
  targetFraction: Fraction;
  targetNumeric: number;
  availablePieces: EnergyPiece[];
  explanation: string;
  questionType: 'decimals_warmup' | 'hundredths_fractions' | 'mixed_combo';
  validCombosCount: number;
}

/**
 * Generates an Energy Defense problem with 100% solvable guaranteed pieces.
 * Supports multiple valid combinations and arbitrary piece subset selection.
 */
export function generateEnergyDefenseProblem(
  difficulty: 'easy' | 'medium' | 'hard',
  seed?: number | string,
  historyIds?: string[]
): EnergyDefenseProblem {
  const rng = new PRNG(seed);

  // Pool of candidate target configurations per difficulty level
  if (difficulty === 'easy') {
    // Warm-up: 1-decimal numbers (0.5 to 3.0), combining 2-3 pieces
    const targets = [
      { target: 1.5, num: 3, den: 2, label: '1,5' },
      { target: 2.0, num: 2, den: 1, label: '2,0' },
      { target: 2.5, num: 5, den: 2, label: '2,5' },
      { target: 1.8, num: 9, den: 5, label: '1,8' },
      { target: 1.2, num: 6, den: 5, label: '1,2' },
      { target: 1.6, num: 8, den: 5, label: '1,6' },
      { target: 2.4, num: 12, den: 5, label: '2,4' },
      { target: 3.0, num: 3, den: 1, label: '3,0' },
      { target: 2.2, num: 11, den: 5, label: '2,2' },
      { target: 1.4, num: 7, den: 5, label: '1,4' },
    ];

    // Pick target with anti-repetition against history
    let chosen = rng.pick(targets);
    if (historyIds && historyIds.length > 0) {
      const candidates = targets.filter((t) => !historyIds.includes(`easy-${t.target}`));
      if (candidates.length > 0) chosen = rng.pick(candidates);
    }

    // Build guaranteed solution parts (2 or 3 pieces)
    let p1Val = 0;
    let p2Val = 0;
    let p3Val = 0;
    const pieceCount = rng.next() > 0.5 ? 2 : 3;

    if (pieceCount === 2) {
      // Split chosen.target into 2 parts
      const possibleP1 = [0.4, 0.5, 0.6, 0.7, 0.8, 1.0, 1.2].filter((v) => v < chosen.target);
      p1Val = rng.pick(possibleP1.length > 0 ? possibleP1 : [0.5]);
      p2Val = Math.round((chosen.target - p1Val) * 10) / 10;
    } else {
      // 3 parts
      p1Val = 0.5;
      const rem = Math.round((chosen.target - p1Val) * 10) / 10;
      p2Val = Math.round((rem / 2) * 10) / 10;
      p3Val = Math.round((rem - p2Val) * 10) / 10;
    }

    const pieces: EnergyPiece[] = [];
    const addPiece = (id: string, val: number) => {
      const display = val.toString().replace('.', ',');
      const num = Math.round(val * 10);
      const frac = simplifyFraction({ num, den: 10 });
      pieces.push({ id, display, fraction: frac, numericVal: val });
    };

    addPiece('p1', p1Val);
    addPiece('p2', p2Val);
    if (pieceCount === 3 && p3Val > 0) addPiece('p3', p3Val);

    // Add 2-3 distractors that do NOT accidentally make unfair traps
    const distractors = [0.3, 0.4, 0.6, 0.9, 1.1, 1.3, 0.7].filter(
      (d) => !pieces.some((p) => Math.abs(p.numericVal - d) < 0.05)
    );
    rng.shuffle(distractors);
    for (let i = 0; i < Math.min(2, distractors.length); i++) {
      addPiece(`d${i + 1}`, distractors[i]);
    }

    rng.shuffle(pieces);

    return {
      id: `easy-${chosen.target}-${rng.nextInt(1000, 9999)}`,
      difficulty: 'easy',
      targetDisplay: chosen.label,
      targetFraction: { num: chosen.num, den: chosen.den },
      targetNumeric: chosen.target,
      availablePieces: pieces,
      explanation: `${p1Val.toString().replace('.', ',')} + ${p2Val.toString().replace('.', ',')}${pieceCount === 3 ? ' + ' + p3Val.toString().replace('.', ',') : ''} = ${chosen.label} năng lượng!`,
      questionType: 'decimals_warmup',
      validCombosCount: 1,
    };
  } else if (difficulty === 'medium') {
    // Practice: hundredths decimals (0.25, 0.75, 1.25) & common fractions (1/4, 3/4, 1/2)
    const targets = [
      { target: 1.25, num: 5, den: 4, label: '1,25 (5/4)' },
      { target: 1.5, num: 3, den: 2, label: '1,50 (3/2)' },
      { target: 1.75, num: 7, den: 4, label: '1,75 (7/4)' },
      { target: 2.25, num: 9, den: 4, label: '2,25 (9/4)' },
      { target: 2.5, num: 5, den: 2, label: '2,50 (5/2)' },
      { target: 2.75, num: 11, den: 4, label: '2,75 (11/4)' },
      { target: 0.75, num: 3, den: 4, label: '0,75 (3/4)' },
    ];

    let chosen = rng.pick(targets);
    if (historyIds && historyIds.length > 0) {
      const candidates = targets.filter((t) => !historyIds.includes(`med-${t.target}`));
      if (candidates.length > 0) chosen = rng.pick(candidates);
    }

    const pieces: EnergyPiece[] = [];
    // Provide a mix of fractions and decimals
    if (chosen.target === 1.25) {
      pieces.push({ id: 'p1', display: '0,50 (1/2)', fraction: { num: 1, den: 2 }, numericVal: 0.5 });
      pieces.push({ id: 'p2', display: '0,75 (3/4)', fraction: { num: 3, den: 4 }, numericVal: 0.75 });
      pieces.push({ id: 'p3', display: '0,25 (1/4)', fraction: { num: 1, den: 4 }, numericVal: 0.25 });
      pieces.push({ id: 'p4', display: '1,00', fraction: { num: 1, den: 1 }, numericVal: 1.0 });
      pieces.push({ id: 'p5', display: '0,40', fraction: { num: 2, den: 5 }, numericVal: 0.4 });
    } else if (chosen.target === 1.75) {
      pieces.push({ id: 'p1', display: '1,00', fraction: { num: 1, den: 1 }, numericVal: 1.0 });
      pieces.push({ id: 'p2', display: '3/4 (0,75)', fraction: { num: 3, den: 4 }, numericVal: 0.75 });
      pieces.push({ id: 'p3', display: '1/2 (0,50)', fraction: { num: 1, den: 2 }, numericVal: 0.5 });
      pieces.push({ id: 'p4', display: '1/4 (0,25)', fraction: { num: 1, den: 4 }, numericVal: 0.25 });
      pieces.push({ id: 'p5', display: '0,60', fraction: { num: 3, den: 5 }, numericVal: 0.6 });
    } else if (chosen.target === 2.25) {
      pieces.push({ id: 'p1', display: '1,50 (3/2)', fraction: { num: 3, den: 2 }, numericVal: 1.5 });
      pieces.push({ id: 'p2', display: '3/4 (0,75)', fraction: { num: 3, den: 4 }, numericVal: 0.75 });
      pieces.push({ id: 'p3', display: '1,00', fraction: { num: 1, den: 1 }, numericVal: 1.0 });
      pieces.push({ id: 'p4', display: '0,50 (1/2)', fraction: { num: 1, den: 2 }, numericVal: 0.5 });
      pieces.push({ id: 'p5', display: '0,25 (1/4)', fraction: { num: 1, den: 4 }, numericVal: 0.25 });
    } else if (chosen.target === 2.75) {
      pieces.push({ id: 'p1', display: '1,50 (3/2)', fraction: { num: 3, den: 2 }, numericVal: 1.5 });
      pieces.push({ id: 'p2', display: '1,25 (5/4)', fraction: { num: 5, den: 4 }, numericVal: 1.25 });
      pieces.push({ id: 'p3', display: '3/4 (0,75)', fraction: { num: 3, den: 4 }, numericVal: 0.75 });
      pieces.push({ id: 'p4', display: '1/2 (0,50)', fraction: { num: 1, den: 2 }, numericVal: 0.5 });
      pieces.push({ id: 'p5', display: '1,00', fraction: { num: 1, den: 1 }, numericVal: 1.0 });
    } else if (chosen.target === 2.5) {
      pieces.push({ id: 'p1', display: '1,50 (3/2)', fraction: { num: 3, den: 2 }, numericVal: 1.5 });
      pieces.push({ id: 'p2', display: '1,00', fraction: { num: 1, den: 1 }, numericVal: 1.0 });
      pieces.push({ id: 'p3', display: '3/4 (0,75)', fraction: { num: 3, den: 4 }, numericVal: 0.75 });
      pieces.push({ id: 'p4', display: '3/4 (0,75)', fraction: { num: 3, den: 4 }, numericVal: 0.75 });
      pieces.push({ id: 'p5', display: '0,50 (1/2)', fraction: { num: 1, den: 2 }, numericVal: 0.5 });
    } else {
      // 0.75 or 1.50
      pieces.push({ id: 'p1', display: '1,00', fraction: { num: 1, den: 1 }, numericVal: 1.0 });
      pieces.push({ id: 'p2', display: '0,50 (1/2)', fraction: { num: 1, den: 2 }, numericVal: 0.5 });
      pieces.push({ id: 'p3', display: '3/4 (0,75)', fraction: { num: 3, den: 4 }, numericVal: 0.75 });
      pieces.push({ id: 'p4', display: '1/4 (0,25)', fraction: { num: 1, den: 4 }, numericVal: 0.25 });
      pieces.push({ id: 'p5', display: '0,50 (1/2)', fraction: { num: 1, den: 2 }, numericVal: 0.5 });
    }

    rng.shuffle(pieces);

    return {
      id: `med-${chosen.target}-${rng.nextInt(1000, 9999)}`,
      difficulty: 'medium',
      targetDisplay: chosen.label,
      targetFraction: { num: chosen.num, den: chosen.den },
      targetNumeric: chosen.target,
      availablePieces: pieces,
      explanation: `Ghép các mảnh để tổng bằng đúng ${chosen.label}! Có thể dùng nhiều tổ hợp hợp lệ (ví dụ: 1,00 + 0,75 = 1,75 hoặc 1,00 + 0,50 + 0,25 = 1,75).`,
      questionType: 'hundredths_fractions',
      validCombosCount: 2,
    };
  } else {
    // Hard: Mixed numbers, three-part combinations, equivalent fractions
    const targets = [
      { target: 2.25, num: 9, den: 4, label: '2 1/4 (2,25)' },
      { target: 2.5, num: 5, den: 2, label: '2 1/2 (2,50)' },
      { target: 1.625, num: 13, den: 8, label: '1 5/8 (1,625)' },
      { target: 1.875, num: 15, den: 8, label: '1 7/8 (1,875)' },
      { target: 2.75, num: 11, den: 4, label: '2 3/4 (2,75)' },
      { target: 3.25, num: 13, den: 4, label: '3 1/4 (3,25)' },
    ];

    let chosen = rng.pick(targets);
    if (historyIds && historyIds.length > 0) {
      const candidates = targets.filter((t) => !historyIds.includes(`hard-${t.target}`));
      if (candidates.length > 0) chosen = rng.pick(candidates);
    }

    const pieces: EnergyPiece[] = [
      { id: 'p1', display: '1 1/2 (1,50)', fraction: { num: 3, den: 2 }, numericVal: 1.5 },
      { id: 'p2', display: '3/4 (0,75)', fraction: { num: 3, den: 4 }, numericVal: 0.75 },
      { id: 'p3', display: '1/2 (0,50)', fraction: { num: 1, den: 2 }, numericVal: 0.5 },
      { id: 'p4', display: '1/4 (0,25)', fraction: { num: 1, den: 4 }, numericVal: 0.25 },
      { id: 'p5', display: '1,00', fraction: { num: 1, den: 1 }, numericVal: 1.0 },
      { id: 'p6', display: '1/8 (0,125)', fraction: { num: 1, den: 8 }, numericVal: 0.125 },
    ];

    rng.shuffle(pieces);

    return {
      id: `hard-${chosen.target}-${rng.nextInt(1000, 9999)}`,
      difficulty: 'hard',
      targetDisplay: chosen.label,
      targetFraction: { num: chosen.num, den: chosen.den },
      targetNumeric: chosen.target,
      availablePieces: pieces,
      explanation: `Mục tiêu ${chosen.label} đòi hỏi kết hợp linh hoạt giữa hỗn số, phân số và số thập phân tương đương!`,
      questionType: 'mixed_combo',
      validCombosCount: 2,
    };
  }
}

// ============================================================================
// 2. PLANNER RESCUE GENERATOR
// ============================================================================

export interface PlanetRescueRoom {
  roomNumber: number;
  roomName: string;
  alienType: 'scout' | 'cruiser' | 'dreadnought' | 'mothership';
  shieldFraction: Fraction;
  simplifiedShield: Fraction;
  divisorUsed: number;
  attackConditionText: string;
  attackTargetDenominator: number;
  availableDivisors: number[];
  storyText: string;
}

export function generatePlanetRescueRooms(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  seed?: number | string
): PlanetRescueRoom[] {
  const rng = new PRNG(seed);

  // Pool of room fractions by difficulty
  const roomData = [
    {
      name: 'Trạm Vệ Tinh Alpha',
      alienType: 'scout' as const,
      num: 6,
      den: 8,
      divisor: 2,
      story: 'Tuần thám không gian đang rình rập ngoài rìa trạm không gian!',
    },
    {
      name: 'Vành Đai Thiên Thạch',
      alienType: 'scout' as const,
      num: 8,
      den: 12,
      divisor: 4,
      story: 'Tàu trinh sát ẩn nấp sau những tảng đá băng thiên thạch.',
    },
    {
      name: 'Hành Tinh Khí Sao Mộc',
      alienType: 'cruiser' as const,
      num: 10,
      den: 15,
      divisor: 5,
      story: 'Tuần dương hạm bọc giáp trường lực đang phong tỏa khí quyển!',
    },
    {
      name: 'Hố Đen Hỗn Loạn',
      alienType: 'cruiser' as const,
      num: 14,
      den: 21,
      divisor: 7,
      story: 'Bẫy trọng lực từ tàu chiến hạm của hạm đội hắc ám.',
    },
    {
      name: 'Pháo Đài Titan Vực Thẳm',
      alienType: 'dreadnought' as const,
      num: 15,
      den: 20,
      divisor: 5,
      story: 'Thiết giáp hạm mang khiên năng lượng phản quang cực mạnh!',
    },
    {
      name: 'Trùm Cuối: Mẫu Hạm Tinh Vân',
      alienType: 'mothership' as const,
      num: 18,
      den: 24,
      divisor: 6,
      story: 'Chỉ huy tối cao của hạm đội xâm lăng! Hãy rút gọn khiên và xuyên giáp!',
    },
  ];

  if (difficulty === 'hard') {
    roomData[4] = {
      name: 'Thiết Giáp Hạm Hắc Ám',
      alienType: 'dreadnought' as const,
      num: 24,
      den: 36,
      divisor: 12,
      story: 'Lá chắn ma trận cần tìm ước chung lớn nhất để phá vỡ!',
    };
  }

  const roomCount = difficulty === 'hard' ? 6 : 5;
  const rooms: PlanetRescueRoom[] = [];

  for (let i = 0; i < roomCount; i++) {
    const raw = roomData[i];
    const frac: Fraction = { num: raw.num, den: raw.den };
    const simp = simplifyFraction(frac);

    // Divisors options (correct one + 3 plausible distractors)
    const distractors = [2, 3, 4, 5, 6, 7].filter((d) => d !== raw.divisor);
    rng.shuffle(distractors);
    const divisors = rng.shuffle([raw.divisor, distractors[0], distractors[1], distractors[2]]);

    rooms.push({
      roomNumber: i + 1,
      roomName: raw.name,
      alienType: raw.alienType,
      shieldFraction: frac,
      simplifiedShield: simp,
      divisorUsed: raw.divisor,
      attackConditionText: `Cần thẻ đòn đánh có mẫu số bằng ${simp.den} để xuyên thủng giáp!`,
      attackTargetDenominator: simp.den,
      availableDivisors: divisors,
      storyText: raw.story,
    });
  }

  return rooms;
}

// ============================================================================
// 3. TERRAIN RACING GENERATOR (v = s / t, s = v * t, t = s / v)
// ============================================================================

export interface TerrainRacingStage {
  stageNumber: number;
  name: string;
  problemType: 'find_v' | 'find_s' | 'find_t' | 'unit_conversion';
  questionPrompt: string;
  distance: number;
  distanceUnit: 'km' | 'm';
  time: number;
  timeUnit: 'h' | 'phút' | 'giây';
  targetVelocity: number;
  velocityUnit: string;
  correctAnswer: number;
  answerUnit: string;
  options: number[];
  terrainTheme: 'grass_hills' | 'canyon_jump' | 'rocky_mountains' | 'desert_dunes' | 'sky_bridge';
}

export function generateRacingStages(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  seed?: number | string
): TerrainRacingStage[] {
  const rng = new PRNG(seed);

  const rawConfigs = [
    {
      name: 'Đồi Cỏ Khởi Động',
      type: 'find_v' as const,
      d: 120,
      dUnit: 'km' as const,
      t: 2,
      tUnit: 'h' as const,
      ans: 60,
      v: 60,
      vUnit: 'km/h',
      prompt: 'Xe chạy 120 km trong 2 giờ. Vận tốc v = s : t là bao nhiêu?',
      theme: 'grass_hills' as const,
    },
    {
      name: 'Đèo Gió Vàng',
      type: 'find_v' as const,
      d: 150,
      dUnit: 'm' as const,
      t: 5,
      tUnit: 'giây' as const,
      ans: 30,
      v: 30,
      vUnit: 'm/s',
      prompt: 'Xe vượt 150 m trong 5 giây. Vận tốc v = s : t là bao nhiêu?',
      theme: 'rocky_mountains' as const,
    },
    {
      name: 'Thung Lũng Khe Sâu',
      type: 'find_s' as const,
      d: 90,
      dUnit: 'km' as const,
      t: 1.5,
      tUnit: 'h' as const,
      ans: 90,
      v: 60,
      vUnit: 'km/h',
      prompt: 'Xe chạy với vận tốc 60 km/h trong 1,5 giờ. Quãng đường s = v × t là bao nhiêu?',
      theme: 'canyon_jump' as const,
    },
    {
      name: 'Rừng Nguyên Sinh',
      type: 'find_t' as const,
      d: 240,
      dUnit: 'm' as const,
      t: 8,
      tUnit: 'giây' as const,
      ans: 8,
      v: 30,
      vUnit: 'm/s',
      prompt: 'Quãng đường 240 m với vận tốc 30 m/s. Thời gian t = s : v là bao nhiêu?',
      theme: 'grass_hills' as const,
    },
    {
      name: 'Cầu Treo Vắt Vẻo',
      type: 'find_v' as const,
      d: 200,
      dUnit: 'km' as const,
      t: 4,
      tUnit: 'h' as const,
      ans: 50,
      v: 50,
      vUnit: 'km/h',
      prompt: 'Vượt cầu 200 km trong 4 giờ. Vận tốc v = s : t là bao nhiêu?',
      theme: 'sky_bridge' as const,
    },
    {
      name: 'Bãi Cát Sa Mạc',
      type: 'find_s' as const,
      d: 350,
      dUnit: 'm' as const,
      t: 7,
      tUnit: 'giây' as const,
      ans: 350,
      v: 50,
      vUnit: 'm/s',
      prompt: 'Chạy trên cát với vận tốc 50 m/s trong 7 giây. Quãng đường s = v × t là bao nhiêu?',
      theme: 'desert_dunes' as const,
    },
    {
      name: 'Đường Hầm Núi Đá',
      type: 'find_v' as const,
      d: 180,
      dUnit: 'km' as const,
      t: 3,
      tUnit: 'h' as const,
      ans: 60,
      v: 60,
      vUnit: 'km/h',
      prompt: 'Xe xuyên hầm 180 km trong 3 giờ. Vận tốc v = s : t là bao nhiêu?',
      theme: 'rocky_mountains' as const,
    },
    {
      name: 'Đoạn Dốc Cầu Vồng',
      type: 'find_t' as const,
      d: 400,
      dUnit: 'm' as const,
      t: 8,
      tUnit: 'giây' as const,
      ans: 8,
      v: 50,
      vUnit: 'm/s',
      prompt: 'Vượt dốc 400 m với vận tốc 50 m/s. Thời gian t = s : v là bao nhiêu?',
      theme: 'canyon_jump' as const,
    },
    {
      name: 'Đường Cao Tốc Mây',
      type: 'find_v' as const,
      d: 360,
      dUnit: 'km' as const,
      t: 4,
      tUnit: 'h' as const,
      ans: 90,
      v: 90,
      vUnit: 'km/h',
      prompt: 'Chặng cao tốc dài 360 km trong 4 giờ. Vận tốc v = s : t là bao nhiêu?',
      theme: 'sky_bridge' as const,
    },
    {
      name: 'Chặng Đỉnh Vinh Quang',
      type: 'unit_conversion' as const,
      d: 30,
      dUnit: 'km' as const,
      t: 30,
      tUnit: 'phút' as const,
      ans: 60,
      v: 60,
      vUnit: 'km/h',
      prompt: 'Quãng đường 30 km đi hết 30 phút (0,5 giờ). Vận tốc đạt được theo km/h là bao nhiêu?',
      theme: 'canyon_jump' as const,
    },
  ];

  return rawConfigs.map((c, idx) => {
    // Generate smart options: correct ans, plus believable distractors
    const deltas = [-10, 10, -5, 5, -20, 15];
    rng.shuffle(deltas);
    const optSet = new Set<number>([c.ans]);
    for (const d of deltas) {
      const val = c.ans + d;
      if (val > 0) optSet.add(val);
      if (optSet.size >= 4) break;
    }
    const options = rng.shuffle(Array.from(optSet));

    return {
      stageNumber: idx + 1,
      name: c.name,
      problemType: c.type,
      questionPrompt: c.prompt,
      distance: c.d,
      distanceUnit: c.dUnit,
      time: c.t,
      timeUnit: c.tUnit,
      targetVelocity: c.v,
      velocityUnit: c.vUnit,
      correctAnswer: c.ans,
      answerUnit: c.type === 'find_v' || c.type === 'unit_conversion' ? c.vUnit : c.type === 'find_s' ? c.dUnit : c.tUnit,
      options,
      terrainTheme: c.theme,
    };
  });
}

// ============================================================================
// 4. SPACE PETS GENERATOR (%)
// ============================================================================

export interface SpacePetProblem {
  id: string;
  petType: 'starlight' | 'nebula' | 'cosmo';
  petName: string;
  startingFullness: number;
  neededPercent: number;
  availableRations: { id: string; label: string; percent: number }[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function generateSpacePetProblem(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  seed?: number | string
): SpacePetProblem {
  const rng = new PRNG(seed);

  const petTypes: ('starlight' | 'nebula' | 'cosmo')[] = ['starlight', 'nebula', 'cosmo'];
  const petNames: Record<string, string[]> = {
    starlight: ['Bé Tinh Cầu Lấp Lánh', 'Ngôi Sao Nhỏ', 'Ánh Sao Băng'],
    nebula: ['Tiểu Tinh Vân Lam', 'Mây Tím Vũ Trụ', 'Sương Đêm Thiên Hà'],
    cosmo: ['Mèo Con Ngân Hà', 'Hổ Con Thiên Thể', 'Cún Con Sao Chổi'],
  };

  const pType = rng.pick(petTypes);
  const pName = rng.pick(petNames[pType]);

  // Varied starting fullness (NOT hardcoded 40%!)
  let startingFullness = 40;
  if (difficulty === 'easy') {
    startingFullness = rng.pick([30, 40, 50, 60, 70]);
  } else if (difficulty === 'medium') {
    startingFullness = rng.pick([25, 35, 45, 55, 65, 75]);
  } else {
    startingFullness = rng.pick([15, 20, 35, 48, 52, 68]);
  }

  const needed = 100 - startingFullness;

  // Build a set of food portions that guarantee at least one valid combo
  const rations: { id: string; label: string; percent: number }[] = [];

  if (needed % 20 === 0 && needed >= 40) {
    rations.push({ id: 'r1', label: '+20%', percent: 20 });
    rations.push({ id: 'r2', label: `+${needed - 20}%`, percent: needed - 20 });
  } else if (needed % 25 === 0) {
    rations.push({ id: 'r1', label: '+25%', percent: 25 });
    rations.push({ id: 'r2', label: `+${needed - 25}%`, percent: needed - 25 });
  } else {
    const half = Math.floor(needed / 2);
    rations.push({ id: 'r1', label: `+${half}%`, percent: half });
    rations.push({ id: 'r2', label: `+${needed - half}%`, percent: needed - half });
  }

  // Add 3-4 distractors
  const distractors = [10, 15, 20, 25, 30, 40, 50].filter(
    (d) => d !== needed && !rations.some((r) => r.percent === d)
  );
  rng.shuffle(distractors);
  for (let i = 0; i < 3; i++) {
    if (distractors[i]) {
      rations.push({ id: `d${i + 1}`, label: `+${distractors[i]}%`, percent: distractors[i] });
    }
  }

  rng.shuffle(rations);

  return {
    id: `pet-${startingFullness}-${rng.nextInt(100, 999)}`,
    petType: pType,
    petName: pName,
    startingFullness,
    neededPercent: needed,
    availableRations: rations,
    explanation: `Độ no hiện tại là ${startingFullness}%, cần nạp thêm đúng ${needed}% để đạt 100%!`,
    difficulty,
  };
}

// ============================================================================
// 5. BLOCK ISLAND QUESTS GENERATOR (Area & Perimeter)
// ============================================================================

export interface IslandQuest {
  id: string;
  title: string;
  shapeName: string;
  targetType: 'area' | 'perimeter';
  targetValue: number;
  formulaNote: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function generateBlockIslandQuests(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  seed?: number | string
): IslandQuest[] {
  const rng = new PRNG(seed);

  const questPool: IslandQuest[] = [
    {
      id: 'q1',
      title: 'Kho Thóc Hoàng Gia',
      shapeName: 'Hình chữ nhật',
      targetType: 'area',
      targetValue: 12,
      formulaNote: 'S = dài × rộng = 12 ô vuông (ví dụ 3×4 hoặc 2×6)',
      description: 'Quy hoạch khu đất kho lương thực có diện tích đúng 12 ô vuông!',
      difficulty: 'easy',
    },
    {
      id: 'q2',
      title: 'Tường Thành Phòng Thủ',
      shapeName: 'Chu vi tường',
      targetType: 'perimeter',
      targetValue: 16,
      formulaNote: 'Chu vi P là tổng độ dài các cạnh viền ngoài cùng',
      description: 'Xây tường bao quanh đảo có chu vi đúng 16 đơn vị dài!',
      difficulty: 'easy',
    },
    {
      id: 'q3',
      title: 'Quảng Trường Trung Tâm',
      shapeName: 'Hình vuông',
      targetType: 'area',
      targetValue: 16,
      formulaNote: 'S = cạnh × cạnh = 4 × 4 = 16 ô vuông',
      description: 'Lát đá hoa cương cho quảng trường đảo có diện tích 16 ô vuông!',
      difficulty: 'medium',
    },
    {
      id: 'q4',
      title: 'Hải Đăng Tam Giác',
      shapeName: 'Hình tam giác',
      targetType: 'area',
      targetValue: 8,
      formulaNote: 'S = (đáy × chiều cao vuông góc) : 2 (ví dụ đáy 4, cao 4)',
      description: 'Dựng tháp hải đăng tam giác diện tích 8 ô. Lưu ý: Chiều cao phải thẳng đứng!',
      difficulty: 'hard',
    },
    {
      id: 'q5',
      title: 'Đê Chắn Sóng Hình Thang',
      shapeName: 'Hình thang',
      targetType: 'area',
      targetValue: 10,
      formulaNote: 'S = [(đáy lớn + đáy nhỏ) × chiều cao] : 2',
      description: 'Đắp đê biển hình thang có diện tích đúng 10 ô vuông!',
      difficulty: 'hard',
    },
    {
      id: 'q6',
      title: 'Bến Cảng Vạn Hoa',
      shapeName: 'Chu vi bến tàu',
      targetType: 'perimeter',
      targetValue: 18,
      formulaNote: 'Chu vi viền ngoài trừ toàn bộ các cạnh tiếp giáp bên trong',
      description: 'Xây bến tàu cập cảng có chu vi đúng 18 đơn vị dài!',
      difficulty: 'medium',
    },
  ];

  return rng.shuffle(questPool);
}

// ============================================================================
// 6. VAULT CODE GENERATOR
// ============================================================================

export interface VaultCodeProblem {
  code: string;
  wholePart: number;
  decimalPart: number;
  formatText: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hints: {
    type: 'greater_less' | 'place_value' | 'divisibility';
    text: string;
  }[];
}

export function generateVaultCode(
  seedStr?: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): VaultCodeProblem {
  const rng = new PRNG(seedStr);

  let whole = 24;
  let dec = 50;

  if (difficulty === 'easy') {
    whole = rng.nextInt(12, 60);
    dec = rng.pick([20, 25, 50, 75, 80]);
  } else if (difficulty === 'medium') {
    whole = rng.nextInt(15, 89);
    dec = rng.nextInt(10, 95);
  } else {
    whole = rng.nextInt(20, 98);
    dec = rng.nextInt(5, 99);
  }

  const code = `${whole}.${dec < 10 ? '0' + dec : dec}`;
  const hints: VaultCodeProblem['hints'] = [];

  // Divisibility clue
  if (whole % 2 === 0) {
    hints.push({ type: 'divisibility', text: 'Phần nguyên là số chẵn (chia hết cho 2).' });
  } else {
    hints.push({ type: 'divisibility', text: 'Phần nguyên là số lẻ (không chia hết cho 2).' });
  }

  if (whole % 3 === 0) {
    hints.push({ type: 'divisibility', text: 'Tổng các chữ số của phần nguyên chia hết cho 3.' });
  }
  if (whole % 5 === 0) {
    hints.push({ type: 'divisibility', text: 'Phần nguyên có chữ số tận cùng là 0 hoặc 5 (chia hết cho 5).' });
  }

  // Place value clue
  const tenths = Math.floor(dec / 10);
  hints.push({
    type: 'place_value',
    text: `Chữ số hàng phần mười là ${tenths >= 5 ? 'lớn hơn hoặc bằng 5' : 'nhỏ hơn 5'} (${tenths}).`,
  });

  return {
    code,
    wholePart: whole,
    decimalPart: dec,
    formatText: 'Mật mã gồm 2 chữ số phần nguyên và 2 chữ số phần thập phân (##.##)',
    difficulty,
    hints,
  };
}

// ============================================================================
// 7. FLOATING MARKET DEALS GENERATOR (Mass conversion, profit/loss)
// ============================================================================

export interface MarketDeal {
  id: string;
  produceName: string;
  wholesaleQty: number;
  wholesaleUnit: MassUnit;
  buyPricePerWholesale: number;
  transportFee: number;
  retailUnit: MassUnit;
  suggestedRetailPricePerKg: number;
}

export function generateFloatingMarketDeals(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  seed?: number | string
): MarketDeal[] {
  const rng = new PRNG(seed);

  const producePool = [
    { name: 'Dưa Hấu Long An', qty: 1.5, unit: 'tan' as MassUnit, price: 10_000_000, fee: 500_000, retail: 10_000 },
    { name: 'Xoài Cát Hòa Lộc', qty: 8, unit: 'ta' as MassUnit, price: 1_200_000, fee: 400_000, retail: 20_000 },
    { name: 'Gạo ST25 Sóc Trăng', qty: 2, unit: 'tan' as MassUnit, price: 12_000_000, fee: 600_000, retail: 18_000 },
    { name: 'Sầu Riêng Ri6 Cái Mơn', qty: 5, unit: 'ta' as MassUnit, price: 2_500_000, fee: 300_000, retail: 65_000 },
    { name: 'Bưởi Da Xanh Bến Tre', qty: 12, unit: 'yen' as MassUnit, price: 350_000, fee: 200_000, retail: 45_000 },
    { name: 'Thanh Long Ruột Đỏ', qty: 1.2, unit: 'tan' as MassUnit, price: 8_000_000, fee: 500_000, retail: 15_000 },
  ];

  return rng.shuffle(
    producePool.map((p, idx) => ({
      id: `deal-${idx + 1}`,
      produceName: p.name,
      wholesaleQty: p.qty,
      wholesaleUnit: p.unit,
      buyPricePerWholesale: p.price,
      transportFee: p.fee,
      retailUnit: 'kg' as MassUnit,
      suggestedRetailPricePerKg: p.retail,
    }))
  );
}

// ============================================================================
// 8. RHYTHM BAKERY ORDERS GENERATOR
// ============================================================================

export interface BakeryOrder {
  id: string;
  name: string;
  whole: number;
  fractionNum: number;
  fractionDen: number;
  sliceFraction: string;
  requiredSlices: number;
}

export function generateRhythmBakeryOrders(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  seed?: number | string
): BakeryOrder[] {
  const rng = new PRNG(seed);

  const orderPool: BakeryOrder[] = [
    {
      id: 'b1',
      name: 'Bánh Kem Dâu Tây',
      whole: 2,
      fractionNum: 1,
      fractionDen: 2,
      sliceFraction: '1/2',
      requiredSlices: 5, // 2 * 2 + 1
    },
    {
      id: 'b2',
      name: 'Bánh Tart Cam Vàng',
      whole: 1,
      fractionNum: 3,
      fractionDen: 4,
      sliceFraction: '1/4',
      requiredSlices: 7, // 1 * 4 + 3
    },
    {
      id: 'b3',
      name: 'Bánh Mì Sô-cô-la',
      whole: 3,
      fractionNum: 1,
      fractionDen: 2,
      sliceFraction: '1/2',
      requiredSlices: 7, // 3 * 2 + 1
    },
    {
      id: 'b4',
      name: 'Bánh Su Kem Vani',
      whole: 2,
      fractionNum: 1,
      fractionDen: 4,
      sliceFraction: '1/4',
      requiredSlices: 9, // 2 * 4 + 1
    },
    {
      id: 'b5',
      name: 'Bánh Táo Quế Nướng',
      whole: 1,
      fractionNum: 1,
      fractionDen: 2,
      sliceFraction: '1/2',
      requiredSlices: 3, // 1 * 2 + 1
    },
  ];

  return rng.shuffle(orderPool);
}

// ============================================================================
// 9. TREASURE DIVE SCENARIO GENERATOR (Charts & Probabilities)
// ============================================================================

export interface DepthZone {
  depthMeters: number;
  name: string;
  surveyTreasurePercent: number;
  dangerLevel: string;
  sampleCount: number;
}

export function generateTreasureDiveZones(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  seed?: number | string
): DepthZone[] {
  const rng = new PRNG(seed);

  return [
    {
      depthMeters: 50,
      name: 'Rạn San Hô Nắng Ấm',
      surveyTreasurePercent: rng.nextInt(75, 85),
      dangerLevel: 'Thấp',
      sampleCount: 100,
    },
    {
      depthMeters: 150,
      name: 'Xác Tàu Cổ Hoàng Hôn',
      surveyTreasurePercent: rng.nextInt(55, 65),
      dangerLevel: 'Trung bình',
      sampleCount: 100,
    },
    {
      depthMeters: 300,
      name: 'Vực Thẳm Tối Bí Ẩn',
      surveyTreasurePercent: rng.nextInt(30, 42),
      dangerLevel: 'Cao',
      sampleCount: 100,
    },
  ];
}
