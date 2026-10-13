import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RaceController } from '../state/RaceController';
import { soundManager } from '../../../shared/audio/audioController';
import { profileManager } from '../../../shared/storage/profileManager';

export function useRaceGame() {
  const [controller] = useState(() => new RaceController());
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const startedAt = state.startedAt;
  const savedSession = useRef(0);
  const [saveFailure, setSaveFailure] = useState<{ sessionId: number; message: string } | null>(null);
  useEffect(() => {
    controller.connect();
    return controller.disconnect;
  }, [controller]);
  useEffect(() => {
    if (state.gamePhase === 'evaluating_answer') {
      if (state.answerCorrect) soundManager.playCorrect(); else soundManager.playIncorrect();
    } else if (state.motion) soundManager.playTap();
  }, [state.actionId, state.gamePhase, state.answerCorrect, state.motion]);
  useEffect(() => {
    if (!state.winner || savedSession.current === state.sessionId) return;
    savedSession.current = state.sessionId;
    soundManager.playVictory();
    void profileManager.saveSessionResult({
      sessionId: `rtf-${startedAt}-${state.sessionId}`, gameId: 'race-to-finish',
      profileId: 'local-learner-sandbox-01', difficulty: 'medium',
      startedAt: new Date(startedAt).toISOString(), completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: Math.max(1, Math.round(controller.getActivePlaytime() / 1000)),
      isWon: !state.winner.isBot, score: state.correctCount, maxScore: state.correctCount + state.incorrectCount,
      correctCount: state.correctCount, incorrectCount: state.incorrectCount,
      skillsPracticed: ['Toán lớp 5', 'Chiến thuật đường tắt', 'Đếm bước tiến lùi'], schemaVersion: 2,
    }).catch(() => setSaveFailure({ sessionId: state.sessionId, message: 'Chưa lưu được kết quả trên thiết bị.' }));
  }, [state.winner, state.sessionId, state.correctCount, state.incorrectCount, startedAt, controller]);
  return {
    ...state, saveError: saveFailure?.sessionId === state.sessionId ? saveFailure.message : null,
    activePlayer: state.players[state.activePlayerIndex] || null,
    setIsPaused: (paused: boolean) => controller.send({ type: 'PAUSE', paused }),
    startGame: controller.startGame, handleRollDice: () => controller.roll(state.actionId),
    handleAnswer: (answer: string) => controller.answer(answer, state.actionId),
    handleAcknowledgeAnswer: () => controller.acknowledgeAnswer(state.actionId),
    getQuestionTimeRemaining: controller.getQuestionTimeRemaining,
    getDiceTimeRemaining: controller.getDiceTimeRemaining,
    handleUseCleanse: () => controller.apply(true, state.actionId),
    onMovementComplete: (id: number) => controller.send({ type: 'MOTION_DONE', id }),
    onFeedbackDismissed: (id: number) => controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id }),
    onSpinComplete: (id: number) => controller.send({ type: 'SPIN_DONE', id }),
    confirmHandover: () => controller.send({ type: 'HANDOVER', id: state.actionId }),
  };
}
