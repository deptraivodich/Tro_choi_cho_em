import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect, Circle, Path, Line, G, Polygon } from 'react-native-svg';
import { GameHeader } from '../../../shared/components/GameHeader';
import { GameModal } from '../../../shared/components/GameModal';
import { FractionView } from '../../../shared/components/FractionView';
import { colors, shadows } from '../../../shared/theme/colors';
import { soundManager } from '../../../shared/audio/audioController';
import { useGameTimer } from '../../../shared/hooks/useGameTimer';
import { profileManager } from '../../../shared/storage/profileManager';
import { GameSessionResult } from '../../../shared/types/index';

import {
  generateRhythmBakeryOrders,
  BakeryOrder,
} from '../../../shared/math/generators';

export const RhythmBakeryScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [orders, setOrders] = useState<BakeryOrder[]>(() => generateRhythmBakeryOrders('easy'));
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const currentOrder = orders[currentOrderIndex];

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    const newOrders = generateRhythmBakeryOrders(newDiff);
    setOrders(newOrders);
    setCurrentOrderIndex(0);
    setPickedSlices(0);
    setFeedback(null);
  };

  // Conveyor & Rhythm Beat State
  const [beatPulse, setBeatPulse] = useState(false);
  const [conveyorOffset, setConveyorOffset] = useState(0);
  const [pickedSlices, setPickedSlices] = useState(0);

  // Strictly Separated Scores
  const [mathScore, setMathScore] = useState(0);
  const [rhythmBonusScore, setRhythmBonusScore] = useState(0);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Slow mode toggle for young children
  const [isSlowMode, setIsSlowMode] = useState(false);

  const { elapsedSeconds, isPaused, pause, resume, reset } = useGameTimer({
    initialSeconds: 0,
    autoStart: true,
  });

  const isMountedRef = useRef(true);
  const isExitingRef = useRef(false);
  const activeTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const safeTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (isMountedRef.current) fn();
      activeTimeouts.current = activeTimeouts.current.filter((t) => t !== id);
    }, ms);
    activeTimeouts.current.push(id);
    return id;
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeTimeouts.current.forEach(clearTimeout);
      activeTimeouts.current = [];
    };
  }, []);

  const handleScreenExit = () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    pause();
    activeTimeouts.current.forEach(clearTimeout);
    activeTimeouts.current = [];
    onExit();
  };


  // Metronome beat loop (BPM = 75 or 50 in slow mode)
  useEffect(() => {
    if (isPaused || modalType !== null) return;
    const intervalMs = isSlowMode ? 1000 : 700;

    const interval = setInterval(() => {
      setBeatPulse(true);
      soundManager.playRhythmBeat(false);
      setConveyorOffset((prev) => (prev + 20) % 80);

      safeTimeout(() => setBeatPulse(false), 200);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPaused, modalType, isSlowMode]);

  const handlePickSlice = () => {
    soundManager.playTap();
    const newPicked = pickedSlices + 1;
    setPickedSlices(newPicked);

    // Rhythm accuracy bonus if tapped during beat pulse
    if (beatPulse) {
      setRhythmBonusScore((r) => r + 5);
    }
  };

  const handleResetSlices = () => {
    soundManager.playTap();
    setPickedSlices(0);
    setFeedback(null);
  };

  const handleServeOrder = () => {
    if (pickedSlices === currentOrder.requiredSlices) {
      soundManager.playCorrect();
      setIsSuccess(true);
      setMathScore((m) => m + 50);

      setFeedback(
        `🎉 Hoàn hảo! Hỗn số ${currentOrder.whole} ${currentOrder.fractionNum}/${currentOrder.fractionDen} gồm đúng ${currentOrder.requiredSlices} phần lát (${currentOrder.sliceFraction}).`
      );

      if (currentOrderIndex + 1 < orders.length) {
        safeTimeout(() => {
          setCurrentOrderIndex((i) => i + 1);
          setPickedSlices(0);
          setFeedback(null);
        }, 1800);
      } else {
        finishGame(true);
      }
    } else {
      soundManager.playIncorrect();
      setIsSuccess(false);
      setFeedback(
        `Chưa đúng số lượng. Em đã nhặt ${pickedSlices} phần. Hãy nhẩm: ${currentOrder.whole} × ${currentOrder.fractionDen} + ${currentOrder.fractionNum} = ${currentOrder.requiredSlices} phần ${currentOrder.sliceFraction}.`
      );
    }
  };

  const finishGame = async (isWon: boolean) => {
    pause();
    soundManager.playVictory();
    const totalScore = mathScore + rhythmBonusScore;
    const result: GameSessionResult = {
      sessionId: `rb-${Date.now()}`,
      gameId: 'rhythm-bakery',
      profileId: 'local-learner-sandbox-01',
      difficulty: 'medium',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon,
      score: totalScore,
      maxScore: 200,
      correctCount: mathScore > 0 ? 1 : 0,
      incorrectCount: 0,
      skillsPracticed: ['Đổi hỗn số sang phân số', 'Cộng dồn phần số', 'Nhịp điệu'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    setModalType('result');
  };

  return (
    <View style={styles.container}>
      <GameHeader
        title="Tiệm Bánh Nhịp Điệu"
        topicBadge="Hỗn số & Phân số"
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
              🍰 Điểm toán: {mathScore} | 🎵 Nhịp: +{rhythmBonusScore}
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

        {/* Conveyor Belt & Bakery Scene */}
        <View style={styles.bakeryArena}>
          <Svg width="100%" height={150} viewBox="0 0 340 150">
            {/* Bakery Kitchen background */}
            <Rect x="0" y="0" width="340" height="150" fill="#FEF3C7" />

            {/* Metronome Beat Indicator Lamp */}
            <Circle
              cx="170"
              cy="30"
              r={beatPulse ? 16 : 10}
              fill={beatPulse ? '#A855F7' : '#E2E8F0'}
            />
            {beatPulse && (
              <Circle cx="170" cy="30" r="24" stroke="#C084FC" strokeWidth="2" fill="none" />
            )}

            {/* Conveyor Belt */}
            <Rect x="20" y="80" width="300" height="24" rx="6" fill="#475569" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Circle
                key={i}
                cx={45 + i * 50 + (conveyorOffset % 50)}
                cy="92"
                r="6"
                fill="#94A3B8"
              />
            ))}

            {/* Slices on Conveyor */}
            <G transform="translate(145, 55)">
              <Polygon points="15,0 30,25 0,25" fill="#EF4444" />
              <Circle cx="15" cy="18" r="3" fill="#FDE047" />
            </G>
          </Svg>

          <View style={styles.beatTag}>
            <Text style={styles.beatTagText}>
              {beatPulse ? '🎵 BẮT NHỊP!' : '🎶 Đang canh nhịp...'}
            </Text>
          </View>
        </View>

        {/* Current Bakery Order */}
        <View style={styles.orderCard}>
          <Text style={styles.orderTitle}>
            🛎️ Đơn bánh của khách: {currentOrder.name}
          </Text>

          <View style={styles.orderRequirementRow}>
            <Text style={styles.orderLabel}>Yêu cầu:</Text>
            <View style={styles.orderFractionBox}>
              <FractionView
                whole={currentOrder.whole}
                numerator={currentOrder.fractionNum}
                denominator={currentOrder.fractionDen}
                size="md"
                color={colors.primaryDark}
              />
            </View>
            <Text style={styles.orderSubLabel}>
              (Mỗi lát bánh bằng {currentOrder.sliceFraction})
            </Text>
          </View>

          <View style={styles.pickedStatusBox}>
            <Text style={styles.pickedLabel}>Đã nhặt lên đĩa:</Text>
            <Text style={styles.pickedCount}>
              {pickedSlices} lát ({currentOrder.sliceFraction})
            </Text>
          </View>
        </View>

        {/* Feedback Banner */}
        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              { backgroundColor: isSuccess ? colors.successBg : colors.errorBg },
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                { color: isSuccess ? colors.emeraldDark : colors.error },
              ]}
            >
              {feedback}
            </Text>
          </View>
        )}

        {/* Pick Slice Button (Tap on beat) */}
        <TouchableOpacity
          style={[styles.pickBtn, beatPulse && styles.pickBtnPulsed]}
          onPress={handlePickSlice}
          activeOpacity={0.8}
        >
          <Text style={styles.pickBtnIcon}>🍓</Text>
          <Text style={styles.pickBtnText}>NHẶT 1 LÁT NGUYÊN LIỆU (+{currentOrder.sliceFraction})</Text>
          <Text style={styles.pickBtnSub}>
            Bấm đúng lúc đèn tím sáng để nhận thưởng điểm nhịp!
          </Text>
        </TouchableOpacity>

        {/* Action Controls */}
        <View style={styles.orderActions}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetSlices}>
            <Text style={styles.resetBtnText}>🔄 Xếp lại đĩa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.serveBtn} onPress={handleServeOrder}>
            <Text style={styles.serveBtnText}>🍰 TRÌNH ĐƠN BÁNH</Text>
          </TouchableOpacity>
        </View>

        {/* Slow Mode Toggle */}
        <TouchableOpacity
          style={styles.slowModeToggle}
          onPress={() => setIsSlowMode(!isSlowMode)}
        >
          <Text style={styles.slowModeText}>
            🐢 Chế độ băng chuyền chậm: {isSlowMode ? 'BẬT' : 'TẮT'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Tiệm Bánh Nhịp Điệu"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          setCurrentOrderIndex(0);
          setPickedSlices(0);
          setMathScore(0);
          setRhythmBonusScore(0);
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
              🎂 **Quy tắc làm bánh**: Đơn hàng yêu cầu một hỗn số nguyên liệu (ví dụ 2 1/2 quả dâu).
            </Text>
            <Text style={styles.tutText}>
              📐 **Đổi hỗn số sang phân số**: 2 1/2 = 2 × 2 + 1 = 5/2. Với mỗi lát là 1/2, em cần nhặt đúng 5 lát bánh!
            </Text>
            <Text style={styles.tutText}>
              🎵 **Bắt nhịp điệu**: Nhặt đúng nhịp đèn sáng sẽ được cộng thêm Điểm Nhịp. Điểm toán và điểm nhịp hoàn toàn độc lập, làm toán đúng không bao giờ bị trừ điểm vì bấm chậm!
            </Text>
          </View>
        }
        resultData={{
          isWon: true,
          score: mathScore + rhythmBonusScore,
          maxScore: 200,
          playtimeSeconds: elapsedSeconds,
          correctCount: mathScore > 0 ? 1 : 0,
          incorrectCount: 0,
          skillsPracticed: ['Đổi hỗn số sang phân số', 'Hỗn số trong đời sống', 'Cảm thụ nhịp điệu'],
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
    fontSize: 11,
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
    backgroundColor: colors.amber,
    borderColor: colors.amberDark,
  },
  diffBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  diffBtnTextActive: {
    color: colors.white,
  },
  bakeryArena: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  beatTag: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  beatTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
    ...shadows.sm,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  orderRequirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  orderLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  orderFractionBox: {
    backgroundColor: colors.primaryExtraLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderSubLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pickedStatusBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 8,
  },
  pickedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pickedCount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
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
  pickBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.md,
  },
  pickBtnPulsed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 1.02 }],
  },
  pickBtnIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  pickBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  pickBtnSub: {
    color: colors.primaryExtraLight,
    fontSize: 11,
    marginTop: 4,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  resetBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  serveBtn: {
    flex: 1,
    backgroundColor: colors.emerald,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  serveBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  slowModeToggle: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  slowModeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tutText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
});
