import { useState, useRef, useEffect, useCallback } from 'react';
import { GameMode, Player, GamePhase, PendingPenalty, CharacterPose } from './types';
import { rollDice, calculateStepsFromDice, evaluateLandingTile, applyPenaltyDirectly } from './gameEngine';
import { soundManager } from '../../core/audioController';
import { profileManager } from '../../storage/profileManager';
import { GameSessionResult } from '../../types';

export function useRaceGame() {
  const [gameMode, setGameMode] = useState<GameMode>('single');
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [currentDiceValue, setCurrentDiceValue] = useState<number>(3);
  const [pendingPenalty, setPendingPenalty] = useState<PendingPenalty | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [logMessage, setLogMessage] = useState<string>('Chào mừng em đến với Đua Về Đích! Hãy chuẩn bị bắt đầu.');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const isExitingRef = useRef(false);
  const activeTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sessionStartTime = useRef<number>(Date.now());

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (isMountedRef.current && !isExitingRef.current) {
        fn();
      }
      activeTimeouts.current = activeTimeouts.current.filter((t) => t !== id);
    }, ms);
    activeTimeouts.current.push(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    activeTimeouts.current.forEach(clearTimeout);
    activeTimeouts.current = [];
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Start new game
  const startGame = useCallback((mode: GameMode, initialPlayers: Player[]) => {
    clearAllTimers();
    setGameMode(mode);
    setPlayers(initialPlayers);
    setActivePlayerIndex(0);
    setCurrentDiceValue(3);
    setPendingPenalty(null);
    setWinner(null);
    setIsPaused(false);
    sessionStartTime.current = Date.now();

    const firstPlayer = initialPlayers[0];
    setLogMessage(`Cuộc đua bắt đầu! Đến lượt của ${firstPlayer.name}.`);
    setGamePhase('ready_to_roll');
  }, [clearAllTimers]);

  // Advance to next turn
  const advanceTurn = useCallback((updatedPlayers: Player[], nextIdx: number) => {
    if (!isMountedRef.current || isExitingRef.current) return;

    // Check if next player is marked for skip turn
    const nextP = updatedPlayers[nextIdx];
    if (nextP.skipNextTurn) {
      soundManager.playIncorrect();
      const clearedPlayers = updatedPlayers.map((p, i) =>
        i === nextIdx ? { ...p, skipNextTurn: false } : p
      );
      setPlayers(clearedPlayers);
      setLogMessage(`⏳ ${nextP.name} bị mất lượt này do hiệu ứng Đồng Hồ Cát!`);

      // Advance again to next player after brief pause
      safeTimeout(() => {
        const afterNextIdx = (nextIdx + 1) % clearedPlayers.length;
        advanceTurn(clearedPlayers, afterNextIdx);
      }, 1200);
      return;
    }

    setActivePlayerIndex(nextIdx);
    setPlayers(updatedPlayers);

    // If local multiplayer and next player is human: show handover modal
    if (gameMode === 'local_multiplayer' && !nextP.isBot) {
      setGamePhase('turn_handover');
      setLogMessage(`Đến lượt của ${nextP.name}. Hãy trao máy cho ${nextP.name}!`);
    } else {
      setGamePhase('ready_to_roll');
      setLogMessage(`Đến lượt của ${nextP.name}.`);
    }
  }, [gameMode, safeTimeout]);

  // Finish game session
  const handleVictory = useCallback(async (winningPlayer: Player, finalPlayers: Player[]) => {
    setWinner(winningPlayer);
    setGamePhase('finished');
    soundManager.playVictory();
    setLogMessage(`🏆 ${winningPlayer.name} ĐÃ CÁN ĐÍCH Ô 21 VÀ GIÀNH CHIẾN THẮNG!`);

    // Save session result to profile manager
    const playtimeSeconds = Math.max(1, Math.round((Date.now() - sessionStartTime.current) / 1000));
    const result: GameSessionResult = {
      sessionId: `rtf-${Date.now()}`,
      gameId: 'race-to-finish',
      profileId: 'local-learner-sandbox-01',
      difficulty: 'easy',
      startedAt: new Date(sessionStartTime.current).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: playtimeSeconds,
      isWon: !winningPlayer.isBot,
      score: 100,
      maxScore: 100,
      correctCount: winningPlayer.position,
      incorrectCount: 0,
      skillsPracticed: ['Nhận biết chẵn/lẻ', 'Đếm bước tiến lùi', 'Chiến thuật xúc xắc'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
  }, []);

  // Step-by-step movement animation
  const animateSteps = useCallback((
    playerIdx: number,
    startPos: number,
    targetPos: number,
    onComplete: (landedPos: number) => void
  ) => {
    let currentStepPos = startPos;
    const isForward = targetPos >= startPos;
    const totalSteps = Math.abs(targetPos - startPos);

    if (totalSteps === 0) {
      onComplete(startPos);
      return;
    }

    let stepCount = 0;
    const stepInterval = () => {
      if (!isMountedRef.current || isExitingRef.current) return;
      stepCount++;
      currentStepPos = isForward ? currentStepPos + 1 : currentStepPos - 1;
      currentStepPos = Math.max(0, Math.min(21, currentStepPos));

      soundManager.playTap();

      // Alternate walk pose
      const walkPose = stepCount % 2 === 1 ? 'walk_1' : 'walk_2';
      setPlayers((prev) =>
        prev.map((p, i) =>
          i === playerIdx ? { ...p, position: currentStepPos, currentPose: walkPose } : p
        )
      );

      if (stepCount < totalSteps && currentStepPos < 21) {
        safeTimeout(stepInterval, 250);
      } else {
        // Finished steps: reset to idle
        setPlayers((prev) =>
          prev.map((p, i) =>
            i === playerIdx ? { ...p, currentPose: 'idle_1' } : p
          )
        );
        safeTimeout(() => onComplete(currentStepPos), 150);
      }
    };

    safeTimeout(stepInterval, 250);
  }, [safeTimeout]);

  // Roll dice action
  const handleRollDice = useCallback(() => {
    if (gamePhase !== 'ready_to_roll' || isPaused) return;

    setGamePhase('rolling');
    soundManager.playTap();

    const rolledValue = rollDice();
    setCurrentDiceValue(rolledValue);

    // 0.7s roll animation
    safeTimeout(() => {
      const activeP = players[activePlayerIndex];
      const steps = calculateStepsFromDice(rolledValue);
      const isOdd = rolledValue % 2 !== 0;

      setLogMessage(
        `🎲 ${activeP.name} đổ ra ${rolledValue} (${isOdd ? 'Số Lẻ' : 'Số Chẵn'}) ➔ Tiến ${steps} ô!`
      );
      setGamePhase('moving');

      const targetPos = Math.min(21, activeP.position + steps);

      // Animate tile-by-tile
      animateSteps(activePlayerIndex, activeP.position, targetPos, (landedPos) => {
        setGamePhase('evaluating_tile');

        const tileRes = evaluateLandingTile(activeP, activePlayerIndex, landedPos);

        // Check if won
        if (tileRes.effectType === 'win' || tileRes.nextPosition >= 21) {
          const finalPlayers: Player[] = players.map((p, i) =>
            i === activePlayerIndex ? { ...p, position: 21, currentPose: 'victory' as CharacterPose } : p
          );
          setPlayers(finalPlayers);
          handleVictory(finalPlayers[activePlayerIndex], finalPlayers);
          return;
        }

        // Check if Cleanse Choice modal is required (human holding star facing penalty)
        if (tileRes.needsCleanseChoice && tileRes.pendingPenalty) {
          setPendingPenalty(tileRes.pendingPenalty);
          setGamePhase('awaiting_cleanse_choice');
          setLogMessage(tileRes.logMessage);
          return;
        }

        // Apply resolution
        setLogMessage(tileRes.logMessage);
        if (tileRes.effectType === 'penalty_applied') {
          soundManager.playIncorrect();
        } else if (tileRes.effectType === 'bonus' || tileRes.effectType === 'item_received') {
          soundManager.playCorrect();
        }

        // If tile caused additional displacement (bonus +1/+2 or penalty retreat or portal reset)
        if (tileRes.nextPosition !== landedPos) {
          setGamePhase('applying_effect');
          const isPenalty = tileRes.nextPosition < landedPos;
          const pose: CharacterPose = isPenalty ? 'penalty' : 'walk_1';

          setPlayers((prev) =>
            prev.map((p, i) =>
              i === activePlayerIndex
                ? {
                    ...p,
                    hasShield: tileRes.hasShield,
                    cleanseCount: tileRes.cleanseCount,
                    skipNextTurn: tileRes.skipNextTurn,
                    currentPose: pose,
                  }
                : p
            )
          );

          // Animate secondary move
          safeTimeout(() => {
            animateSteps(activePlayerIndex, landedPos, tileRes.nextPosition, (finalPos) => {
              const updatedPlayers: Player[] = players.map((p, i) =>
                i === activePlayerIndex
                  ? {
                      ...p,
                      position: finalPos,
                      hasShield: tileRes.hasShield,
                      cleanseCount: tileRes.cleanseCount,
                      skipNextTurn: tileRes.skipNextTurn,
                      currentPose: 'idle_1' as CharacterPose,
                    }
                  : p
              );

              // Check if secondary move reached 21
              if (finalPos >= 21) {
                handleVictory(updatedPlayers[activePlayerIndex], updatedPlayers);
                return;
              }

              // Advance turn
              safeTimeout(() => {
                const nextIdx = (activePlayerIndex + 1) % updatedPlayers.length;
                advanceTurn(updatedPlayers, nextIdx);
              }, 800);
            });
          }, 400);
        } else {
          // Normal landing
          const updatedPlayers: Player[] = players.map((p, i) =>
            i === activePlayerIndex
              ? {
                  ...p,
                  position: tileRes.nextPosition,
                  hasShield: tileRes.hasShield,
                  cleanseCount: tileRes.cleanseCount,
                  skipNextTurn: tileRes.skipNextTurn,
                  currentPose: 'idle_1' as CharacterPose,
                }
              : p
          );
          setPlayers(updatedPlayers);

          safeTimeout(() => {
            const nextIdx = (activePlayerIndex + 1) % updatedPlayers.length;
            advanceTurn(updatedPlayers, nextIdx);
          }, 800);
        }
      });
    }, 700);
  }, [
    gamePhase,
    isPaused,
    players,
    activePlayerIndex,
    safeTimeout,
    animateSteps,
    handleVictory,
    advanceTurn,
  ]);

  // Cleanse Star Choices
  const handleUseCleanse = useCallback(() => {
    if (!pendingPenalty) return;
    soundManager.playCorrect();

    const activeP = players[activePlayerIndex];
    const updatedPlayers = players.map((p, i) =>
      i === activePlayerIndex
        ? { ...p, cleanseCount: 0 } // consumed
        : p
    );
    setPlayers(updatedPlayers);
    setPendingPenalty(null);
    setLogMessage(`✨ ${activeP.name} đã dùng Ngôi Sao Giải Bất Lợi để hủy bỏ ${pendingPenalty.penaltyName}!`);

    safeTimeout(() => {
      const nextIdx = (activePlayerIndex + 1) % updatedPlayers.length;
      advanceTurn(updatedPlayers, nextIdx);
    }, 800);
  }, [pendingPenalty, players, activePlayerIndex, safeTimeout, advanceTurn]);

  const handleKeepCleanse = useCallback(() => {
    if (!pendingPenalty) return;
    soundManager.playIncorrect();

    const activeP = players[activePlayerIndex];
    const penRes = applyPenaltyDirectly(activeP, pendingPenalty.tileIndex, pendingPenalty.type);

    setPendingPenalty(null);
    setLogMessage(penRes.logMessage);

    if (penRes.nextPosition !== activeP.position) {
      setGamePhase('applying_effect');
      safeTimeout(() => {
        animateSteps(activePlayerIndex, activeP.position, penRes.nextPosition, (finalPos) => {
          const updatedPlayers: Player[] = players.map((p, i) =>
            i === activePlayerIndex
              ? {
                  ...p,
                  position: finalPos,
                  skipNextTurn: penRes.skipNextTurn,
                  currentPose: 'idle_1' as CharacterPose,
                }
              : p
          );
          setPlayers(updatedPlayers);
          safeTimeout(() => {
            const nextIdx = (activePlayerIndex + 1) % updatedPlayers.length;
            advanceTurn(updatedPlayers, nextIdx);
          }, 800);
        });
      }, 300);
    } else {
      const updatedPlayers: Player[] = players.map((p, i) =>
        i === activePlayerIndex ? { ...p, skipNextTurn: penRes.skipNextTurn } : p
      );
      setPlayers(updatedPlayers);
      safeTimeout(() => {
        const nextIdx = (activePlayerIndex + 1) % updatedPlayers.length;
        advanceTurn(updatedPlayers, nextIdx);
      }, 800);
    }
  }, [pendingPenalty, players, activePlayerIndex, safeTimeout, animateSteps, advanceTurn]);

  // Bot auto-play trigger
  useEffect(() => {
    if (gamePhase === 'ready_to_roll' && !isPaused && winner === null) {
      const activeP = players[activePlayerIndex];
      if (activeP && activeP.isBot) {
        // Wait 0.8s so human viewer can follow turn progress comfortably
        const timer = safeTimeout(() => {
          handleRollDice();
        }, 850);
        return () => clearTimeout(timer);
      }
    }
  }, [gamePhase, isPaused, winner, activePlayerIndex, players, safeTimeout, handleRollDice]);

  // Handover confirmation
  const handleHandoverReady = useCallback(() => {
    setGamePhase('ready_to_roll');
  }, []);

  // Safe Exit
  const exitGame = useCallback((onExitCb: () => void) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    clearAllTimers();
    setIsPaused(true);
    onExitCb();
  }, [clearAllTimers]);

  return {
    gameMode,
    players,
    activePlayerIndex,
    gamePhase,
    currentDiceValue,
    pendingPenalty,
    winner,
    logMessage,
    isPaused,
    setIsPaused,
    startGame,
    handleRollDice,
    handleUseCleanse,
    handleKeepCleanse,
    handleHandoverReady,
    exitGame,
  };
}
