import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Circle, Rect, Line } from 'react-native-svg';
import { GameHeader } from '../../components/GameHeader';
import { GameModal } from '../../components/GameModal';
import { colors, shadows } from '../../theme/colors';
import { soundManager } from '../../core/audioController';
import { useGameTimer } from '../../core/game-loop/useGameTimer';
import { generateVaultCode, VaultCodeProblem } from '../../core/math/generators';
import { parseDecimal, decimalToNumber } from '../../core/math/decimal';
import { profileManager } from '../../storage/profileManager';
import { GameSessionResult } from '../../types';

interface GuessRecord {
  input: string;
  feedback: string;
  isHigher: boolean;
}

export const VaultCodeScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Today's date string for stable daily seed
  const todayStr = new Date().toISOString().split('T')[0];
  const [currentCodeNumber, setCurrentCodeNumber] = useState(1); // 1, 2, or 3 for daily codes
  const [problem, setProblem] = useState<VaultCodeProblem>(() =>
    generateVaultCode(`${todayStr}-${currentCodeNumber}`, 'medium')
  );

  const [inputVal, setInputVal] = useState('');
  const [remainingGuesses, setRemainingGuesses] = useState(5);
  const [guessHistory, setGuessHistory] = useState<GuessRecord[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    const newProb = generateVaultCode(
      isPracticeMode ? undefined : `${todayStr}-${currentCodeNumber}`,
      newDiff
    );
    setProblem(newProb);
    setInputVal('');
    setRemainingGuesses(5);
    setGuessHistory([]);
    setIsUnlocked(false);
    setFeedback(null);
  };

  // Stats
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  const { elapsedSeconds, isPaused, pause, resume, reset } = useGameTimer({
    initialSeconds: 0,
    autoStart: true,
  });

  const isExitingRef = useRef(false);

  const handleScreenExit = () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    pause();
    onExit();
  };

  // Daily seed persistence check
  useEffect(() => {
    profileManager
      .getGameState<{
        date: string;
        codeIndex: number;
        remaining: number;
        history: GuessRecord[];
        isDone: boolean;
      }>('vault-code', 'local-learner-sandbox-01', {
        date: todayStr,
        codeIndex: 1,
        remaining: 5,
        history: [],
        isDone: false,
      })
      .then((saved) => {
        if (saved && saved.date === todayStr && !isPracticeMode) {
          setCurrentCodeNumber(saved.codeIndex);
          setRemainingGuesses(saved.remaining);
          setGuessHistory(saved.history || []);
          setIsUnlocked(saved.isDone);
          setProblem(generateVaultCode(`${todayStr}-${saved.codeIndex}`));
        }
      });
  }, [todayStr, isPracticeMode]);

  const handleKeyPress = (char: string) => {
    soundManager.playTap();
    if (char === 'DEL') {
      setInputVal((prev) => prev.slice(0, -1));
      return;
    }
    if (char === '.' || char === ',') {
      if (inputVal.includes('.') || inputVal.includes(',')) return;
    }
    if (inputVal.length >= 6) return; // max ##.##
    setInputVal((prev) => prev + char);
  };

  const handleCheckGuess = () => {
    if (!inputVal.trim()) {
      setFeedback('Em hãy nhập số dự đoán bằng bàn phím số bên dưới nhé!');
      return;
    }

    const parsedInput = parseDecimal(inputVal);
    const parsedTarget = parseDecimal(problem.code);

    if (!parsedInput || !parsedTarget) {
      setFeedback('Định dạng chưa đúng. Mật mã cần có dạng số thập phân ##.##!');
      return;
    }

    const inVal = decimalToNumber(parsedInput);
    const targetVal = decimalToNumber(parsedTarget);

    const newRemaining = remainingGuesses - 1;
    setRemainingGuesses(newRemaining);

    if (Math.abs(inVal - targetVal) < 0.001) {
      // Correct!
      soundManager.playVictory();
      setIsUnlocked(true);
      setFeedback(`🎉 CHÍNH XÁC! Cửa hầm bí mật đã mở! Mật mã là ${problem.code}.`);
      setScore((s) => s + 100);
      setCorrectCount((c) => c + 1);

      const record: GuessRecord = {
        input: inputVal,
        feedback: '✅ Mở khóa thành công!',
        isHigher: false,
      };
      const updatedHistory = [...guessHistory, record];
      setGuessHistory(updatedHistory);

      saveState(currentCodeNumber, newRemaining, updatedHistory, true);
    } else {
      soundManager.playIncorrect();
      setIncorrectCount((c) => c + 1);
      const isHigher = inVal < targetVal;
      const hintText = isHigher
        ? '🔺 Mật mã thực tế LỚN HƠN số này!'
        : '🔻 Mật mã thực tế NHỎ HƠN số này!';

      setFeedback(hintText);

      const record: GuessRecord = {
        input: inputVal,
        feedback: hintText,
        isHigher,
      };
      const updatedHistory = [...guessHistory, record];
      setGuessHistory(updatedHistory);

      if (newRemaining <= 0) {
        // Out of guesses
        setFeedback(`Hết lượt đoán rồi! Mật mã của cửa hầm hôm nay là: ${problem.code}.`);
        saveState(currentCodeNumber, 0, updatedHistory, false);
      } else {
        saveState(currentCodeNumber, newRemaining, updatedHistory, false);
      }
    }

    setInputVal('');
  };

  const saveState = async (
    codeIndex: number,
    rem: number,
    history: GuessRecord[],
    done: boolean
  ) => {
    if (!isPracticeMode) {
      await profileManager.setGameState('vault-code', 'local-learner-sandbox-01', {
        date: todayStr,
        codeIndex,
        remaining: rem,
        history,
        isDone: done,
      });
    }
  };

  const handleNextCode = () => {
    soundManager.playTap();
    if (currentCodeNumber < 3) {
      const nextCode = currentCodeNumber + 1;
      setCurrentCodeNumber(nextCode);
      setProblem(generateVaultCode(`${todayStr}-${nextCode}`));
      setRemainingGuesses(5);
      setGuessHistory([]);
      setIsUnlocked(false);
      setFeedback(null);
      saveState(nextCode, 5, [], false);
    } else {
      finishGame();
    }
  };

  const startPractice = () => {
    soundManager.playTap();
    setIsPracticeMode(true);
    setProblem(generateVaultCode());
    setRemainingGuesses(5);
    setGuessHistory([]);
    setIsUnlocked(false);
    setFeedback('Đã kích hoạt chế độ Luyện Tập Tự Do (không giới hạn lượt ngày).');
  };

  const finishGame = async () => {
    pause();
    soundManager.playVictory();
    const result: GameSessionResult = {
      sessionId: `vc-${Date.now()}`,
      gameId: 'vault-code',
      profileId: 'local-learner-sandbox-01',
      difficulty: 'hard',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon: isUnlocked,
      score,
      maxScore: 300,
      correctCount,
      incorrectCount,
      skillsPracticed: ['Giá trị hàng chữ số', 'Số thập phân ##.##', 'Dấu hiệu chia hết'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    setModalType('result');
  };

  return (
    <View style={styles.container}>
      <GameHeader
        title="Mật Mã Cửa Hầm"
        topicBadge="Giá trị hàng & Số thập phân"
        onPause={() => {
          pause();
          setModalType('pause');
        }}
        onHelp={() => {
          pause();
          setModalType('tutorial');
        }}
        onExit={handleScreenExit}
        extraStats={
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>
              {isPracticeMode ? '🎯 Tự luyện' : `🔐 Mã ${currentCodeNumber}/3`}
            </Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Difficulty Selector */}
        <View style={styles.diffSelectorRow}>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.diffBtn, difficulty === d && styles.diffBtnActive]}
              onPress={() => handleDifficultyChange(d)}
            >
              <Text
                style={[
                  styles.diffBtnText,
                  difficulty === d && styles.diffBtnTextActive,
                ]}
              >
                {d === 'easy' ? 'Khởi động' : d === 'medium' ? 'Rèn luyện' : 'Thử thách'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Vault Lock Visualizer */}
        <View style={styles.vaultVisual}>
          <Svg width="100%" height={140} viewBox="0 0 340 140">
            {/* Metal vault background */}
            <Rect x="20" y="10" width="300" height="120" rx="16" fill="#1E293B" />
            <Rect x="25" y="15" width="290" height="110" rx="12" fill="#334155" />

            {/* Circular Tumbler */}
            <Circle cx="170" cy="70" r="42" fill="#475569" stroke="#64748B" strokeWidth="3" />
            <Circle cx="170" cy="70" r="32" fill={isUnlocked ? '#10B981' : '#1E293B'} />
            <Line x1="170" y1="38" x2="170" y2="102" stroke="#94A3B8" strokeWidth="2" />
            <Line x1="138" y1="70" x2="202" y2="70" stroke="#94A3B8" strokeWidth="2" />
            <Circle cx="170" cy="70" r="10" fill="#FBBF24" />

            {/* Status indicator lights */}
            <Circle cx="50" cy="35" r="5" fill={isUnlocked ? '#10B981' : '#EF4444'} />
            <Circle cx="290" cy="35" r="5" fill={isUnlocked ? '#10B981' : '#F59E0B'} />
          </Svg>

          <View style={styles.codeScreen}>
            <Text style={styles.codeScreenLabel}>MÃ SỐ HIỆN TẠI</Text>
            <Text style={styles.codeScreenDigits}>
              {isUnlocked ? problem.code : inputVal || '__ . __'}
            </Text>
          </View>
        </View>

        {/* Hints Card */}
        <View style={styles.hintsCard}>
          <View style={styles.hintsHeader}>
            <Text style={styles.hintsTitle}>🔍 Gợi ý mật mã từ hệ thống:</Text>
            <Text style={styles.guessesLeft}>
              Còn {remainingGuesses} lượt đoán
            </Text>
          </View>

          {problem.hints.map((hint, idx) => (
            <View key={idx} style={styles.hintItem}>
              <Text style={styles.hintBullet}>•</Text>
              <Text style={styles.hintText}>{hint.text}</Text>
            </View>
          ))}
        </View>

        {/* Feedback Alert */}
        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              { backgroundColor: isUnlocked ? colors.successBg : colors.infoBg },
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                { color: isUnlocked ? colors.emeraldDark : colors.textPrimary },
              ]}
            >
              {feedback}
            </Text>
          </View>
        )}

        {/* Guess History Log */}
        {guessHistory.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Nhật ký lượt đoán:</Text>
            {guessHistory.map((g, idx) => (
              <View key={idx} style={styles.historyRow}>
                <Text style={styles.historyNum}>#{idx + 1}: {g.input}</Text>
                <Text style={styles.historyFeedback}>{g.feedback}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Number Pad for Mobile Input */}
        {!isUnlocked && remainingGuesses > 0 && (
          <View style={styles.numpad}>
            <View style={styles.numpadRow}>
              {['1', '2', '3'].map((d) => (
                <TouchableOpacity key={d} style={styles.keyBtn} onPress={() => handleKeyPress(d)}>
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.numpadRow}>
              {['4', '5', '6'].map((d) => (
                <TouchableOpacity key={d} style={styles.keyBtn} onPress={() => handleKeyPress(d)}>
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.numpadRow}>
              {['7', '8', '9'].map((d) => (
                <TouchableOpacity key={d} style={styles.keyBtn} onPress={() => handleKeyPress(d)}>
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.numpadRow}>
              <TouchableOpacity style={styles.keyBtn} onPress={() => handleKeyPress('.')}>
                <Text style={styles.keyText}>.</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.keyBtn} onPress={() => handleKeyPress('0')}>
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.keyBtn, styles.delBtn]} onPress={() => handleKeyPress('DEL')}>
                <Text style={[styles.keyText, { color: colors.rose }]}>⌫</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCheckGuess}>
              <Text style={styles.submitBtnText}>🔓 THỬ MỞ KHÓA NGAY</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Next Code or Practice Button */}
        {(isUnlocked || remainingGuesses === 0) && (
          <View style={styles.bottomActions}>
            {!isPracticeMode && currentCodeNumber < 3 ? (
              <TouchableOpacity style={styles.nextCodeBtn} onPress={handleNextCode}>
                <Text style={styles.nextCodeBtnText}>
                  Tiếp tục giải mật mã số {currentCodeNumber + 1} ➔
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.practiceBtn} onPress={startPractice}>
                <Text style={styles.practiceBtnText}>
                  🔄 Chơi chế độ Luyện Tập Tự Do
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Mật Mã Cửa Hầm"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          setInputVal('');
          setRemainingGuesses(5);
          setGuessHistory([]);
          setIsUnlocked(false);
          setFeedback(null);
          resume();
          setModalType(null);
        }}
        onExit={handleScreenExit}
        onCloseTutorial={() => {
          resume();
          setModalType(null);
        }}
        tutorialContent={
          <View>
            <Text style={styles.tutText}>
              🔐 **Quy tắc**: Mỗi ngày có 3 cánh cửa hầm, mỗi cửa có tối đa 5 lượt đoán.
            </Text>
            <Text style={styles.tutText}>
              🔢 **Cấu trúc mật mã**: Là một số thập phân có 2 chữ số ở phần thập phân (##.##).
            </Text>
            <Text style={styles.tutText}>
              🧠 **Dấu hiệu chia hết**: Chú ý các điều kiện chia hết (cho 2, 3, 5) áp dụng cho **phần nguyên** hoặc một chữ số cụ thể.
            </Text>
            <Text style={styles.tutText}>
              📈 **Gợi ý lớn hơn / nhỏ hơn**: Sau mỗi lượt đoán, hệ thống sẽ báo số thực tế lớn hơn hay nhỏ hơn để em thu hẹp phạm vi.
            </Text>
          </View>
        }
        resultData={{
          isWon: isUnlocked,
          score,
          maxScore: 300,
          playtimeSeconds: elapsedSeconds,
          correctCount,
          incorrectCount,
          skillsPracticed: ['Giá trị hàng chữ số', 'Số thập phân ##.##', 'Dấu hiệu chia hết'],
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statPill: {
    backgroundColor: colors.primaryExtraLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  scrollContent: {
    padding: 16,
    maxWidth: 1024,
    width: '100%',
    alignSelf: 'center',
  },
  diffSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  diffBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  diffBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  diffBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  diffBtnTextActive: {
    color: colors.white,
  },
  vaultVisual: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeScreen: {
    position: 'absolute',
    bottom: 22,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    alignItems: 'center',
  },
  codeScreenLabel: {
    fontSize: 9,
    color: '#38BDF8',
    fontWeight: '700',
    letterSpacing: 1,
  },
  codeScreenDigits: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 2,
  },
  hintsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
    ...shadows.sm,
  },
  hintsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hintsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  guessesLeft: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.rose,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
  },
  hintBullet: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 6,
    lineHeight: 18,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  feedbackBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 6,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  historyNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyFeedback: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  numpad: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
    ...shadows.sm,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  keyBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
  },
  delBtn: {
    backgroundColor: colors.roseLight,
    borderColor: colors.roseDark,
  },
  keyText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    ...shadows.sm,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  bottomActions: {
    marginVertical: 8,
  },
  nextCodeBtn: {
    backgroundColor: colors.emerald,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    ...shadows.md,
  },
  nextCodeBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  practiceBtn: {
    backgroundColor: colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  practiceBtnText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  tutText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
});
