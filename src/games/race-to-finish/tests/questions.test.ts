import { PRNG } from '../../../shared/math/prng';
import { BotAnswerBag, Calculation, QuestionGenerator, answerText, gradeAnswer, questionDifficulty, wrongAnswer } from '../logic/questions';
import { parseExactAnswer, rational } from '../logic/exactAnswer';

test('difficulty uses main-route progress including shortcut merges', () => {
  for (let order = 0; order < 50; order++) expect(questionDifficulty(`tile_${order}`)).toBe(order < 33 ? 'medium' : 'challenge');
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
      if (question.category === 'percentage') expect(actual).toBe(numbers[0] * numbers[1] / 100);
      if (question.category === 'logic') expect(actual).toBe((numbers[0] - numbers[1]) / 2);
      if (question.category === 'triangle') expect(actual).toBe(numbers[0] * (numbers[0] / 2) / 2);
      if (question.category === 'trapezoid') expect(actual).toBe((numbers[0] + numbers[1]) * numbers[2] / 2);
      if (question.category === 'word-three-steps') expect(actual).toBe(numbers[3] - numbers[0] * numbers[1] * 0.9);
    }
  }
  expect(categories.size).toBeGreaterThanOrEqual(20);
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
