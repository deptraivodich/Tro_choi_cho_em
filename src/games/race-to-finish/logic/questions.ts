import { getTileOrder, FINISH_TILE_ID } from '../data/boardConfig';
import { Rational, rational, add, subtract, multiply, divide, equal, parseExactAnswer, formatAnswer } from './exactAnswer';

export type RandomSource = () => number;
export type QuestionDifficulty = 'medium' | 'challenge';
export type Calculation = Rational | { op: '+' | '−' | '×' | '÷'; left: Calculation; right: Calculation };
export interface RaceQuestion {
  key: string;
  difficulty: QuestionDifficulty;
  category: string;
  prompt: string;
  answer: Rational | '<' | '=' | '>';
  explanation: string;
  unit?: string;
  choices?: string[];
  calculation?: Calculation;
}
export function evaluateCalculation(expression: Calculation): Rational {
  if ('n' in expression) return expression;
  const left = evaluateCalculation(expression.left), right = evaluateCalculation(expression.right);
  switch (expression.op) {
    case '+': return add(left, right);
    case '−': return subtract(left, right);
    case '×': return multiply(left, right);
    case '÷': return divide(left, right);
  }
}
export function questionDifficulty(tileId: string): QuestionDifficulty {
  return getTileOrder(tileId) / getTileOrder(FINISH_TILE_ID) >= 2 / 3 ? 'challenge' : 'medium';
}
export function answerText(question: RaceQuestion): string {
  return typeof question.answer === 'string' ? question.answer : formatAnswer(question.answer);
}
export function gradeAnswer(question: RaceQuestion, input: string): boolean {
  if (typeof question.answer === 'string') return input.trim() === question.answer;
  let value = input.trim();
  if (question.unit && value.endsWith(question.unit)) value = value.slice(0, -question.unit.length).trim();
  const parsed = parseExactAnswer(value);
  return parsed !== null && equal(parsed, question.answer);
}
export function wrongAnswer(question: RaceQuestion): string {
  if (question.choices) return question.choices.find(option => !gradeAnswer(question, option))!;
  const incorrect = formatAnswer(add(question.answer as Rational, rational(1)));
  if (gradeAnswer(question, incorrect)) throw new Error('Wrong answer matched expected answer');
  return incorrect;
}

const calc = (op: '+' | '−' | '×' | '÷', left: Calculation | number, right: Calculation | number): Calculation =>
  ({ op, left: typeof left === 'number' ? rational(left) : left, right: typeof right === 'number' ? rational(right) : right });
const print = (c: Calculation): string => 'n' in c ? formatAnswer(c) : `(${print(c.left)} ${c.op} ${print(c.right)})`;

// All randomness is injected; templates are shuffled without replacement, and values vary each time.
export class QuestionGenerator {
  private seen = new Set<string>();
  private bags: Record<QuestionDifficulty, number[]> = { medium: [], challenge: [] };
  private sequence = 0;
  constructor(private rng: RandomSource) {}
  private int(min: number, max: number) { return min + Math.floor(this.rng() * (max - min + 1)); }
  next(tileId: string): RaceQuestion {
    const difficulty = questionDifficulty(tileId);
    if (!this.bags[difficulty].length) {
      const bag = Array.from({ length: difficulty === 'medium' ? 14 : 8 }, (_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = this.int(0, i); [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.bags[difficulty] = bag;
    }
    const template = this.bags[difficulty].pop()!;
    let question: RaceQuestion;
    for (let attempt = 0; ; attempt++) {
      question = this.make(difficulty, template, this.sequence++);
      if (!this.seen.has(question.prompt)) break;
      // Even a constant/mock RNG must terminate and yield fresh valid values.
      if (attempt > 1000) throw new Error('Question space exhausted');
    }
    this.seen.add(question.prompt);
    return question;
  }
  private make(difficulty: QuestionDifficulty, template: number, sequence: number): RaceQuestion {
    const a = this.int(12, 80) + sequence, b = this.int(2, 9), c = this.int(3, 12);
    let category = '', prompt = '', explanation = '', unit: string | undefined;
    let calculation: Calculation = rational(0);
    if (difficulty === 'medium') {
      switch (template) {
        case 0: category = 'natural-add'; calculation = calc('+', a * 3, b * 11); break;
        case 1: category = 'natural-subtract'; calculation = calc('−', a * 5, b); break;
        case 2: category = 'natural-multiply'; calculation = calc('×', a, b); break;
        case 3: category = 'natural-divide'; calculation = calc('÷', a * b, b); break;
        case 4: category = 'decimal-add'; calculation = calc('+', rational(a, 10), rational(b, 100)); break;
        case 5: category = 'decimal-subtract'; calculation = calc('−', rational(a, 10), rational(b, 10)); break;
        case 6: category = 'decimal-multiply-divide'; calculation = sequence % 2 ? calc('×', rational(a, 10), b) : calc('÷', rational(a * b, 10), b); break;
        case 7: category = 'fraction'; calculation = calc(sequence % 2 ? '+' : '−', rational(a, c), rational(b, c)); break;
        case 8: {
          const left = rational(a, 10), right = rational(b);
          const sign = left.n * right.d < right.n * left.d ? '<' : left.n * right.d === right.n * left.d ? '=' : '>';
          prompt = `Điền dấu thích hợp: ${formatAnswer(left)} … ${formatAnswer(right)}`;
          return { key: `${difficulty}-${sequence}`, difficulty, category: 'compare', prompt, answer: sign, choices: ['<', '=', '>'], explanation: `${formatAnswer(left)} ${sign} ${formatAnswer(right)} (so sánh phần nguyên rồi phần thập phân).` };
        }
        case 9: category = 'units'; unit = 'cm'; prompt = `Đổi ${formatAnswer(rational(a, 10))} m thành cm.`; calculation = calc('×', rational(a, 10), 100); explanation = '1 m = 100 cm, nên nhân số mét với 100.'; break;
        case 10: category = sequence % 2 ? 'perimeter' : 'area'; unit = sequence % 2 ? 'cm' : 'cm²'; prompt = `Hình chữ nhật dài ${a} cm, rộng ${b} cm. Tính ${sequence % 2 ? 'chu vi' : 'diện tích'}.`; calculation = sequence % 2 ? calc('×', calc('+', a, b), 2) : calc('×', a, b); explanation = sequence % 2 ? 'Chu vi = (dài + rộng) × 2.' : 'Diện tích = dài × rộng.'; break;
        case 11: category = 'word-two-steps'; unit = 'quyển'; prompt = `Có ${b} hộp, mỗi hộp ${a} quyển vở. Đã tặng ${c} quyển. Còn lại bao nhiêu quyển?`; calculation = calc('−', calc('×', a, b), c); explanation = 'Tính tổng số vở trong các hộp rồi trừ số vở đã tặng.'; break;
        case 12: category = 'fraction-multiply'; calculation = calc('×', rational(a, c), rational(b, c)); break;
        default: category = 'fraction-divide'; calculation = calc('÷', rational(a, c), rational(b, c));
      }
    } else {
      switch (template) {
        case 0: category = 'expression'; calculation = calc('+', calc('×', calc('−', a, b), c), calc('÷', b * c, b)); break;
        case 1: category = 'fraction-decimal'; calculation = calc('×', calc('+', rational(a, 4), rational(b, 10)), c); break;
        case 2: category = 'fraction-divide'; calculation = calc('÷', rational(a, c), rational(b, c)); break;
        case 3: category = 'percentage'; unit = 'học sinh'; prompt = `Một trường có ${a * 20} học sinh. ${b * 5}% tham gia câu lạc bộ toán. Có bao nhiêu học sinh tham gia?`; calculation = calc('÷', calc('×', a * 20, b * 5), 100); explanation = 'Số học sinh tham gia = tổng số học sinh × tỉ số phần trăm ÷ 100.'; break;
        case 4: category = 'word-three-steps'; unit = 'đồng'; prompt = `Mua ${b} quyển vở giá ${a * 1000} đồng/quyển, được giảm 10% tổng tiền. Trả ${a * b * 1000 + 50000} đồng. Nhận lại bao nhiêu đồng?`; calculation = calc('−', a * b * 1000 + 50000, calc('÷', calc('×', a * b * 1000, 90), 100)); explanation = 'Tính tiền vở; giảm 10% tức trả 90%; lấy tiền đưa trừ tiền phải trả.'; break;
        case 5: category = 'triangle'; unit = 'cm²'; prompt = `Tam giác có đáy ${a * 2} cm, chiều cao bằng 1/2 đáy. Tính diện tích.`; calculation = calc('÷', calc('×', a * 2, a), 2); explanation = 'Chiều cao = đáy ÷ 2. Diện tích tam giác = đáy × chiều cao ÷ 2.'; break;
        case 6: category = 'trapezoid'; unit = 'cm²'; prompt = `Hình thang có hai đáy ${a} cm và ${a + b} cm, cao ${c * 2} cm. Tính diện tích.`; calculation = calc('÷', calc('×', calc('+', a, a + b), c * 2), 2); explanation = 'Diện tích hình thang = (đáy lớn + đáy bé) × chiều cao ÷ 2.'; break;
        default: category = 'logic'; unit = 'viên'; prompt = `An và Bình có tổng ${a * 2 + b * 2} viên bi. An nhiều hơn Bình ${b * 2} viên. Bình có bao nhiêu viên?`; calculation = calc('÷', calc('−', a * 2 + b * 2, b * 2), 2); explanation = 'Số bi của Bình = (tổng − hiệu) ÷ 2.';
      }
    }
    const answer = evaluateCalculation(calculation);
    if (!prompt) prompt = `Tính ${print(calculation)}.`;
    if (!explanation) explanation = `Thực hiện trong ngoặc trước, nhân/chia trước cộng/trừ: ${print(calculation)} = ${formatAnswer(answer)}.`;
    return { key: `${difficulty}-${sequence}`, difficulty, category, prompt, answer, explanation, unit, calculation };
  }
}

export class BotAnswerBag {
  private bag: boolean[] = [];
  constructor(private rng: RandomSource) {}
  next(): boolean {
    if (!this.bag.length) {
      this.bag = [true, true, true, true, false];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop()!;
  }
}
