import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect, Circle, Line, Text as SvgText, Path, G } from 'react-native-svg';
import { GameHeader } from '../../components/GameHeader';
import { GameModal } from '../../components/GameModal';
import { colors, shadows } from '../../theme/colors';
import { soundManager } from '../../core/audioController';
import { useGameTimer } from '../../core/game-loop/useGameTimer';
import { profileManager } from '../../storage/profileManager';
import { GameSessionResult } from '../../types';

import {
  generateTreasureDiveZones,
  DepthZone,
} from '../../core/math/generators';

export const TreasureDiveScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  // Submarine Status
  const [oxygenPercent, setOxygenPercent] = useState(100);
  const [currentDepth, setCurrentDepth] = useState(50);
  const [recoveredChests, setRecoveredChests] = useState(0);

  // Chart data: 3 ocean zones surveyed
  const [zones, setZones] = useState<DepthZone[]>(() => generateTreasureDiveZones('easy'));
  const [selectedZone, setSelectedZone] = useState<DepthZone>(zones[0]);

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    const newZones = generateTreasureDiveZones(newDiff);
    setZones(newZones);
    setSelectedZone(newZones[0]);
    setCurrentDepth(newZones[0].depthMeters);
    setFeedback(null);
  };
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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

  // Load collected museum treasures
  useEffect(() => {
    profileManager
      .getGameState<number>('treasure-dive', 'local-learner-sandbox-01', 0)
      .then((saved) => {
        if (saved) setRecoveredChests(saved);
      });
  }, []);

  const handleDiveToZone = (zone: DepthZone) => {
    soundManager.playTap();
    setSelectedZone(zone);
    setCurrentDepth(zone.depthMeters);
    setFeedback(null);
  };

  const handleSearchTreasure = () => {
    if (oxygenPercent <= 15) {
      setFeedback('⚠️ Oxy sắp cạn! Em nên điều khiển tàu ngầm nổi lên để bảo toàn kho báu.');
      return;
    }

    // Deduct oxygen
    setOxygenPercent((ox) => Math.max(0, ox - 20));

    // Probability sampling strictly matching chart percentage
    const roll = Math.random() * 100;
    const foundTreasure = roll < selectedZone.surveyTreasurePercent;

    if (foundTreasure) {
      soundManager.playVictory();
      setIsSuccess(true);
      const newChests = recoveredChests + 1;
      setRecoveredChests(newChests);
      setScore((s) => s + 40);
      setCorrectCount((c) => c + 1);
      setFeedback(
        `🎉 Trục vớt thành công Rương Kho Báu tại ${selectedZone.name}! Tỷ lệ theo biểu đồ là ${selectedZone.surveyTreasurePercent}%.`
      );
      profileManager.setGameState('treasure-dive', 'local-learner-sandbox-01', newChests);
    } else {
      soundManager.playIncorrect();
      setIsSuccess(false);
      setIncorrectCount((c) => c + 1);
      setFeedback(
        `Lần tìm kiếm này chưa gặp rương kho báu. Dù tỷ lệ khảo sát là ${selectedZone.surveyTreasurePercent}%, xác suất luôn có khả năng xảy ra trường hợp còn lại!`
      );
    }
  };

  const finishGame = async () => {
    pause();
    soundManager.playVictory();
    const result: GameSessionResult = {
      sessionId: `td-${Date.now()}`,
      gameId: 'treasure-dive',
      profileId: 'local-learner-sandbox-01',
      difficulty: 'medium',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon: recoveredChests > 0,
      score,
      maxScore: 200,
      correctCount,
      incorrectCount,
      skillsPracticed: ['Đọc biểu đồ cột', 'Thống kê tỷ lệ %', 'Khái niệm xác suất thực tế'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    setModalType('result');
  };

  return (
    <View style={styles.container}>
      <GameHeader
        title="Thợ Lặn Kho Báu"
        topicBadge="Biểu đồ & Thống kê"
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
            <Text style={styles.statPillText}>💎 {recoveredChests} rương</Text>
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

        {/* Ocean Depth Submarine Visual */}
        <View style={styles.oceanArena}>
          <Svg width="100%" height={150} viewBox="0 0 340 150">
            {/* Ocean Depths */}
            <Rect x="0" y="0" width="340" height="50" fill="#38BDF8" />
            <Rect x="0" y="50" width="340" height="50" fill="#0284C7" />
            <Rect x="0" y="100" width="340" height="50" fill="#0F172A" />

            {/* Depth Level Markers */}
            <Line x1="0" y1="50" x2="340" y2="50" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 4" />
            <Line x1="0" y1="100" x2="340" y2="100" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 4" />
            <SvgText x="10" y="42" fill="#FFFFFF" fontSize="10" fontWeight="bold">50m</SvgText>
            <SvgText x="10" y="92" fill="#FFFFFF" fontSize="10" fontWeight="bold">150m</SvgText>
            <SvgText x="10" y="142" fill="#FFFFFF" fontSize="10" fontWeight="bold">300m</SvgText>

            {/* Submarine positioned at selected depth */}
            <G transform={`translate(140, ${currentDepth === 50 ? 15 : currentDepth === 150 ? 65 : 115})`}>
              <Rect x="0" y="4" width="46" height="18" rx="9" fill="#FBBF24" />
              <Rect x="14" y="0" width="10" height="6" rx="2" fill="#D97706" />
              <Circle cx="12" cy="13" r="4" fill="#38BDF8" />
              <Circle cx="26" cy="13" r="4" fill="#38BDF8" />
            </G>
          </Svg>

          {/* Submarine Status Overlay */}
          <View style={styles.subStatusBox}>
            <Text style={styles.subStatusText}>
              Độ sâu: {currentDepth}m | 🫧 Oxy: {oxygenPercent}%
            </Text>
          </View>
        </View>

        {/* Statistical Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            📊 Biểu Đồ Khảo Sát Tỷ Lệ Tìm Thấy Kho Báu (%):
          </Text>

          <Svg width="100%" height={120} viewBox="0 0 320 120">
            {/* Chart Grid Lines */}
            <Line x1="30" y1="10" x2="30" y2="90" stroke="#CBD5E1" strokeWidth="1.5" />
            <Line x1="30" y1="90" x2="310" y2="90" stroke="#CBD5E1" strokeWidth="1.5" />

            {/* Bars for each zone */}
            {zones.map((z, idx) => {
              const barHeight = (z.surveyTreasurePercent / 100) * 70;
              const xPos = 55 + idx * 90;
              const isSelected = selectedZone.name === z.name;

              return (
                <G key={z.name}>
                  {/* Bar */}
                  <Rect
                    x={xPos}
                    y={90 - barHeight}
                    width={45}
                    height={barHeight}
                    rx={4}
                    fill={isSelected ? '#7C3AED' : '#94A3B8'}
                  />
                  {/* Percentage label above bar */}
                  <SvgText
                    x={xPos + 22}
                    y={82 - barHeight}
                    fill={isSelected ? '#7C3AED' : '#475569'}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {z.surveyTreasurePercent}%
                  </SvgText>
                  {/* Category label below axis */}
                  <SvgText
                    x={xPos + 22}
                    y={105}
                    fill="#334155"
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {z.depthMeters}m
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>

        {/* Feedback Alert */}
        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              { backgroundColor: isSuccess ? colors.successBg : colors.infoBg },
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                { color: isSuccess ? colors.emeraldDark : colors.textPrimary },
              ]}
            >
              {feedback}
            </Text>
          </View>
        )}

        {/* Zone Selector Controls */}
        <Text style={styles.sectionHeader}>Chọn tầng độ sâu muốn lặn xuống dò tìm:</Text>
        <View style={styles.zonesRow}>
          {zones.map((z) => {
            const isSelected = selectedZone.name === z.name;
            return (
              <TouchableOpacity
                key={z.name}
                style={[styles.zoneBtn, isSelected && styles.zoneBtnSelected]}
                onPress={() => handleDiveToZone(z)}
              >
                <Text style={[styles.zoneName, isSelected && styles.zoneTextSelected]}>
                  {z.name}
                </Text>
                <Text style={styles.zoneStat}>Tỷ lệ: {z.surveyTreasurePercent}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Action */}
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchTreasure}>
          <Text style={styles.searchBtnText}>
            🔍 QUÉT SÓNG SIÊU ÂM TÌM KHO BÁU (-20% Oxy)
          </Text>
        </TouchableOpacity>

        {/* Surface Submarine Button */}
        <TouchableOpacity style={styles.surfaceBtn} onPress={finishGame}>
          <Text style={styles.surfaceBtnText}>
            ⚓ ĐƯA TÀU NỔI LÊN MẶT NƯỚC & TỔNG KẾT
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Thợ Lặn Kho Báu"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          setOxygenPercent(100);
          setCurrentDepth(50);
          setSelectedZone(zones[0]);
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
              📊 **Biểu đồ cột**: Thể hiện tỷ lệ phần trăm tìm thấy kho báu tại các tầng nước (50m, 150m, 300m).
            </Text>
            <Text style={styles.tutText}>
              🎲 **Bản chất xác suất**: Cột cao hơn (ví dụ 80%) có cơ hội tốt hơn, nhưng xác suất không cam kết 100% luôn luôn có quà mỗi lần quét.
            </Text>
            <Text style={styles.tutText}>
              🫧 **Quản lý Oxy**: Mỗi lần dò tìm tiêu tốn 20% oxy. Em hãy thu thập kho báu và cho tàu nổi lên an toàn trước khi cạn khí thở nhé!
            </Text>
          </View>
        }
        resultData={{
          isWon: recoveredChests > 0,
          score,
          maxScore: 200,
          playtimeSeconds: elapsedSeconds,
          correctCount,
          incorrectCount,
          skillsPracticed: ['Đọc biểu đồ thống kê', 'Phân tích tỷ lệ phần trăm', 'Xác suất thực tế'],
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
    backgroundColor: colors.cyan,
    borderColor: colors.secondaryDark,
  },
  diffBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  diffBtnTextActive: {
    color: colors.white,
  },
  oceanArena: {
    backgroundColor: '#38BDF8',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  subStatusBox: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  subStatusText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
    ...shadows.sm,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  zonesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  zoneBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    alignItems: 'center',
  },
  zoneBtnSelected: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  zoneName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  zoneStat: {
    fontSize: 11,
    color: colors.textMuted,
  },
  zoneTextSelected: {
    color: colors.primary,
  },
  searchBtn: {
    backgroundColor: colors.emerald,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
    ...shadows.md,
  },
  searchBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  surfaceBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  surfaceBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  tutText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
});
