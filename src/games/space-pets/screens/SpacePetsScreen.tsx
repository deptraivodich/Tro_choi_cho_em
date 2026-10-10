import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Circle, Path, Line, Rect, G } from 'react-native-svg';
import { GameHeader } from '../../../shared/components/GameHeader';
import { GameModal } from '../../../shared/components/GameModal';
import { colors, shadows } from '../../../shared/theme/colors';
import { soundManager } from '../../../shared/audio/audioController';
import { useGameTimer } from '../../../shared/hooks/useGameTimer';
import { profileManager } from '../../../shared/storage/profileManager';
import { GameSessionResult } from '../../../shared/types/index';

import { generateSpacePetProblem, SpacePetProblem } from '../../../shared/math/generators';

interface SpacePetData {
  hatched: boolean;
  name: string;
  petType: 'starlight' | 'nebula' | 'cosmo';
  fullnessPercent: number; // 0 to 100
  energyPercent: number; // 0 to 100
  expeditionEndTimestamp: number | null; // ms timestamp
  expeditionsCompleted: number;
}

export const SpacePetsScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [problem, setProblem] = useState<SpacePetProblem>(() => generateSpacePetProblem('easy'));

  const [pet, setPet] = useState<SpacePetData>({
    hatched: true,
    name: 'Bé Tinh Cầu Lấp Lánh',
    petType: 'starlight',
    fullnessPercent: 40,
    energyPercent: 50,
    expeditionEndTimestamp: null,
    expeditionsCompleted: 0,
  });

  const [selectedFoodPercents, setSelectedFoodPercents] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTestSpeedup, setIsTestSpeedup] = useState(false);

  // Score stats
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

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

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    const newProb = generateSpacePetProblem(newDiff);
    setProblem(newProb);
    setPet((prev) => ({
      ...prev,
      fullnessPercent: newProb.startingFullness,
      name: newProb.petName,
      petType: newProb.petType,
    }));
    setSelectedFoodPercents([]);
    setFeedback(null);
  };

  // Load saved pet from storage
  useEffect(() => {
    profileManager
      .getGameState<SpacePetData>('space-pets', 'local-learner-sandbox-01', pet)
      .then((saved) => {
        if (saved) {
          if (saved.expeditionEndTimestamp && Date.now() >= saved.expeditionEndTimestamp) {
            saved.expeditionEndTimestamp = null;
            saved.expeditionsCompleted += 1;
            saved.energyPercent = Math.min(100, saved.energyPercent + 30);
          }
          setPet(saved);
        }
      });
  }, []);

  const savePet = async (updated: SpacePetData) => {
    setPet(updated);
    await profileManager.setGameState('space-pets', 'local-learner-sandbox-01', updated);
  };

  const toggleFoodPortion = (percent: number) => {
    soundManager.playTap();
    setFeedback(null);
    setSelectedFoodPercents((prev) => [...prev, percent]);
  };

  const clearFoodSelection = () => {
    soundManager.playTap();
    setSelectedFoodPercents([]);
    setFeedback(null);
  };

  const handleFeed = () => {
    if (selectedFoodPercents.length === 0) {
      setFeedback('Em hãy chọn các phần thức ăn % bên dưới để cho thú cưng ăn nhé!');
      return;
    }

    const addedTotal = selectedFoodPercents.reduce((a, b) => a + b, 0);
    const newFullness = pet.fullnessPercent + addedTotal;

    if (newFullness === 100) {
      soundManager.playCorrect();
      setIsSuccess(true);
      setFeedback(
        `🎉 Tuyệt vời! Độ no ${pet.fullnessPercent}% + ${addedTotal}% = 100%. Bé ${pet.name} đã no căng bụng và rất hạnh phúc!`
      );
      setScore((s) => s + 40);
      setCorrectCount((c) => c + 1);

      const updated = {
        ...pet,
        fullnessPercent: 100,
        energyPercent: Math.min(100, pet.energyPercent + 20),
      };
      savePet(updated);
      setSelectedFoodPercents([]);

      // Prepare next feeding problem after brief delay
      safeTimeout(() => {
        const nextProb = generateSpacePetProblem(difficulty);
        setProblem(nextProb);
        setPet((prev) => ({
          ...prev,
          fullnessPercent: nextProb.startingFullness,
        }));
      }, 2500);
    } else if (newFullness > 100) {
      soundManager.playIncorrect();
      setIsSuccess(false);
      setIncorrectCount((c) => c + 1);
      setFeedback(
        `Độ no sẽ đạt ${newFullness}%, vượt quá 100% rồi! Thú cưng sẽ bị no quá mức. Em hãy bấm "Chọn lại" để phối phần ăn vừa tròn 100% nhé!`
      );
    } else {
      soundManager.playTap();
      setIsSuccess(true);
      setFeedback(
        `Đã cho ăn thêm ${addedTotal}%, độ no đạt ${newFullness}%. Bé cần thêm ${100 - newFullness}% nữa để đạt 100% no tròn!`
      );
      setScore((s) => s + 15);
      const updated = { ...pet, fullnessPercent: newFullness };
      savePet(updated);
      setSelectedFoodPercents([]);
    }
  };

  const handleStartExpedition = () => {
    if (pet.energyPercent < 30) {
      setFeedback('Bé đang thiếu năng lượng! Hãy chăm sóc cho bé no để hồi năng lượng trước khi bay.');
      return;
    }

    soundManager.playVictory();
    // 5 minutes in normal mode, or 10 seconds in test speedup mode
    const durationMs = isTestSpeedup ? 10 * 1000 : 5 * 60 * 1000;
    const end = Date.now() + durationMs;

    const updated: SpacePetData = {
      ...pet,
      energyPercent: pet.energyPercent - 30,
      expeditionEndTimestamp: end,
    };
    savePet(updated);
    setScore((s) => s + 50);
    setFeedback(
      `🚀 Bé đã khởi hành thám hiểm dải ngân hà! Chuyến đi sẽ hoàn tất sau ${isTestSpeedup ? '10 giây' : '5 phút'}. Em có thể tắt app hoặc quay lại sảnh.`
    );
  };

  const handleCheckExpedition = () => {
    if (!pet.expeditionEndTimestamp) return;

    if (Date.now() >= pet.expeditionEndTimestamp) {
      soundManager.playVictory();
      const updated: SpacePetData = {
        ...pet,
        expeditionEndTimestamp: null,
        expeditionsCompleted: pet.expeditionsCompleted + 1,
        fullnessPercent: Math.max(20, pet.fullnessPercent - 20),
      };
      savePet(updated);
      setFeedback('🌟 Chúc mừng! Bé đã hoàn thành chuyến thám hiểm và mang về rất nhiều tinh thạch vũ trụ!');
    } else {
      const remainingSec = Math.ceil((pet.expeditionEndTimestamp - Date.now()) / 1000);
      setFeedback(`Bé đang bay giữa các vì sao! Còn khoảng ${remainingSec} giây nữa là trở về.`);
    }
  };

  const finishGame = async () => {
    pause();
    soundManager.playVictory();
    const result: GameSessionResult = {
      sessionId: `sp-${Date.now()}`,
      gameId: 'space-pets' as any,
      profileId: 'local-learner-sandbox-01',
      difficulty: 'easy',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon: pet.fullnessPercent === 100,
      score,
      maxScore: 200,
      correctCount,
      incorrectCount,
      skillsPracticed: ['Tỉ số phần trăm %', 'Cộng trừ phần trăm', 'Ước lượng tỷ lệ'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    setModalType('result');
  };

  const deficit = 100 - pet.fullnessPercent;
  const currentAddingTotal = selectedFoodPercents.reduce((a, b) => a + b, 0);

  return (
    <View style={styles.container}>
      <GameHeader
        title="Trại Nuôi Thú Cưng Không Gian"
        topicBadge="Tỉ số phần trăm (%)"
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
            <Text style={styles.statPillText}>⭐ {score} đ</Text>
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

        {/* Pet Sanctuary Canvas */}
        <View style={styles.petCanvas}>
          <Svg width="100%" height={160} viewBox="0 0 340 160">
            {/* Cosmic background glow */}
            <Rect x="0" y="0" width="340" height="160" fill="#2E1065" />
            <Circle cx="170" cy="80" r="65" fill="#3B0764" />

            {/* Cute alien space pet */}
            <G transform="translate(130, 30)">
              {/* Pet Body */}
              <Path
                d="M40 15 C20 15 12 35 12 55 C12 75 24 85 40 85 C56 85 68 75 68 55 C68 35 60 15 40 15 Z"
                fill="#F472B6"
              />
              {/* Antenna */}
              <Line x1="40" y1="15" x2="40" y2="5" stroke="#F472B6" strokeWidth="3" />
              <Circle cx="40" cy="5" r="4" fill="#FBBF24" />
              {/* Eyes */}
              <Circle cx="30" cy="45" r="5" fill="#FFFFFF" />
              <Circle cx="31" cy="45" r="2.5" fill="#1E1B4B" />
              <Circle cx="50" cy="45" r="5" fill="#FFFFFF" />
              <Circle cx="49" cy="45" r="2.5" fill="#1E1B4B" />
              {/* Cheerful blush */}
              <Circle cx="24" cy="55" r="4" fill="#FB7185" opacity="0.6" />
              <Circle cx="56" cy="55" r="4" fill="#FB7185" opacity="0.6" />
              {/* Happy smile */}
              <Path d="M34 58 Q 40 64 46 58" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </G>
          </Svg>

          <View style={styles.petNameTag}>
            <Text style={styles.petNameText}>✨ {pet.name}</Text>
          </View>
        </View>

        {/* Status Bars: Độ no & Năng lượng */}
        <View style={styles.statusBox}>
          {/* Fullness Bar */}
          <View style={styles.statusRow}>
            <View style={styles.statusLabelRow}>
              <Text style={styles.statusLabel}>🍎 Độ no hiện tại:</Text>
              <Text style={[styles.statusValue, { color: colors.emeraldDark }]}>
                {pet.fullnessPercent}% (Cần thêm: {deficit}%)
              </Text>
            </View>
            <View style={styles.statusBarTrack}>
              <View
                style={[
                  styles.statusBarFill,
                  { width: `${pet.fullnessPercent}%`, backgroundColor: colors.emerald },
                ]}
              />
            </View>
          </View>

          {/* Energy Bar */}
          <View style={styles.statusRow}>
            <View style={styles.statusLabelRow}>
              <Text style={styles.statusLabel}>⚡ Năng lượng:</Text>
              <Text style={[styles.statusValue, { color: colors.amberDark }]}>
                {pet.energyPercent}%
              </Text>
            </View>
            <View style={styles.statusBarTrack}>
              <View
                style={[
                  styles.statusBarFill,
                  { width: `${pet.energyPercent}%`, backgroundColor: colors.amber },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Feedback Alert */}
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

        {/* Food Portion Combination Matrix */}
        <View style={styles.feedingCard}>
          <Text style={styles.feedTitle}>
            Chọn khẩu phần dinh dưỡng (Mục tiêu: đúng {deficit}%):
          </Text>

          {selectedFoodPercents.length > 0 && (
            <View style={styles.selectedRow}>
              <Text style={styles.selectedLabel}>Đang chọn ghép:</Text>
              <Text style={styles.selectedValue}>
                {selectedFoodPercents.join('% + ')}% = {currentAddingTotal}%
              </Text>
              <TouchableOpacity onPress={clearFoodSelection} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Chọn lại</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.portionsGrid}>
            {problem.availableRations.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.portionBtn}
                onPress={() => toggleFoodPortion(r.percent)}
                activeOpacity={0.7}
              >
                <Text style={styles.portionText}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.feedExecuteBtn} onPress={handleFeed}>
            <Text style={styles.feedExecuteBtnText}>🍽️ CHO THÚ CƯNG ĂN NGAY</Text>
          </TouchableOpacity>
        </View>

        {/* Space Expedition Card */}
        <View style={styles.expeditionCard}>
          <View style={styles.expeditionHeader}>
            <Text style={styles.expeditionTitle}>🛸 Thám hiểm Ngân Hà</Text>
            <Text style={styles.expeditionCount}>
              Đã bay: {pet.expeditionsCompleted} chuyến
            </Text>
          </View>

          {pet.expeditionEndTimestamp ? (
            <TouchableOpacity
              style={styles.expeditionActiveBtn}
              onPress={handleCheckExpedition}
            >
              <Text style={styles.expeditionActiveBtnText}>
                🛰️ Kiểm tra tiến độ bay (Bấm để cập nhật)
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.expeditionStartBtn}
              onPress={handleStartExpedition}
            >
              <Text style={styles.expeditionStartBtnText}>
                🚀 Cử bé đi thám hiểm ngân hà (-30% năng lượng)
              </Text>
            </TouchableOpacity>
          )}

          {/* Test Speedup Toggle (development mode) */}
          <TouchableOpacity
            style={styles.speedupToggle}
            onPress={() => setIsTestSpeedup(!isTestSpeedup)}
          >
            <Text style={styles.speedupToggleText}>
              ⚡ Chế độ thử nghiệm tốc hành: {isTestSpeedup ? 'BẬT (10s)' : 'TẮT (5p)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Complete Session Button */}
        <TouchableOpacity style={styles.finishBtn} onPress={finishGame}>
          <Text style={styles.finishBtnText}>🌟 TỔNG KẾT PHIÊN CHĂM SÓC</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Trại Thú Cưng Không Gian"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          const fresh: SpacePetData = {
            hatched: true,
            name: 'Bé Tinh Cầu Lấp Lánh',
            petType: 'starlight',
            fullnessPercent: 40,
            energyPercent: 50,
            expeditionEndTimestamp: null,
            expeditionsCompleted: 0,
          };
          savePet(fresh);
          setSelectedFoodPercents([]);
          setScore(0);
          setCorrectCount(0);
          setIncorrectCount(0);
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
              🛸 **Mục tiêu**: Chăm sóc bé thú cưng ngoài hành tinh đạt 100% độ no và năng lượng!
            </Text>
            <Text style={styles.tutText}>
              🍎 **Tỉ số phần trăm %**: Nếu bé đang có 40% độ no, bé cần thêm 60% (100% - 40% = 60%).
            </Text>
            <Text style={styles.tutText}>
              🧩 **Ghép khẩu phần**: Chọn các phần ăn (ví dụ 20% + 40% = 60%) rồi bấm Cho ăn. Nếu vượt 100%, bé sẽ nhắc em điều chỉnh mà không bị phạt.
            </Text>
            <Text style={styles.tutText}>
              🚀 **Thám hiểm**: Đi thám hiểm vũ trụ tự động lưu thời gian, em quay lại bất cứ lúc nào để nhận quà!
            </Text>
          </View>
        }
        resultData={{
          isWon: pet.fullnessPercent === 100,
          score,
          maxScore: 200,
          playtimeSeconds: elapsedSeconds,
          correctCount,
          incorrectCount,
          skillsPracticed: ['Tỉ số phần trăm %', 'Cộng tỷ lệ phần trăm', 'Chăm sóc thú cưng'],
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
    backgroundColor: colors.violet,
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
  petCanvas: {
    backgroundColor: '#2E1065',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  petNameTag: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  petNameText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  statusBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
    ...shadows.sm,
  },
  statusRow: {
    marginVertical: 4,
  },
  statusLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 4,
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
  feedingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
    ...shadows.sm,
  },
  feedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySubtle,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  selectedValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  clearBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  portionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  portionBtn: {
    flex: 1,
    minWidth: 48,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    borderRadius: 10,
    alignItems: 'center',
  },
  portionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  feedExecuteBtn: {
    backgroundColor: colors.emerald,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  feedExecuteBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  expeditionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
  },
  expeditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expeditionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  expeditionCount: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  expeditionStartBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  expeditionStartBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  expeditionActiveBtn: {
    backgroundColor: colors.amber,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  expeditionActiveBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  speedupToggle: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  speedupToggleText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  finishBtn: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 8,
    ...shadows.md,
  },
  finishBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  tutText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
});
