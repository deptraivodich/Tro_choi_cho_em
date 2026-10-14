import config from '../assets/game_config.json';
import type { SpeedQuestion } from '../types';

export function validateQuestions(questions: readonly SpeedQuestion[]): void {
  if (questions.length !== 5) throw new Error('Siêu Xe requires exactly five stages');
  questions.forEach((q, index) => {
    if (q.stage !== index + 1 || !Number.isFinite(q.distance) || !Number.isFinite(q.time) ||
      q.distance <= 0 || q.time <= 0 || q.correct_speed !== q.distance / q.time ||
      q.sample_choices.length !== 4 || new Set(q.sample_choices).size !== 4 ||
      q.sample_choices.some(v => !Number.isFinite(v) || v <= 0) ||
      !q.sample_choices.includes(q.correct_speed) ||
      !q.sample_choices.some(v => v < q.correct_speed) || !q.sample_choices.some(v => v > q.correct_speed)) {
      throw new Error(`Invalid speed question at stage ${index + 1}`);
    }
  });
}
// Data boundary: replace this array with a validated five-question application source.
export const QUESTIONS: readonly SpeedQuestion[] = config.questions;
validateQuestions(QUESTIONS);

export function answerOptions(q: SpeedQuestion): number[] {
  const offset = q.stage % 4;
  return q.sample_choices.slice(offset).concat(q.sample_choices.slice(0, offset));
}
