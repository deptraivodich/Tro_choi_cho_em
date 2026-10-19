import { getTileOrder, FINISH_TILE_ID } from '../data/boardConfig';
import { Rational, rational, add, subtract, multiply, divide, equal, parseExactAnswer, formatAnswer } from './exactAnswer';
import { QuestionSession, questionHistory, type QuestionHistory } from '../../../shared/math/questionHistory';

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
  comparison?: readonly [Rational,Rational];
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
export function formatCalculation(c: Calculation): string {
  if ('n' in c) return formatAnswer(c);
  if (!['+', '−', '×', '÷'].includes(c.op)) throw new Error('Missing or invalid calculation operator');
  return `(${formatCalculation(c.left)} ${c.op} ${formatCalculation(c.right)})`;
}

export function calculationFingerprint(c:Calculation):string{
  if('n' in c){const x=rational(c.n,c.d);return x.n+'/'+x.d;}
  if(c.op==='+'||c.op==='×'){
    const terms:string[]=[];const collect=(x:Calculation)=>{
      if(!('n' in x)&&x.op===c.op){collect(x.left);collect(x.right);}else terms.push(calculationFingerprint(x));
    };collect(c.left);collect(c.right);return c.op+'('+terms.sort().join(',')+')';
  }
  return c.op+'('+calculationFingerprint(c.left)+','+calculationFingerprint(c.right)+')';
}
export function raceFingerprint(q:RaceQuestion):string{
  if(q.comparison)return 'compare:'+q.comparison.map(calculationFingerprint).sort().join(':');
  if(!q.calculation)throw Error('Question has no mathematical identity');
  return 'race:'+(q.unit??'')+':'+calculationFingerprint(q.calculation);
}
export function validateRaceQuestion(q:RaceQuestion):boolean{
  if(!q.prompt||!q.explanation||q.prompt.length>280)return false;
  if(q.comparison){const [a,b]=q.comparison,delta=a.n*b.d-b.n*a.d;return q.answer===(delta<0?'<':delta>0?'>':'=')&&q.choices?.length===3;}
  if(!q.calculation||typeof q.answer==='string')return false;
  try{const value=evaluateCalculation(q.calculation);return value.n>=0&&value.n/value.d<=10000000&&equal(value,q.answer);}catch{return false;}
}

// All randomness is injected; templates are shuffled without replacement, and values vary each time.
export class QuestionGenerator {
  private sessions:Record<QuestionDifficulty,QuestionSession>;
  private bags: Record<QuestionDifficulty, number[]> = { medium: [], challenge: [] };
  private sequence = 0;
  private fallbackCursor=0;
  last={fallback:false,attempts:0};
  constructor(private rng: RandomSource,history:QuestionHistory=questionHistory) {
    this.sessions={medium:new QuestionSession(history,'race:medium'),challenge:new QuestionSession(history,'race:challenge')};
  }
  private int(min: number, max: number) { return min + Math.floor(this.rng() * (max - min + 1)); }
  next(tileId: string): RaceQuestion {
    const difficulty = questionDifficulty(tileId);
    if (!this.bags[difficulty].length) {
      const bag = Array.from({ length: difficulty === 'medium' ? 18 : 12 }, (_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = this.int(0, i); [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.bags[difficulty] = bag;
    }
    const template = this.bags[difficulty].pop()!;
    const session=this.sessions[difficulty],candidates:RaceQuestion[]=[];
    for (let attempt=0;attempt<32;attempt++) {
      const q=this.make(difficulty,template,this.sequence++);candidates.push(q);
      if(!validateRaceQuestion(q))throw Error('Invalid generated race question');
      if(session.allows(raceFingerprint(q))){session.accept(raceFingerprint(q));this.last={fallback:false,attempts:attempt+1};return q;}
    }
    // Bounded deterministic parameter traversal also works with constant RNG.
    // Natural additions / three-step expressions provide >9000 canonical fallbacks.
    for(let i=0;i<1024;i++){
      const rank=this.fallbackCursor++%(489*19),a=24+rank%489,b=2+Math.floor(rank/489),c=3+rank%10;
      const q=this.make(difficulty,0,this.sequence++,{a,b,c});candidates.push(q);
      if(session.allows(raceFingerprint(q))){session.accept(raceFingerprint(q));this.last={fallback:true,attempts:33+i};return q;}
    }
    const recent=session.history.recent(session.group),unused=candidates.filter(q=>session.unused(raceFingerprint(q)));
    const q=(unused.length?unused:candidates).sort((a,b)=>recent.indexOf(raceFingerprint(a))-recent.indexOf(raceFingerprint(b)))[0];
    session.accept(raceFingerprint(q));this.last={fallback:true,attempts:1056};return q;
  }
  private make(difficulty: QuestionDifficulty, template: number, sequence: number,parameters?:{a:number;b:number;c:number}): RaceQuestion {
    const a = parameters?.a ?? (difficulty==='medium'?12+(this.int(0,168)+sequence)%169:24+(this.int(0,216)+sequence)%217),
      b=parameters?.b??this.int(2,9),c=parameters?.c??this.int(3,12);
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
          return { key: `${difficulty}-${sequence}`, difficulty, category: 'compare', prompt, answer: sign, comparison:[left,right], choices: ['<', '=', '>'], explanation: `${formatAnswer(left)} ${sign} ${formatAnswer(right)} (so sánh phần nguyên rồi phần thập phân).` };
        }
        case 9: category = 'units'; unit = 'cm'; prompt = `Đổi ${formatAnswer(rational(a, 10))} m thành cm.`; calculation = calc('×', rational(a, 10), 100); explanation = '1 m = 100 cm, nên nhân số mét với 100.'; break;
        case 10: category = sequence % 2 ? 'perimeter' : 'area'; unit = sequence % 2 ? 'cm' : 'cm²'; prompt = `Hình chữ nhật dài ${a} cm, rộng ${b} cm. Tính ${sequence % 2 ? 'chu vi' : 'diện tích'}.`; calculation = sequence % 2 ? calc('×', calc('+', a, b), 2) : calc('×', a, b); explanation = sequence % 2 ? 'Chu vi = (dài + rộng) × 2.' : 'Diện tích = dài × rộng.'; break;
        case 11: category = 'word-two-steps'; unit = 'quyển'; prompt = `Có ${b} hộp, mỗi hộp ${a} quyển vở. Đã tặng đi ${c} quyển vở. Còn lại bao nhiêu quyển vở?`; calculation = calc('−', calc('×', a, b), c); explanation = 'Số vở còn lại = tổng số vở trong các hộp − số vở đã tặng đi.'; break;
        case 12: category = 'fraction-multiply'; calculation = calc('×', rational(a, c), rational(b, c)); break;
        case 13: category = 'fraction-divide'; calculation = calc('÷', rational(a, c), rational(b, c));break;
        case 14: category='time-units';unit='giây';prompt=`Đổi ${b} phút ${a} giây thành giây.`;calculation=calc('+',b*60,a);explanation='Đổi số phút sang giây rồi cộng số giây còn lại.';break;
        case 15: category='mass-units';unit='g';prompt=`Đổi ${formatAnswer(rational(a,10))} kg thành g.`;calculation=calc('×',rational(a,10),1000);explanation='1 kg = 1000 g, nhân số ki-lô-gam với 1000.';break;
        case 16: category='square-area';unit='cm²';prompt=`Hình vuông có cạnh ${b+c} cm. Tính diện tích.`;calculation=calc('×',b+c,b+c);explanation='Diện tích hình vuông = cạnh × cạnh.';break;
        default: category='motion-distance';unit='km';prompt=`Xe chạy đều ${a} km/h trong ${b} giờ. Xe đi được bao nhiêu ki-lô-mét?`;calculation=calc('×',a,b);explanation='Quãng đường = vận tốc × thời gian.';
      }
    } else {
      switch (template) {
        case 0: category = 'expression'; calculation = calc('+', calc('×', calc('−', a, b), c), calc('÷', b * c, b)); break;
        case 1: category = 'fraction-decimal'; calculation = calc('×', calc('+', rational(a, 4), rational(b, 10)), c); break;
        case 2: category = 'fraction-divide'; calculation = calc('÷', rational(a, c), rational(b, c)); break;
        case 3: category = 'percentage'; unit = 'học sinh'; prompt = `Một trường có ${a * 20} học sinh. ${b * 5}% tham gia câu lạc bộ toán. Có bao nhiêu học sinh tham gia?`; calculation = calc('÷', calc('×', a * 20, b * 5), 100); explanation = 'Số học sinh tham gia = tổng số học sinh × tỉ số phần trăm ÷ 100.'; break;
        case 4: category = 'word-three-steps'; unit = 'đồng'; prompt = `Mua ${b} quyển vở giá ${a * 1000} đồng/quyển, được giảm 10% tổng tiền. Đưa ${a * b * 1000 + 50000} đồng cho người bán. Nhận lại bao nhiêu đồng?`; calculation = calc('−', a * b * 1000 + 50000, calc('÷', calc('×', a * b * 1000, 90), 100)); explanation = 'Tính tiền vở; giảm 10% tức trả 90%; lấy tiền đưa trừ tiền phải trả.'; break;
        case 5: category = 'triangle'; unit = 'cm²'; prompt = `Tam giác có đáy ${a * 2} cm, chiều cao bằng 1/2 đáy. Tính diện tích.`; calculation = calc('÷', calc('×', a * 2, a), 2); explanation = 'Chiều cao = đáy ÷ 2. Diện tích tam giác = đáy × chiều cao ÷ 2.'; break;
        case 6: category = 'trapezoid'; unit = 'cm²'; prompt = `Hình thang có hai đáy ${a} cm và ${a + b} cm, cao ${c * 2} cm. Tính diện tích.`; calculation = calc('÷', calc('×', calc('+', a, a + b), c * 2), 2); explanation = 'Diện tích hình thang = (đáy lớn + đáy bé) × chiều cao ÷ 2.'; break;
        case 7: category = 'logic'; unit = 'viên'; prompt = `An và Bình có tổng ${a * 2 + b * 2} viên bi. An nhiều hơn Bình ${b * 2} viên. Bình có bao nhiêu viên?`; calculation = calc('÷', calc('−', a * 2 + b * 2, b * 2), 2); explanation = 'Số bi của Bình = (tổng − hiệu) ÷ 2.';break;
        case 8: category='mixed-expression';calculation=calc('÷',calc('+',rational(a,c),rational(b,4)),b);break;
        case 9: category='cuboid-volume';unit='cm³';prompt=`Hình hộp chữ nhật dài ${b+5} cm, rộng ${b} cm, cao ${c} cm. Tính thể tích.`;calculation=calc('×',calc('×',b+5,b),c);explanation='Thể tích hình hộp chữ nhật = dài × rộng × cao.';break;
        case 10: category='fraction-of-quantity';unit='cây';prompt=`Vườn có ${a*4} cây, trong đó 3/4 là cây ăn quả. Có bao nhiêu cây ăn quả?`;calculation=calc('×',a*4,rational(3,4));explanation='Số cây ăn quả = tổng số cây × 3/4.';break;
        default: category='average';unit='kg';prompt=`Ba bao gạo nặng ${a} kg, ${a+b} kg và ${a+c} kg. Trung bình mỗi bao nặng bao nhiêu ki-lô-gam?`;calculation=calc('÷',calc('+',calc('+',a,a+b),a+c),3);explanation='Cộng khối lượng ba bao rồi chia cho 3.';
      }
    }
    const answer = evaluateCalculation(calculation);
    if (!prompt) prompt = `Tính ${formatCalculation(calculation)}.`;
    if (!explanation) explanation = `Thực hiện trong ngoặc trước, nhân/chia trước cộng/trừ: ${formatCalculation(calculation)} = ${formatAnswer(answer)}.`;
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
