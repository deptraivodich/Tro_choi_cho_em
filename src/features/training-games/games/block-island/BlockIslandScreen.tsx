import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect, Line, Polygon, Circle, G, Text as SvgText } from 'react-native-svg';
import { GameHeader } from '../../components/GameHeader';
import { GameModal } from '../../components/GameModal';
import { colors, shadows } from '../../theme/colors';
import { soundManager } from '../../core/audioController';
import { useGameTimer } from '../../core/game-loop/useGameTimer';
import {
  GridPoint,
  calculateGridArea,
  calculateGridPerimeter,
  shapeFormulas,
} from '../../core/math/geometry';
import { profileManager } from '../../storage/profileManager';
import { GameSessionResult } from '../../types';

import {
  generateBlockIslandQuests,
  IslandQuest,
} from '../../core/math/generators';

const GRID_SIZE = 8; // 8x8 grid

export const BlockIslandScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [quests, setQuests] = useState<IslandQuest[]>(() => generateBlockIslandQuests('easy'));
  const [currentQuestIndex, setCurrentQuestIndex] = useState(0);

  // Placed blocks on island
  const [blocks, setBlocks] = useState<GridPoint[]>([
    { x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 3, y: 4 },
    { x: 4, y: 4 },
  ]);

  const [stamina, setStamina] = useState(5);
  const [isNpcMode, setIsNpcMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Game stats
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    const newQuests = generateBlockIslandQuests(newDiff);
    setQuests(newQuests);
    setCurrentQuestIndex(0);
    setFeedback(null);
  };

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

  const quest = quests[currentQuestIndex];
  const currentArea = calculateGridArea(blocks);
  const currentPerimeter = calculateGridPerimeter(blocks);

  // Load saved island blocks
  useEffect(() => {
    profileManager
      .getGameState<GridPoint[]>('block-island', 'local-learner-sandbox-01', blocks)
      .then((saved) => {
        if (saved && Array.isArray(saved) && saved.length > 0) {
          setBlocks(saved);
        }
      });
  }, []);

  const handleCellPress = (x: number, y: number) => {
    if (isNpcMode) return;
    soundManager.playTap();
    setFeedback(null);

    const exists = blocks.some((b) => b.x === x && b.y === y);
    let updated: GridPoint[];
    if (exists) {
      // Remove block
      updated = blocks.filter((b) => !(b.x === x && b.y === y));
    } else {
      // Add block
      updated = [...blocks, { x, y }];
    }
    setBlocks(updated);
    profileManager.setGameState('block-island', 'local-learner-sandbox-01', updated);
  };

  const handleCheckQuest = () => {
    const value = quest.targetType === 'area' ? currentArea : currentPerimeter;

    if (value === quest.targetValue) {
      soundManager.playCorrect();
      setIsSuccess(true);
      setScore((s) => s + 50);
      setCorrectCount((c) => c + 1);
      setFeedback(
        `🎉 Hoàn thành xuất sắc nhiệm vụ "${quest.title}"! ${quest.targetType === 'area' ? 'Diện tích' : 'Chu vi'} đạt đúng chuẩn ${quest.targetValue}.`
      );

      if (currentQuestIndex + 1 < quests.length) {
        setTimeout(() => {
          setCurrentQuestIndex((q) => q + 1);
          setFeedback(null);
        }, 1800);
      } else {
        finishGame(true);
      }
    } else {
      soundManager.playIncorrect();
      setIsSuccess(false);
      setIncorrectCount((c) => c + 1);
      setFeedback(
        `Hiện tại ${quest.targetType === 'area' ? 'diện tích' : 'chu vi'} là ${value}, trong khi nhiệm vụ yêu cầu ${quest.targetValue}. Em hãy thêm hoặc bớt khối nhé!`
      );
    }
  };

  const handleClearAll = () => {
    soundManager.playTap();
    setBlocks([]);
    setFeedback(null);
    profileManager.setGameState('block-island', 'local-learner-sandbox-01', []);
  };

  const finishGame = async (isWon: boolean) => {
    pause();
    soundManager.playVictory();
    const result: GameSessionResult = {
      sessionId: `bi-${Date.now()}`,
      gameId: 'block-island',
      profileId: 'local-learner-sandbox-01',
      difficulty: 'medium',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon,
      score,
      maxScore: 200,
      correctCount,
      incorrectCount,
      skillsPracticed: ['Diện tích S', 'Chu vi P', 'Quy tắc chiều cao tam giác/hình thang'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    setModalType('result');
  };

  const cellSize = 34;

  return (
    <View style={styles.container}>
      <GameHeader
        title="Lãnh Chúa Đảo Khối"
        topicBadge="Diện tích & Chu vi"
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
            <Text style={styles.statPillText}>⚡ Thể lực: {stamina}/5</Text>
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

        {/* Quest Info Banner */}
        <View style={styles.questCard}>
          <View style={styles.questTop}>
            <Text style={styles.questTitle}>
              📜 Nhiệm vụ {currentQuestIndex + 1}: {quest.title}
            </Text>
            <View style={styles.targetBadge}>
              <Text style={styles.targetBadgeText}>
                Mục tiêu: {quest.targetValue} {quest.targetType === 'area' ? 'ô vuông' : 'đơn vị dài'}
              </Text>
            </View>
          </View>
          <Text style={styles.questDesc}>{quest.description}</Text>
          <Text style={styles.questFormula}>💡 {quest.formulaNote}</Text>
        </View>

        {/* Live Island Stats */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, quest.targetType === 'area' && styles.metricCardActive]}>
            <Text style={styles.metricLabel}>DIỆN TÍCH (S)</Text>
            <Text style={styles.metricValue}>{currentArea} ô²</Text>
          </View>

          <View style={[styles.metricCard, quest.targetType === 'perimeter' && styles.metricCardActive]}>
            <Text style={styles.metricLabel}>CHU VI (P)</Text>
            <Text style={styles.metricValue}>{currentPerimeter} đơn vị</Text>
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

        {/* 2D Island Grid Canvas */}
        <View style={styles.gridContainer}>
          <Svg
            width={GRID_SIZE * cellSize}
            height={GRID_SIZE * cellSize}
            viewBox={`0 0 ${GRID_SIZE * cellSize} ${GRID_SIZE * cellSize}`}
          >
            {/* Water surrounding island */}
            <Rect width={GRID_SIZE * cellSize} height={GRID_SIZE * cellSize} fill="#E0F2FE" />

            {/* Grid lines */}
            {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => (
              <React.Fragment key={i}>
                <Line
                  x1={i * cellSize}
                  y1={0}
                  x2={i * cellSize}
                  y2={GRID_SIZE * cellSize}
                  stroke="#BAE6FD"
                  strokeWidth={1}
                />
                <Line
                  x1={0}
                  y1={i * cellSize}
                  x2={GRID_SIZE * cellSize}
                  y2={i * cellSize}
                  stroke="#BAE6FD"
                  strokeWidth={1}
                />
              </React.Fragment>
            ))}

            {/* Placed blocks */}
            {blocks.map((b) => (
              <G key={`${b.x},${b.y}`}>
                <Rect
                  x={b.x * cellSize + 2}
                  y={b.y * cellSize + 2}
                  width={cellSize - 4}
                  height={cellSize - 4}
                  rx={4}
                  fill="#10B981"
                />
                <Rect
                  x={b.x * cellSize + 5}
                  y={b.y * cellSize + 5}
                  width={cellSize - 10}
                  height={cellSize - 10}
                  rx={2}
                  fill="#34D399"
                />
              </G>
            ))}
          </Svg>

          {/* Interactive touch overlay */}
          <View style={styles.touchOverlay}>
            {Array.from({ length: GRID_SIZE }).map((_, y) => (
              <View key={y} style={styles.touchRow}>
                {Array.from({ length: GRID_SIZE }).map((_, x) => (
                  <TouchableOpacity
                    key={x}
                    style={{ width: cellSize, height: cellSize }}
                    onPress={() => handleCellPress(x, y)}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.touchHint}>
          👉 Chạm vào ô trống để đặt khối đất, chạm vào khối đất để dỡ bỏ.
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
            <Text style={styles.clearBtnText}>🗑️ Xóa hết</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.checkBtn} onPress={handleCheckQuest}>
            <Text style={styles.checkBtnText}>✅ NỘP BẢN QUY HOẠCH</Text>
          </TouchableOpacity>
        </View>

        {/* Offline NPC Island Tour Toggle */}
        <View style={styles.npcBox}>
          <Text style={styles.npcTitle}>🤖 Ghé thăm Đảo Mẫu của Kiến Trúc Sư Máy (NPC Offline):</Text>
          <TouchableOpacity
            style={styles.npcBtn}
            onPress={() => {
              soundManager.playTap();
              setIsNpcMode(!isNpcMode);
              if (!isNpcMode) {
                // Show sample 3x4 rectangle
                setBlocks([
                  { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 },
                  { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
                  { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
                ]);
                setFeedback('Đang xem Đảo mẫu của Kiến trúc sư máy (Hình chữ nhật 3x4 có S = 12 ô², P = 14 đơn vị).');
              } else {
                setBlocks([
                  { x: 3, y: 3 }, { x: 4, y: 3 },
                  { x: 3, y: 4 }, { x: 4, y: 4 },
                ]);
                setFeedback(null);
              }
            }}
          >
            <Text style={styles.npcBtnText}>
              {isNpcMode ? 'Quay lại đảo của em' : 'Xem đảo mẫu NPC'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Lãnh Chúa Đảo Khối"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          setBlocks([
            { x: 3, y: 3 }, { x: 4, y: 3 },
            { x: 3, y: 4 }, { x: 4, y: 4 },
          ]);
          setCurrentQuestIndex(0);
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
              🏝️ **Mục tiêu**: Xây dựng các công trình đạt đúng diện tích (S) hoặc chu vi (P).
            </Text>
            <Text style={styles.tutText}>
              📐 **Diện tích (S)**: Là tổng số ô vuông đất đã xếp (không tính chồng lấn).
            </Text>
            <Text style={styles.tutText}>
              📏 **Chu vi (P)**: Là tổng độ dài các cạnh viền ngoài cùng. Chú ý: Các cạnh dính liền giữa 2 khối bên trong không được tính vào chu vi!
            </Text>
            <Text style={styles.tutText}>
              🔺 **Hình tam giác & hình thang**: Luôn dùng chiều cao vuông góc hạ từ đỉnh xuống đáy, tuyệt đối không lấy cạnh xiên làm chiều cao!
            </Text>
          </View>
        }
        resultData={{
          isWon: true,
          score,
          maxScore: 200,
          playtimeSeconds: elapsedSeconds,
          correctCount,
          incorrectCount,
          skillsPracticed: ['Diện tích ô vuông', 'Chu vi loại cạnh chung', 'Hình học trực quan'],
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
    backgroundColor: colors.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.amberDark,
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
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
    backgroundColor: colors.emerald,
    borderColor: colors.emeraldDark,
  },
  diffBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  diffBtnTextActive: {
    color: colors.white,
  },
  questCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
    ...shadows.sm,
  },
  questTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  targetBadge: {
    backgroundColor: colors.primaryExtraLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  targetBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  questDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  questFormula: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  metricsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
  },
  metricCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  feedbackBox: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  gridContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#7DD3FC',
    marginBottom: 10,
    ...shadows.md,
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  touchRow: {
    flexDirection: 'row',
  },
  touchHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 14,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  clearBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  checkBtn: {
    flex: 1,
    backgroundColor: colors.emerald,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  checkBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  npcBox: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  npcTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  npcBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lavenderBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  npcBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  tutText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
});
