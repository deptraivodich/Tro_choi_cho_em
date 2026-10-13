import { PRNG } from '../../../shared/math/prng';
import { getTile } from '../data/boardConfig';
import { rollDice, rollMysteryBonus, rollMysteryPenalty, decideBotCleanseUsage } from '../logic/gameEngine';
import { BotAnswerBag, QuestionGenerator, RandomSource, answerText, wrongAnswer } from '../logic/questions';
import { GameMode, Player, PenaltyEffectType } from '../types/index';
import { RaceState, RaceEvent, initialRaceState, raceReducer } from './raceReducer';
import { canActivateTileEffect } from './tileEffectChain';
import { QUESTION_TIME_LIMIT_MS, MYSTERY_RESULT_DISPLAY_MS, CLEANSE_CHOICE_MS, DICE_ROLL_DURATION_MS, SHORTCUT_ENTRY_PAUSE_MS } from './turnTiming';

// One scheduler owns all turn delays. Animation completion is an explicit event, never a guessed timer.
export class RaceController {
  private state: RaceState = initialRaceState;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private deadline = 0;
  private remainingDelay: number | null = null;
  private timerAction: (() => void) | null = null;
  private connected = false;
  private generator: QuestionGenerator;
  private botBags = new Map<string, BotAnswerBag>();
  private rng: RandomSource;
  private questionDeadline: number | null = null;
  private questionRemaining = QUESTION_TIME_LIMIT_MS;
  private pausedAt: number | null = null;
  private pausedDuration = 0;
  private finishedAt: number | null = null;
  constructor(rng?: RandomSource) {
    const random = new PRNG();
    this.rng = rng ?? (() => random.next());
    this.generator = new QuestionGenerator(this.rng);
  }
  getSnapshot = () => this.state;
  getActivePlaytime = () => Math.max(0, (this.finishedAt ?? Date.now()) - this.state.startedAt - this.pausedDuration
    - (this.pausedAt === null ? 0 : Date.now() - this.pausedAt));
  getDiceTimeRemaining = () => this.state.gamePhase !== 'rolling' ? 0 : this.state.isPaused
    ? this.remainingDelay ?? DICE_ROLL_DURATION_MS : Math.max(0, this.deadline - Date.now());
  getQuestionTimeRemaining = () => this.questionDeadline === null ? this.questionRemaining
    : Math.max(0, this.questionDeadline - Date.now());
  private freezeQuestionClock() {
    this.questionRemaining = this.getQuestionTimeRemaining();
    this.questionDeadline = null;
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  connect = () => {
    if (this.connected) return;
    this.connected = true;
    if (this.state.gamePhase === 'showing_question' && !this.state.isPaused)
      this.questionDeadline = Date.now() + this.questionRemaining;
    this.schedule();
  };
  disconnect = () => { this.freezeQuestionClock(); this.connected = false; this.cancelTimer(); };
  private cancelTimer() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null; this.timerAction = null; this.remainingDelay = null;
  }
  send = (event: RaceEvent) => {
    // An answer arriving at/after the deadline is a timeout, even if the JS
    // timeout callback was delayed by rendering or a background browser tab.
    if (event.type === 'ANSWER' && event.id === this.state.actionId && !this.state.isPaused &&
        this.state.gamePhase === 'showing_question' && this.getQuestionTimeRemaining() <= 0)
      event = { type: 'QUESTION_TIMEOUT', id: event.id };
    const next = raceReducer(this.state, event);
    if (next === this.state) return;
    if (event.type === 'START') { this.pausedAt = null; this.pausedDuration = 0; this.finishedAt = null; }
    else if (event.type === 'PAUSE') {
      if (event.paused) this.pausedAt = Date.now();
      else if (this.pausedAt !== null) { this.pausedDuration += Date.now() - this.pausedAt; this.pausedAt = null; }
    }
    if (next.gamePhase === 'finished') this.finishedAt = Date.now();
    const wasPaused = this.state.isPaused;
    if (event.type === 'DICE_DONE') {
      this.questionRemaining = QUESTION_TIME_LIMIT_MS;
      this.questionDeadline = this.connected ? Date.now() + QUESTION_TIME_LIMIT_MS : null;
    } else if (event.type === 'START') {
      this.questionRemaining = QUESTION_TIME_LIMIT_MS; this.questionDeadline = null;
    } else if (this.state.gamePhase === 'showing_question') {
      if (next.gamePhase !== 'showing_question' || next.isPaused) this.freezeQuestionClock();
      else if (wasPaused && !next.isPaused && this.connected)
        this.questionDeadline = Date.now() + this.questionRemaining;
    }
    if (event.type === 'PAUSE' && event.paused && this.timer !== null) {
      this.remainingDelay = Math.max(0, this.deadline - Date.now());
      clearTimeout(this.timer); this.timer = null;
    } else if (event.type !== 'PAUSE') this.cancelTimer();
    this.state = next;
    this.listeners.forEach(listener => listener());
    if (this.state.isPaused) return;
    if (wasPaused && this.timerAction && this.remainingDelay !== null) this.delay(this.remainingDelay, this.timerAction);
    else this.schedule();
  };
  startGame = (mode: GameMode, players: Player[]) => {
    if (players.length < 2) return;
    this.generator = new QuestionGenerator(this.rng); this.botBags.clear();
    this.send({ type: 'START', mode, players, startedAt: Date.now() });
  };
  roll = (id = this.state.actionId) => {
    if (id !== this.state.actionId || this.state.gamePhase !== 'ready_to_roll' || this.state.isPaused) return;
    this.send({ type: 'ROLL', id, value: rollDice(this.rng) });
  };
  answer = (answer: string, id = this.state.actionId) => this.send({ type: 'ANSWER', id, answer });
  acknowledgeAnswer = (id = this.state.actionId) => this.send({ type: 'ACKNOWLEDGE_ANSWER', id });
  apply = (cleanse = false, id = this.state.actionId) => this.send({ type: 'APPLY', id, cleanse });
  private delay(ms: number, action: () => void) {
    if (!this.connected) return;
    this.timerAction = action; this.remainingDelay = null; this.deadline = Date.now() + ms;
    this.timer = setTimeout(() => {
      this.timer = null; this.timerAction = null;
      if (this.connected && !this.state.isPaused) action();
    }, ms);
  }
  private schedule() {
    if (!this.connected || this.state.isPaused || this.timer !== null) return;
    const { actionId: id, gamePhase, players, activePlayerIndex } = this.state;
    const player = players[activePlayerIndex];
    const send = (event: RaceEvent) => () => this.send(event);
    switch (gamePhase) {
      case 'ready_to_roll': if (player?.isBot) this.delay(850, () => this.roll()); break;
      case 'rolling': this.delay(DICE_ROLL_DURATION_MS, () => {
        if (this.state.actionId === id) this.send({ type: 'DICE_DONE', id, question: this.generator.next(player.currentTileId) });
      }); break;
      case 'showing_question': if (player.isBot) this.delay(1400, () => {
        if (this.state.actionId !== id || !this.state.question) return;
        let bag = this.botBags.get(player.id);
        if (!bag) { bag = new BotAnswerBag(this.rng); this.botBags.set(player.id, bag); }
        const question = this.state.question;
        this.send({ type: 'ANSWER', id, answer: bag.next() ? answerText(question) : wrongAnswer(question) });
      }); else this.delay(this.getQuestionTimeRemaining(), send({ type: 'QUESTION_TIMEOUT', id })); break;
      case 'evaluating_answer':
        if (this.state.answerCorrect || player.isBot)
          this.delay(this.state.answerCorrect ? 1100 : 2800, send({ type: 'ANSWER_FEEDBACK_DONE', id }));
        break;
      case 'shortcut_pause': this.delay(SHORTCUT_ENTRY_PAUSE_MS, send({ type: 'SHORTCUT_READY', id })); break;
      case 'evaluating_tile': this.delay(0, () => {
        const tile = getTile(player.currentTileId);
        const result = !canActivateTileEffect(this.state.effectChain, tile.id) ? undefined
          : tile.type === 'bonus' ? rollMysteryBonus(undefined, this.rng)
          : tile.type === 'penalty' ? rollMysteryPenalty(tile.id, undefined, this.rng) : undefined;
        this.send({ type: 'LAND', id, result });
      }); break;
      case 'mystery_result': this.delay(!player.isBot && this.state.mysteryRollState?.canUseCleanse
        ? CLEANSE_CHOICE_MS : MYSTERY_RESULT_DISPLAY_MS, () => {
        const mystery = this.state.mysteryRollState;
        this.send({ type: 'APPLY', id, cleanse: player.isBot && !!mystery?.canUseCleanse && decideBotCleanseUsage(mystery.result as PenaltyEffectType, player.position) });
      }); break;
      case 'turn_end': this.delay(700, send({ type: 'NEXT', id })); break;
    }
  }
}
