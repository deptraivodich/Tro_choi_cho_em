import { PRNG } from '../../../shared/math/prng';
import { BotAnswerBag, Calculation, QuestionGenerator, answerText, gradeAnswer, questionDifficulty, wrongAnswer, formatCalculation } from '../logic/questions';
import { parseExactAnswer, rational } from '../logic/exactAnswer';
import { BOARD_TILES, getTileOrder, FINISH_TILE_ID } from '../data/boardConfig';

test('difficulty uses main-route progress including shortcut merges', () => {
  for (const tile of Object.values(BOARD_TILES)) {
    expect(questionDifficulty(tile.id)).toBe(tile.order / getTileOrder(FINISH_TILE_ID) < 2 / 3 ? 'medium' : 'challenge');
  }
  expect(questionDifficulty('tile_11')).toBe('medium'); expect(questionDifficulty('tile_30')).toBe('medium');
});
test('decimal and equivalent fractions are exact; invalid input rejected', () => {
  expect(parseExactAnswer('0,5')).toEqual(rational(1, 2)); expect(parseExactAnswer('0.500')).toEqual(rational(1, 2));
  expect(parseExactAnswer('3 / 6')).toEqual(rational(1, 2)); expect(parseExactAnswer('-0,5')).toEqual(rational(-1, 2));
  expect(parseExactAnswer('1/0')).toBeNull(); expect(parseExactAnswer('2x')).toBeNull(); expect(parseExactAnswer('0.1.2')).toBeNull();
  const q = { key: 'q', difficulty: 'medium' as const, category: 'test', prompt: '', explanation: '', answer: rational(3, 10), unit: 'cm' };
  for (const input of ['0,3', '0.300', '3/10', '6/20', '0,3 cm']) expect(gradeAnswer(q, input)).toBe(true);
  expect(gradeAnswer(q, '0.3000001')).toBe(false); expect(gradeAnswer(q, '0,3 m')).toBe(false);
});
function independentValue(expression: Calculation): number {
  if ('n' in expression) return expression.n / expression.d;
  const a = independentValue(expression.left), b = independentValue(expression.right);
  if (expression.op === '÷') { expect(b).not.toBe(0); return a / b; }
  return expression.op === '+' ? a + b : expression.op === '−' ? a - b : a * b;
}
test('2400 generated questions are diverse, positive, and mathematically verified with an independent numeric evaluator', () => {
  const rng = new PRNG(8291); const generator = new QuestionGenerator(() => rng.next());
  const seen = new Set<string>(), categories = new Set<string>();
  for (let i = 0; i < 2400; i++) {
    const question = generator.next(i % 2 ? 'tile_40' : 'tile_10');
    expect(seen.has(question.prompt)).toBe(false); seen.add(question.prompt); categories.add(question.category);
    expect(gradeAnswer(question, answerText(question))).toBe(true);
    expect(gradeAnswer(question, wrongAnswer(question))).toBe(false);
    if (typeof question.answer !== 'string') {
      expect(question.answer.d).toBeGreaterThan(0); expect(question.answer.n).toBeGreaterThanOrEqual(0);
      const actual = question.answer.n / question.answer.d;
      expect(actual).toBeCloseTo(independentValue(question.calculation!), 7);
      // Independent checks against word-problem data extracted from what the child sees.
      const numbers = question.prompt.match(/\d+/g)?.map(Number) ?? [];
      if (question.category === 'word-two-steps') expect(actual).toBe(numbers[0] * numbers[1] - numbers[2]);
      if (question.category === 'word-two-steps') {
        expect(question.prompt).toContain('Đã tặng đi'); expect(question.prompt).toContain('Còn lại');
        expect(question.prompt).not.toContain('Được tặng');
      }
      if (['area', 'perimeter'].includes(question.category)) {
        expect(question.prompt).toMatch(/^Hình chữ nhật dài \d+ cm, rộng \d+ cm\. Tính (diện tích|chu vi)\.$/);
      }
      expect(question.prompt).not.toMatch(/cặp nhật|tích cực|\d+\s+\d+\)/);
      if (question.prompt.startsWith('Tính (')) {
        const operators = (c: Calculation): number => 'n' in c ? 0 : 1 + operators(c.left) + operators(c.right);
        expect(question.prompt.match(/[+−×÷]/g)).toHaveLength(operators(question.calculation!));
      }
      if (question.category === 'percentage') expect(actual).toBe(numbers[0] * numbers[1] / 100);
      if (question.category === 'logic') expect(actual).toBe((numbers[0] - numbers[1]) / 2);
      if (question.category === 'triangle') expect(actual).toBe(numbers[0] * (numbers[0] / 2) / 2);
      if (question.category === 'trapezoid') expect(actual).toBe((numbers[0] + numbers[1]) * numbers[2] / 2);
      if (question.category === 'word-three-steps') expect(actual).toBe(numbers[3] - numbers[0] * numbers[1] * 0.9);
    }
  }
  expect(categories.size).toBeGreaterThanOrEqual(20);
});

test('reported expression preserves division, and fractional division preserves both separators', () => {
  const expression: Calculation = { op: '+', left: { op: '×', left: { op: '−', left: rational(65), right: rational(6) },
    right: rational(10) }, right: { op: '÷', left: rational(60), right: rational(6) } };
  expect(formatCalculation(expression)).toBe('(((65 − 6) × 10) + (60 ÷ 6))');
  expect(formatCalculation({ op: '÷', left: rational(1, 3), right: rational(2, 3) })).toBe('(1/3 ÷ 2/3)');
  expect(() => formatCalculation({ op: '', left: rational(60), right: rational(6) } as unknown as Calculation)).toThrow();
});
test('constant mock RNG still yields fresh questions and terminates', () => {
  const generator = new QuestionGenerator(() => 0); const prompts = new Set<string>();
  for (let i = 0; i < 120; i++) prompts.add(generator.next('tile_0').prompt);
  expect(prompts.size).toBe(120);
});
test('each bot shuffled bag has exactly four true and one false in every complete cycle', () => {
  const rng = new PRNG(55); const bag = new BotAnswerBag(() => rng.next()); const badSlots = new Set<number>();
  for (let cycle = 0; cycle < 100; cycle++) {
    const outcomes = Array.from({ length: 5 }, () => bag.next());
    expect(outcomes.filter(Boolean)).toHaveLength(4); expect(outcomes.filter(v => !v)).toHaveLength(1);
    badSlots.add(outcomes.indexOf(false));
  }
  expect(badSlots.size).toBe(5);
});
