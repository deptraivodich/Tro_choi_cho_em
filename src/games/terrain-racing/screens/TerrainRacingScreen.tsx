import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Rect, Circle, Line, Polygon, G } from 'react-native-svg';
import { GameHeader } from '../../../shared/components/GameHeader';
import { GameModal } from '../../../shared/components/GameModal';
import { colors, shadows } from '../../../shared/theme/colors';
import { soundManager } from '../../../shared/audio/audioController';
import { useGameTimer } from '../../../shared/hooks/useGameTimer';
import { generateRacingStages, TerrainRacingStage } from '../../../shared/math/generators';
import { profileManager } from '../../../shared/storage/profileManager';
import { GameSessionResult } from '../../../shared/types/index';

export const TerrainRacingScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [stages, setStages] = useState<TerrainRacingStage[]>(() => generateRacingStages('easy'));
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  const [selectedSpeed, setSelectedSpeed] = useState<number | null>(null);
  const [isRacing, setIsRacing] = useState(false);
  const [carX, setCarX] = useState(30);
  const [carY, setCarY] = useState(130);
  const [raceResult, setRaceResult] = useState<'idle' | 'success' | 'failed'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Score stats
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
    setIsRacing(false);
    pause();
    onExit();
  };

  const stage = stages[currentStageIndex];

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    const newStages = generateRacingStages(newDiff);
    setStages(newStages);
    setCurrentStageIndex(0);
    setSelectedSpeed(null);
    setRaceResult('idle');
    setFeedback(null);
    setCarX(30);
    setCarY(130);
  };

  // 2D Racing animation loop
  useEffect(() => {
    if (!isRacing) return;

    let currentX = 30;

    const interval = setInterval(() => {
      currentX += 4;
      setCarX(currentX);

      // Simple terrain curve: hill at x:110, canyon at x:180 to 220
      let y = 130;
      if (currentX < 110) {
        y = 130 - (currentX / 110) * 20; // climbing hill
      } else if (currentX < 180) {
        y = 110 + ((currentX - 110) / 70) * 20; // going down
      } else if (currentX <= 220) {
        // Jumping over canyon!
        y = 110 - Math.sin(((currentX - 180) / 40) * Math.PI) * 25;
      } else {
        y = 130;
      }
      setCarY(y);

      // Finish line at x: 290
      if (currentX >= 290) {
        clearInterval(interval);
        setIsRacing(false);

        if (selectedSpeed === stage.correctAnswer) {
          soundManager.playCorrect();
          setRaceResult('success');
          setScore((s) => s + 30);
          setCorrectCount((c) => c + 1);
          setFeedback(
            `🎉 Xuất sắc! Kết quả ${stage.correctAnswer} ${stage.answerUnit} hoàn toàn chuẩn xác, xe vượt chướng ngại an toàn!`
          );
        } else {
          soundManager.playIncorrect();
          setRaceResult('failed');
          setIncorrectCount((c) => c + 1);
          setFeedback(
            `Chưa chuẩn xác: ${selectedSpeed} ${stage.answerUnit}. Đáp án đúng là ${stage.correctAnswer} ${stage.answerUnit}.`
          );
        }
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isRacing, selectedSpeed, stage]);

  const handleLaunchCar = () => {
    if (selectedSpeed === null) {
      setFeedback('Em hãy chọn vận tốc động cơ trước khi cho xe xuất phát nhé!');
      return;
    }
    soundManager.playTap();
    setFeedback(null);
    setRaceResult('idle');
    setCarX(30);
    setCarY(130);
    setIsRacing(true);
  };

  const handleNextStage = () => {
    soundManager.playTap();
    if (currentStageIndex + 1 < stages.length) {
      setCurrentStageIndex((idx) => idx + 1);
      setSelectedSpeed(null);
      setRaceResult('idle');
      setFeedback(null);
      setCarX(30);
      setCarY(130);
    } else {
      finishGame(true);
    }
  };

  const finishGame = async (isWon: boolean) => {
    pause();
    soundManager.playVictory();
    const result: GameSessionResult = {
      sessionId: `tr-${Date.now()}`,
      gameId: 'terrain-racing',
      profileId: 'local-learner-sandbox-01',
      difficulty: 'medium',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon,
      score,
      maxScore: 300,
      correctCount,
      incorrectCount,
      skillsPracticed: ['Vận tốc v = s / t', 'Toán chuyển động đều', 'Đổi đơn vị vận tốc'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    setModalType('result');
  };

  return (
    <View style={styles.container}>
      <GameHeader
        title="Siêu Xe Vượt Địa Hình"
        topicBadge="Vận tốc v = s : t"
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
              🏁 Chặng {stage.stageNumber}/{stages.length}
            </Text>
          </View>
        }
      />

      {/* 2D Race Track Visualizer */}
      <View style={styles.trackContainer}>
        <Svg width="100%" height={180} viewBox="0 0 340 180">
          {/* Sky gradient background */}
          <Rect x="0" y="0" width="340" height="180" fill="#E0F2FE" />
          <Circle cx="280" cy="40" r="22" fill="#FDE047" opacity="0.8" />

          {/* Hills and Canyon Terrain */}
          {/* Ground Left */}
          <Path
            d="M 0 150 Q 80 120 170 140 L 170 180 L 0 180 Z"
            fill="#10B981"
          />
          {/* Canyon Gap (x: 170 to 220) */}
          <Rect x="170" y="155" width="50" height="25" fill="#3B82F6" />
          <Line x1="170" y1="140" x2="170" y2="180" stroke="#047857" strokeWidth="2" />
          <Line x1="220" y1="140" x2="220" y2="180" stroke="#047857" strokeWidth="2" />
          {/* Ground Right with Finish */}
          <Path
            d="M 220 140 Q 280 145 340 140 L 340 180 L 220 180 Z"
            fill="#10B981"
          />

          {/* Finish Line Flag at x: 290 */}
          <Line x1="290" y1="90" x2="290" y2="145" stroke="#1F2937" strokeWidth="3" />
          <Polygon points="290,90 320,105 290,120" fill="#EF4444" />

          {/* 2D Buggy Race Car */}
          <G transform={`translate(${carX - 20}, ${carY - 18})`}>
            {/* Chassis */}
            <Rect x="4" y="6" width="32" height="14" rx="4" fill="#F43F5E" />
            <Polygon points="10,6 16,0 26,0 30,6" fill="#FB7185" />
            {/* Wheels */}
            <Circle cx="10" cy="20" r="6" fill="#1F2937" />
            <Circle cx="10" cy="20" r="3" fill="#E5E7EB" />
            <Circle cx="30" cy="20" r="6" fill="#1F2937" />
            <Circle cx="30" cy="20" r="3" fill="#E5E7EB" />
          </G>
        </Svg>

        <View style={styles.canyonLabel}>
          <Text style={styles.canyonText}>⚠️ Khe vực sâu</Text>
        </View>
      </View>

      {/* Math Calculation Card */}
      <View style={styles.mathCard}>
        <Text style={styles.stageTitle}>
          Chặng {stage.stageNumber}: {stage.name}
        </Text>

        <View style={styles.parametersRow}>
          <View style={styles.paramBox}>
            <Text style={styles.paramLabel}>Quãng đường (s)</Text>
            <Text style={styles.paramValue}>
              {stage.distance} {stage.distanceUnit}
            </Text>
          </View>
          <View style={styles.paramDivider}>
            <Text style={styles.paramDividerText}>:</Text>
          </View>
          <View style={styles.paramBox}>
            <Text style={styles.paramLabel}>Thời gian (t)</Text>
            <Text style={styles.paramValue}>
              {stage.time} {stage.timeUnit}
            </Text>
          </View>
        </View>

        {/* Feedback message */}
        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              { backgroundColor: raceResult === 'success' ? colors.successBg : colors.errorBg },
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                { color: raceResult === 'success' ? colors.emeraldDark : colors.error },
              ]}
            >
              {feedback}
            </Text>
          </View>
        )}

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

        <Text style={styles.speedOptionPrompt}>
          {stage.questionPrompt || 'Tính toán thông số phù hợp để cấu hình xe vượt địa hình:'}
        </Text>

        <View style={styles.speedOptionsGrid}>
          {stage.options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.speedBtn,
                selectedSpeed === opt && styles.speedBtnSelected,
              ]}
              onPress={() => {
                soundManager.playTap();
                setSelectedSpeed(opt);
                setFeedback(null);
              }}
              disabled={isRacing}
            >
              <Text
                style={[
                  styles.speedBtnText,
                  selectedSpeed === opt && styles.speedBtnTextSelected,
                ]}
              >
                {opt} {stage.answerUnit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {raceResult === 'success' ? (
          <TouchableOpacity style={styles.nextStageBtn} onPress={handleNextStage}>
            <Text style={styles.nextStageBtnText}>
              {currentStageIndex + 1 < stages.length
                ? 'Tiến sang chặng tiếp theo ➔'
                : '🏆 Hoàn thành xuất sắc giải đua!'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.launchBtn, isRacing && styles.launchBtnDisabled]}
            onPress={handleLaunchCar}
            disabled={isRacing}
          >
            <Text style={styles.launchBtnText}>
              {isRacing ? 'Xe đang tăng tốc vượt dốc...' : '🏎️ XUẤT PHÁT VƯỢT ĐỊA HÌNH'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Siêu Xe Vượt Địa Hình"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          setCurrentStageIndex(0);
          setSelectedSpeed(null);
          setRaceResult('idle');
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
              🏁 **Quy tắc giải đua**: Hoàn thành 10 chặng đua địa hình hiểm trở.
            </Text>
            <Text style={styles.tutText}>
              📐 **Công thức vàng**: Vận tốc = Quãng đường chia cho Thời gian (v = s : t).
            </Text>
            <Text style={styles.tutText}>
              ⚙️ **Cách chơi**: Đọc kỹ quãng đường s và thời gian t, tính nhẩm vận tốc v tương ứng rồi bấm chọn số đo động cơ. Bấm &quot;XUẤT PHÁT&quot; để ngắm xe bay qua hẻm núi!
            </Text>
          </View>
        }
        resultData={{
          isWon: true,
          score,
          maxScore: 300,
          playtimeSeconds: elapsedSeconds,
          correctCount,
          incorrectCount,
          skillsPracticed: ['Vận tốc v = s : t', 'Toán chuyển động đều', 'Phân tích đơn vị'],
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
    backgroundColor: colors.emeraldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.emeraldDark,
  },
  trackContainer: {
    backgroundColor: '#E0F2FE',
    position: 'relative',
    borderBottomWidth: 2,
    borderBottomColor: colors.lavenderBorder,
  },
  canyonLabel: {
    position: 'absolute',
    bottom: 8,
    left: 175,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  canyonText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  mathCard: {
    flex: 1,
    backgroundColor: colors.white,
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
  stageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  parametersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 8,
  },
  paramBox: {
    backgroundColor: colors.primarySubtle,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    minWidth: 110,
  },
  paramLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  paramValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  paramDivider: {
    paddingHorizontal: 4,
  },
  paramDividerText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textMuted,
  },
  feedbackBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  speedOptionPrompt: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  speedOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  speedBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    minWidth: 110,
    alignItems: 'center',
  },
  speedBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  speedBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  speedBtnTextSelected: {
    color: colors.white,
  },
  launchBtn: {
    backgroundColor: colors.emerald,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    ...shadows.md,
  },
  launchBtnDisabled: {
    backgroundColor: colors.textLight,
  },
  launchBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  nextStageBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    ...shadows.md,
  },
  nextStageBtnText: {
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
