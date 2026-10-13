import { Player, GamePhase, GameMode, MysteryRollState, BonusEffectType, PenaltyEffectType } from '../types/index';
import { START_TILE_ID, FINISH_TILE_ID, getTile, getTileOrder, isTileInFirstTen } from '../data/boardConfig';
import { getNextTileId, isForkTile } from '../logic/gameEngine';
import { RaceQuestion, gradeAnswer } from '../logic/questions';
import { canActivateTileEffect, TileEffectChain } from './tileEffectChain';

export interface Movement {
  remaining: number;
  kind: 'forward' | 'backward' | 'reset' | 'shortcut';
  cause: 'dice' | 'bonus' | 'penalty' | 'shortcut';
}
export interface RaceState {
  actionId: number;
  turnId: number;
  sessionId: number;
  startedAt: number;
  gameMode: GameMode;
  players: Player[];
  activePlayerIndex: number;
  gamePhase: GamePhase;
  isPaused: boolean;
  currentDiceValue: number;
  question: RaceQuestion | null;
  submittedAnswer: string | null;
  answerCorrect: boolean | null;
  answerFailure: 'incorrect' | 'timeout' | null;
  correctCount: number;
  incorrectCount: number;
  motion: Movement | null;
  diceLanding: { tileId: string; playerIndex: number; turnId: number } | null;
  mysteryRollState: MysteryRollState | null;
  effectChain: TileEffectChain | null;
  winner: Player | null;
  logMessage: string;
}
export const initialRaceState: RaceState = {
  actionId: 0, turnId: 0, sessionId: 0, startedAt: 0, gameMode: 'single', players: [], activePlayerIndex: 0,
  gamePhase: 'setup', isPaused: false, currentDiceValue: 3, question: null, submittedAnswer: null,
  answerCorrect: null, answerFailure: null, correctCount: 0, incorrectCount: 0, motion: null, diceLanding: null, mysteryRollState: null,
  effectChain: null, winner: null, logMessage: 'Tung xúc xắc, giải toán rồi tiến về đích!',
};
export type RaceEvent =
  | { type: 'START'; mode: GameMode; players: Player[]; startedAt?: number }
  | { type: 'PAUSE'; paused: boolean }
  | { type: 'ROLL'; id: number; value: number }
  | { type: 'DICE_DONE'; id: number; question: RaceQuestion }
  | { type: 'ANSWER'; id: number; answer: string }
  | { type: 'QUESTION_TIMEOUT'; id: number }
  | { type: 'ACKNOWLEDGE_ANSWER'; id: number }
  | { type: 'ANSWER_FEEDBACK_DONE'; id: number }
  | { type: 'ANSWER_FEEDBACK_DISMISSED'; id: number }
  | { type: 'MOTION_DONE'; id: number }
  | { type: 'SHORTCUT_READY'; id: number }
  | { type: 'LAND'; id: number; result?: BonusEffectType | PenaltyEffectType }
  | { type: 'SPIN_DONE'; id: number }
  | { type: 'APPLY'; id: number; cleanse?: boolean }
  | { type: 'NEXT'; id: number }
  | { type: 'HANDOVER'; id: number };

// A logical position at an entry is insufficient: require a completed dice
// landing for this player/turn. Intermediate and effect motion never create it.
export function hasValidDiceLanding(s: RaceState): boolean {
  return s.motion === null && s.answerCorrect === true && s.diceLanding !== null &&
    s.diceLanding.tileId === s.players[s.activePlayerIndex]?.currentTileId &&
    s.diceLanding.playerIndex === s.activePlayerIndex && s.diceLanding.turnId === s.turnId;
}

function patchPlayer(s: RaceState, patch: Partial<Player>): RaceState {
  return { ...s, players: s.players.map((p, i) => i === s.activePlayerIndex ? { ...p, ...patch } : p) };
}
function endTurn(s: RaceState, message = s.logMessage): RaceState {
  return { ...patchPlayer(s, { currentPose: 'idle_1' }), gamePhase: 'turn_end', motion: null,
    diceLanding: null, mysteryRollState: null, effectChain: null, logMessage: message };
}
// The logical position changes only here. Visual interpolation never writes a tile position.
function nextStep(s: RaceState, motion: Movement): RaceState {
  const player = s.players[s.activePlayerIndex];
  let tileId: string, history: string[];
  if (motion.kind === 'reset') { tileId = START_TILE_ID; history = [START_TILE_ID]; }
  else if (motion.kind === 'backward') {
    history = player.pathHistory.length > 1 ? player.pathHistory.slice(0, -1) : [START_TILE_ID];
    tileId = history[history.length - 1];
  } else {
    tileId = getNextTileId(player.currentTileId, motion.kind === 'shortcut' ? 'shortcut' : 'main');
    history = [...player.pathHistory, tileId];
  }
  return { ...patchPlayer(s, { currentTileId: tileId, position: getTileOrder(tileId), pathHistory: history,
    currentPose: motion.kind === 'reset' ? 'penalty' : 'walk_1' }),
    gamePhase: motion.cause === 'dice' ? 'moving' : 'applying_effect', diceLanding: null,
    motion: { ...motion, remaining: motion.remaining - 1 } };
}

function transition(s: RaceState, event: Exclude<RaceEvent, { type: 'START' } | { type: 'PAUSE' }>): RaceState {
  const player = s.players[s.activePlayerIndex];
  if (!player) return s;
  switch (event.type) {
    case 'ROLL':
      if (s.gamePhase !== 'ready_to_roll' || !Number.isInteger(event.value) || event.value < 1 || event.value > 6) return s;
      return { ...s, gamePhase: 'rolling', currentDiceValue: event.value, question: null, diceLanding: null,
        answerCorrect: null, answerFailure: null, submittedAnswer: null, logMessage: `${player.name} đang tung xúc xắc...` };
    case 'DICE_DONE':
      if (s.gamePhase !== 'rolling') return s;
      return { ...s, gamePhase: 'showing_question', question: event.question,
        logMessage: `Xúc xắc: ${s.currentDiceValue}. Trả lời đúng để đi ${s.currentDiceValue} ô!` };
    case 'ANSWER': {
      if (s.gamePhase !== 'showing_question' || !s.question) return s;
      const correct = gradeAnswer(s.question, event.answer);
      return { ...s, gamePhase: 'evaluating_answer', submittedAnswer: event.answer, answerCorrect: correct,
        answerFailure: correct ? null : 'incorrect',
        correctCount: s.correctCount + Number(correct), incorrectCount: s.incorrectCount + Number(!correct),
        logMessage: correct ? `${player.name} trả lời đúng!` : `${player.name} trả lời chưa đúng, đứng nguyên vị trí.` };
    }
    case 'QUESTION_TIMEOUT':
      if (s.gamePhase !== 'showing_question' || !s.question) return s;
      return { ...s, gamePhase: 'evaluating_answer', submittedAnswer: '', answerCorrect: false,
        answerFailure: 'timeout', incorrectCount: s.incorrectCount + 1,
        logMessage: `${player.name} hết thời gian trả lời, đứng nguyên vị trí.` };
    case 'ACKNOWLEDGE_ANSWER':
      if (s.gamePhase !== 'evaluating_answer' || s.answerCorrect !== false || player.isBot) return s;
      return endTurn({ ...s, question: null });
    case 'ANSWER_FEEDBACK_DONE':
      if (s.gamePhase !== 'evaluating_answer' || (!s.answerCorrect && !player.isBot)) return s;
      return { ...s, gamePhase: 'closing_answer' };
    case 'ANSWER_FEEDBACK_DISMISSED':
      if (s.gamePhase !== 'closing_answer') return s;
      return s.answerCorrect ? nextStep({ ...s, question: null }, { remaining: s.currentDiceValue, kind: 'forward', cause: 'dice' })
        : endTurn({ ...s, question: null });
    case 'MOTION_DONE': {
      if (!['moving', 'applying_effect'].includes(s.gamePhase) || !s.motion) return s;
      if (player.currentTileId === FINISH_TILE_ID) {
        const final = patchPlayer(s, { rank: 1, currentPose: 'victory' });
        return { ...final, gamePhase: 'finished', motion: null, effectChain: null, mysteryRollState: null,
          diceLanding: null, winner: final.players[s.activePlayerIndex],
          logMessage: `${player.name} đã cán đích!` };
      }
      if (s.motion.remaining > 0) return nextStep(s, s.motion);
      const landed = patchPlayer(s, { currentPose: 'idle_1' });
      if (s.motion.cause === 'shortcut') return endTurn(landed);
      // Only the final animation can inspect the landing. Effect movement uses
      // the same landing phase, but never earns dice-only shortcut eligibility.
      return { ...landed, gamePhase: 'evaluating_tile', motion: null,
        diceLanding: s.motion.cause === 'dice'
          ? { tileId: player.currentTileId, playerIndex: s.activePlayerIndex, turnId: s.turnId } : null };
    }
    case 'LAND': {
      if (s.gamePhase !== 'evaluating_tile' || s.motion) return s;
      const tile = getTile(player.currentTileId);
      // Both dice and effect movement arrive here after their last animation.
      // Intermediate tiles cannot resolve LAND; shortcut eligibility is separate.
      if (isForkTile(tile.id)) {
        if (!hasValidDiceLanding(s)) return endTurn(s);
        // Consume eligibility once. Stay on the entrance until the controller's
        // pause-aware idle beat ends; no route choice and no movement callback.
        return { ...patchPlayer(s, { currentPose: 'idle_1' }), gamePhase: 'shortcut_pause',
          diceLanding: null, motion: null, logMessage: `${player.name} chuẩn bị đi đường tắt!` };
      }
      if (tile.type !== 'bonus' && tile.type !== 'penalty') return endTurn(s, `${player.name} dừng chân an toàn.`);
      if (!canActivateTileEffect(s.effectChain, tile.id))
        return endTurn(s, `${player.name} hoàn tất chuỗi thưởng/phạt.`);
      const validResults = tile.type === 'bonus' ? ['advance_1', 'advance_2', 'shield', 'cleanse']
        : isTileInFirstTen(tile.id) ? ['retreat_1', 'retreat_2', 'skip_turn', 'reset_start'] : ['retreat_1', 'retreat_2', 'skip_turn'];
      if (!event.result || !validResults.includes(event.result)) return s;
      const effectActionId = s.actionId + 1;
      const triggeredTileIds = [...(s.effectChain?.triggeredTileIds ?? []), tile.id];
      return { ...s, gamePhase: 'rolling_mystery', diceLanding: null,
        effectChain: { id: s.effectChain?.id ?? effectActionId, turnId: s.turnId, playerIndex: s.activePlayerIndex,
          currentTileId: tile.id, triggeredTileIds, effectCount: triggeredTileIds.length, effectActionId },
        mysteryRollState: {
        id: s.actionId + 1, type: tile.type, tileId: tile.id, playerIndex: s.activePlayerIndex,
        result: event.result, hasShieldProtection: tile.type === 'penalty' && player.hasShield,
        canUseCleanse: tile.type === 'penalty' && !player.hasShield && player.cleanseCount > 0,
      }, logMessage: tile.type === 'bonus' ? 'Đang quay phần thưởng...' : 'Đang quay hình phạt...' };
    }
    case 'SHORTCUT_READY':
      if (s.gamePhase !== 'shortcut_pause' || !isForkTile(player.currentTileId)) return s;
      return nextStep({ ...s, logMessage: `${player.name} tự động đi đường tắt!` },
        { kind: 'shortcut', remaining: 1, cause: 'shortcut' });
    case 'SPIN_DONE':
      return s.gamePhase === 'rolling_mystery' ? { ...s, gamePhase: 'mystery_result' } : s;
    case 'APPLY': {
      if (s.gamePhase !== 'mystery_result' || !s.mysteryRollState) return s;
      const mystery = s.mysteryRollState;
      if (event.cleanse) {
        if (!mystery.canUseCleanse || player.cleanseCount < 1) return s;
        return endTurn(patchPlayer(s, { cleanseCount: player.cleanseCount - 1 }), 'Ngôi sao đã hóa giải hình phạt!');
      }
      const clean = { ...s, mysteryRollState: null };
      if (mystery.type === 'penalty' && player.hasShield) return endTurn(patchPlayer(clean, { hasShield: false }), 'Khiên đã chặn hình phạt!');
      switch (mystery.result) {
        case 'shield': return endTurn(patchPlayer(clean, { hasShield: true }), 'Nhận Khiên Thần!');
        case 'cleanse': return endTurn(patchPlayer(clean, { cleanseCount: 1 }), 'Giữ ngôi sao để hóa giải bất lợi!');
        case 'skip_turn': return endTurn(patchPlayer(clean, { skipNextTurn: true }), 'Mất lượt kế tiếp.');
        case 'reset_start':
          if (!isTileInFirstTen(mystery.tileId)) return s;
          return nextStep(clean, { kind: 'reset', remaining: 1, cause: 'penalty' });
        case 'retreat_1': case 'retreat_2':
          return nextStep(clean, { kind: 'backward', remaining: mystery.result === 'retreat_1' ? 1 : 2, cause: 'penalty' });
        case 'advance_1': case 'advance_2':
          return nextStep(clean, { kind: 'forward', remaining: mystery.result === 'advance_1' ? 1 : 2, cause: 'bonus' });
      }
    }
    case 'NEXT': {
      if (s.gamePhase !== 'turn_end') return s;
      const nextIndex = (s.activePlayerIndex + 1) % s.players.length;
      const next = s.players[nextIndex];
      const base = { ...s, activePlayerIndex: nextIndex, turnId: s.turnId + 1, question: null,
        submittedAnswer: null, answerCorrect: null, answerFailure: null, diceLanding: null, mysteryRollState: null };
      if (next.skipNextTurn) return endTurn(patchPlayer(base, { skipNextTurn: false }), `${next.name} nghỉ lượt này do hình phạt.`);
      return { ...base, gamePhase: s.gameMode === 'local_multiplayer' && !next.isBot ? 'turn_handover' : 'ready_to_roll',
        logMessage: `Đến lượt ${next.name}.` };
    }
    case 'HANDOVER': return s.gamePhase === 'turn_handover' ? { ...s, gamePhase: 'ready_to_roll' } : s;
  }
}

export function raceReducer(state: RaceState, event: RaceEvent): RaceState {
  if (event.type === 'START') {
    if (event.players.length < 2 || new Set(event.players.map(p => p.id)).size !== event.players.length) return state;
    return { ...initialRaceState, actionId: state.actionId + 1, sessionId: state.sessionId + 1, turnId: 1,
      startedAt: event.startedAt ?? 0, gameMode: event.mode, gamePhase: 'ready_to_roll', players: event.players.map(player => ({ ...player,
        currentTileId: START_TILE_ID, pathHistory: [START_TILE_ID], position: 0, hasShield: false,
        cleanseCount: 0, skipNextTurn: false, currentPose: 'idle_1', rank: null })), logMessage: `Đến lượt ${event.players[0].name}.` };
  }
  if (event.type === 'PAUSE') return state.gamePhase === 'finished' || state.isPaused === event.paused ? state : { ...state, isPaused: event.paused };
  if (event.id !== state.actionId || state.isPaused || state.gamePhase === 'finished') return state;
  const next = transition(state, event);
  return next === state ? state : { ...next, actionId: state.actionId + 1 };
}
