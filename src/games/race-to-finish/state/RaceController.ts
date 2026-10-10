import { PRNG } from '../../../shared/math/prng';
import { getTile } from '../data/boardConfig';
import { rollDice, rollMysteryBonus, rollMysteryPenalty, decideBotForkChoice, decideBotCleanseUsage } from '../logic/gameEngine';
import { BotAnswerBag, QuestionGenerator, RandomSource, answerText, wrongAnswer } from '../logic/questions';
import { GameMode, Player, PenaltyEffectType } from '../types/index';
import { RaceState, RaceEvent, initialRaceState, raceReducer } from './raceReducer';

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
  constructor(rng?: RandomSource) {
    const random = new PRNG();
    this.rng = rng ?? (() => random.next());
    this.generator = new QuestionGenerator(this.rng);
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  connect = () => { this.connected = true; this.schedule(); };
  disconnect = () => { this.connected = false; this.cancelTimer(); };
  private cancelTimer() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null; this.timerAction = null; this.remainingDelay = null;
  }
  send = (event: RaceEvent) => {
    const next = raceReducer(this.state, event);
    if (next === this.state) return;
    const wasPaused = this.state.isPaused;
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
  branch = (choice: 'main' | 'shortcut', id = this.state.actionId) => this.send({ type: 'BRANCH', id, choice });
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
      case 'rolling': this.delay(750, () => {
        if (this.state.actionId === id) this.send({ type: 'DICE_DONE', id, question: this.generator.next(player.currentTileId) });
      }); break;
      case 'showing_question': if (player.isBot) this.delay(1400, () => {
        if (this.state.actionId !== id || !this.state.question) return;
        let bag = this.botBags.get(player.id);
        if (!bag) { bag = new BotAnswerBag(this.rng); this.botBags.set(player.id, bag); }
        const question = this.state.question;
        this.send({ type: 'ANSWER', id, answer: bag.next() ? answerText(question) : wrongAnswer(question) });
      }); break;
      case 'evaluating_answer': this.delay(this.state.answerCorrect ? 1100 : 2800, send({ type: 'ANSWER_FEEDBACK_DONE', id })); break;
      case 'awaiting_fork_choice': if (player.isBot) this.delay(900, () => this.send({ type: 'BRANCH', id, choice: decideBotForkChoice() })); break;
      case 'evaluating_tile': this.delay(0, () => {
        const tile = getTile(player.currentTileId);
        const result = tile.type === 'bonus' ? rollMysteryBonus(undefined, this.rng)
          : tile.type === 'penalty' ? rollMysteryPenalty(tile.id, undefined, this.rng) : undefined;
        this.send({ type: 'LAND', id, result });
      }); break;
      case 'mystery_result': if (player.isBot) this.delay(1400, () => {
        const mystery = this.state.mysteryRollState;
        this.send({ type: 'APPLY', id, cleanse: !!mystery?.canUseCleanse && decideBotCleanseUsage(mystery.result as PenaltyEffectType, player.position) });
      }); break;
      case 'turn_end': this.delay(700, send({ type: 'NEXT', id })); break;
    }
  }
}
