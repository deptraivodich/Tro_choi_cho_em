import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect, Circle, Line, Path, Polygon, G, Text as SvgText } from 'react-native-svg';
import { GameHeader } from '../../../shared/components/GameHeader';
import { GameModal } from '../../../shared/components/GameModal';
import { colors, shadows } from '../../../shared/theme/colors';
import { soundManager } from '../../../shared/audio/audioController';
import { useGameTimer } from '../../../shared/hooks/useGameTimer';
import {
  classifyAngle,
  calculateTrajectory,
  TrajectoryPoint,
} from '../../../shared/math/angle';
import { profileManager } from '../../../shared/storage/profileManager';
import { GameSessionResult } from '../../../shared/types/index';

interface TargetRing {
  id: number;
  x: number;
  y: number;
  radius: number;
  name: string;
  isHit: boolean;
}

export const RoyalArtilleryScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  // Cannon firing controls
  const [angleDegrees, setAngleDegrees] = useState(45); // 0 to 180 degrees
  const [powerVelocity, setPowerVelocity] = useState(14.5); // decimal power m/s
  const [isFiring, setIsFiring] = useState(false);
  const [projectilePos, setProjectilePos] = useState<{ x: number; y: number } | null>(null);
  const [trajectoryTrace, setTrajectoryTrace] = useState<TrajectoryPoint[]>([]);

  const getTargetsForDiff = (diff: 'easy' | 'medium' | 'hard'): TargetRing[] => {
    if (diff === 'easy') {
      return [
        { id: 1, x: 260, y: 80, radius: 24, name: 'Bia Tiên Phong (Phía Phải - Góc Nhọn)', isHit: false },
        { id: 2, x: 75, y: 80, radius: 24, name: 'Bia Hậu Cứ (Phía Trái - Góc Tù)', isHit: false },
      ];
    } else if (diff === 'medium') {
      return [
        { id: 1, x: 275, y: 70, radius: 18, name: 'Bia Tiên Phong (Phía Phải - Góc Nhọn)', isHit: false },
        { id: 2, x: 65, y: 70, radius: 18, name: 'Bia Hậu Cứ (Phía Trái - Góc Tù)', isHit: false },
      ];
    } else {
      return [
        { id: 1, x: 295, y: 60, radius: 14, name: 'Bia Tiên Phong (Phía Phải - Góc Nhọn)', isHit: false },
        { id: 2, x: 45, y: 60, radius: 14, name: 'Bia Hậu Cứ (Phía Trái - Góc Tù)', isHit: false },
      ];
    }
  };

  // 2-sided targets to fully support Acute (Right) and Obtuse (Left) angles!
  const [targets, setTargets] = useState<TargetRing[]>(() => getTargetsForDiff('easy'));

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    setTargets(getTargetsForDiff(newDiff));
    setFeedback(null);
    setTrajectoryTrace([]);
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

  const isMountedRef = useRef(true);
  const isExitingRef = useRef(false);
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  const handleScreenExit = () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    if (animIntervalRef.current) {
      clearInterval(animIntervalRef.current);
      animIntervalRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    setIsFiring(false);
    pause();
    onExit();
  };

  const cannonOrigin = { x: 170, y: 130 };
  const angleInfo = classifyAngle(angleDegrees);

  const handleFire = () => {
    if (isFiring) return;
    soundManager.playCannonShoot();
    setIsFiring(true);
    setFeedback(null);

    // Compute 2D physics trajectory points
    // Acute angles (<90°) shoot towards right (positive x)
    // Obtuse angles (>90°, like 120°) shoot towards left (negative x)
    const points = calculateTrajectory(
      cannonOrigin.x,
      cannonOrigin.y,
      angleDegrees,
      powerVelocity,
      9.8,
      140,
      0.08
    );
    setTrajectoryTrace(points);

    let idx = 0;
    if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    animIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current || isExitingRef.current) {
        if (animIntervalRef.current) clearInterval(animIntervalRef.current);
        return;
      }
      if (idx < points.length) {
        const pt = points[idx];
        setProjectilePos({ x: pt.x, y: pt.y });

        // Hit detection on targets
        for (const t of targets) {
          if (!t.isHit) {
            const dist = Math.hypot(pt.x - t.x, pt.y - t.y);
            if (dist < t.radius + 6) {
              // HIT!
              if (animIntervalRef.current) clearInterval(animIntervalRef.current);
              animIntervalRef.current = null;
              setIsFiring(false);
              soundManager.playVictory();
              setIsSuccess(true);
              t.isHit = true;
              setTargets([...targets]);
              setScore((s) => s + 50);
              setCorrectCount((c) => c + 1);
              setFeedback(
                `🎯 BẮN TRÚNG MỤC TIÊU! Góc ${angleDegrees}° (${angleInfo.vietnameseName}) và lực ${powerVelocity} m/s đã tạo đường đạn hoàn hảo!`
              );

              // Check if all hit
              if (targets.every((tar) => tar.isHit)) {
                finishTimeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current && !isExitingRef.current) {
                    finishGame(true);
                  }
                }, 1500);
              }
              return;
            }
          }
        }
        idx++;
      } else {
        // Missed shot
        if (animIntervalRef.current) clearInterval(animIntervalRef.current);
        animIntervalRef.current = null;
        setIsFiring(false);
        soundManager.playIncorrect();
        setIsSuccess(false);
        setIncorrectCount((c) => c + 1);
        setFeedback(
          `Chưa trúng đích! Góc ${angleDegrees}° (${angleInfo.vietnameseName}) bắn theo hướng ${
            angleDegrees > 90 ? 'sang TRÁI' : 'sang PHẢI'
          }. Em hãy quan sát đường ngắm chấm nét và điều chỉnh lại góc hoặc lực nhé!`
        );
      }
    }, 40);
  };

  const finishGame = async (isWon: boolean) => {
    pause();
    soundManager.playVictory();
    const result: GameSessionResult = {
      sessionId: `ra-${Date.now()}`,
      gameId: 'royal-artillery',
      profileId: 'local-learner-sandbox-01',
      difficulty: 'hard',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon,
      score,
      maxScore: 100,
      correctCount,
      incorrectCount,
      skillsPracticed: ['Đo góc nhọn, vuông, tù', 'Lực bắn số thập phân', 'Quỹ đạo 2 hướng'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    setModalType('result');
  };

  return (
    <View style={styles.container}>
      <GameHeader
        title="Xưởng Đúc Pháo Cung Đình"
        topicBadge="Góc nhọn, vuông, tù & Thập phân"
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
            <Text style={styles.statPillText}>🎯 {score} đ</Text>
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

        {/* 2D Ancient Citadel Artillery Field */}
        <View style={styles.artilleryArena}>
          <Svg width="100%" height={170} viewBox="0 0 340 170">
            {/* Sky */}
            <Rect x="0" y="0" width="340" height="170" fill="#FFF7ED" />

            {/* Citadel Central Platform */}
            <Rect x="145" y="130" width="50" height="40" rx="4" fill="#78350F" />
            <Rect x="140" y="125" width="60" height="10" rx="2" fill="#92400E" />

            {/* Ground */}
            <Rect x="0" y="145" width="340" height="25" fill="#15803D" />

            {/* Protractor visual arc at cannon */}
            <Path
              d={`M ${cannonOrigin.x - 35} ${cannonOrigin.y} A 35 35 0 0 1 ${cannonOrigin.x + 35} ${cannonOrigin.y}`}
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              fill="none"
            />

            {/* Angle Indicator Needle */}
            {(() => {
              const rad = (angleDegrees * Math.PI) / 180;
              const needleX = cannonOrigin.x + 40 * Math.cos(rad);
              const needleY = cannonOrigin.y - 40 * Math.sin(rad);
              return (
                <Line
                  x1={cannonOrigin.x}
                  y1={cannonOrigin.y}
                  x2={needleX}
                  y2={needleY}
                  stroke="#7C3AED"
                  strokeWidth="2.5"
                />
              );
            })()}

            {/* Trace of previous trajectory */}
            {trajectoryTrace.length > 1 && (
              <Path
                d={trajectoryTrace.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                stroke="#A855F7"
                strokeWidth="2"
                strokeDasharray="3 3"
                fill="none"
              />
            )}

            {/* Targets */}
            {targets.map((t) => (
              <G key={t.id}>
                {/* Target pole */}
                <Line x1={t.x} y1={t.y} x2={t.x} y2={145} stroke="#64748B" strokeWidth="2" />
                {/* Target ring */}
                <Circle
                  cx={t.x}
                  cy={t.y}
                  r={t.radius}
                  fill={t.isHit ? '#10B981' : '#EF4444'}
                />
                <Circle
                  cx={t.x}
                  cy={t.y}
                  r={t.radius - 6}
                  fill={t.isHit ? '#D1FAE5' : '#FFFFFF'}
                />
                <Circle
                  cx={t.x}
                  cy={t.y}
                  r={t.radius - 12}
                  fill={t.isHit ? '#10B981' : '#EF4444'}
                />
              </G>
            ))}

            {/* Active Projectile */}
            {projectilePos && (
              <Circle cx={projectilePos.x} cy={projectilePos.y} r="5" fill="#D97706" />
            )}

            {/* Cannon Base Wheel */}
            <Circle cx={cannonOrigin.x} cy={cannonOrigin.y} r="8" fill="#1E293B" />
          </Svg>

          <View style={styles.angleClassificationTag}>
            <Text style={styles.angleClassificationText}>
              📐 Góc {angleDegrees}°: {angleInfo.vietnameseName} ({angleDegrees > 90 ? 'Hướng Trái' : 'Hướng Phải'})
            </Text>
          </View>
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

        {/* Controls Card: Angle & Decimal Power */}
        <View style={styles.controlsCard}>
          <Text style={styles.controlsTitle}>⚙️ Hiệu Chỉnh Góc & Lực Bắn Thập Phân:</Text>

          {/* Quick Angle Buttons: Nhọn, Vuông, Tù */}
          <Text style={styles.subControlLabel}>Góc phóng (0° đến 180°):</Text>
          <View style={styles.angleButtonsRow}>
            {[
              { deg: 35, label: '35° (Nhọn)' },
              { deg: 60, label: '60° (Nhọn)' },
              { deg: 90, label: '90° (Vuông)' },
              { deg: 120, label: '120° (Tù - Trái)' },
              { deg: 145, label: '145° (Tù - Trái)' },
            ].map((btn) => (
              <TouchableOpacity
                key={btn.deg}
                style={[
                  styles.angleBtn,
                  angleDegrees === btn.deg && styles.angleBtnSelected,
                ]}
                onPress={() => {
                  soundManager.playTap();
                  setAngleDegrees(btn.deg);
                  setFeedback(null);
                }}
              >
                <Text
                  style={[
                    styles.angleBtnText,
                    angleDegrees === btn.deg && styles.angleBtnTextSelected,
                  ]}
                >
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Decimal Power Selection */}
          <Text style={[styles.subControlLabel, { marginTop: 12 }]}>
            Lực phóng thập phân (m/s):
          </Text>
          <View style={styles.powerButtonsRow}>
            {[10.5, 12.0, 14.5, 16.5].map((pow) => (
              <TouchableOpacity
                key={pow}
                style={[
                  styles.powerBtn,
                  powerVelocity === pow && styles.powerBtnSelected,
                ]}
                onPress={() => {
                  soundManager.playTap();
                  setPowerVelocity(pow);
                  setFeedback(null);
                }}
              >
                <Text
                  style={[
                    styles.powerBtnText,
                    powerVelocity === pow && styles.powerBtnTextSelected,
                  ]}
                >
                  {pow.toString().replace('.', ',')} m/s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Launch Cannon Button */}
          <TouchableOpacity
            style={[styles.fireBtn, isFiring && styles.fireBtnDisabled]}
            onPress={handleFire}
            disabled={isFiring}
          >
            <Text style={styles.fireBtnText}>
              {isFiring ? 'Đạn đang bay theo quỹ đạo...' : '💥 KHAI HỎA ĐẠI BÁC'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Xưởng Đúc Pháo Cung Đình"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          setAngleDegrees(45);
          setPowerVelocity(14.5);
          setTargets([
            { id: 1, x: 260, y: 80, radius: 18, name: 'Bia Tiên Phong', isHit: false },
            { id: 2, x: 70, y: 80, radius: 18, name: 'Bia Hậu Cứ', isHit: false },
          ]);
          setTrajectoryTrace([]);
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
              📐 **Đo góc**:
              - Góc nhọn: lớn hơn 0° và nhỏ hơn 90° (bắn sang hướng PHẢI).
              - Góc vuông: đúng 90° (bắn thẳng lên trời).
              - Góc tù: lớn hơn 90° và nhỏ hơn 180° (bắn sang hướng TRÁI). Ví dụ 120° phải quay nòng sang trái!
            </Text>
            <Text style={styles.tutText}>
              🎯 **Mục tiêu hai phía**: Phía phải có bia tiên phong (cần góc nhọn), phía trái có bia hậu cứ (cần góc tù).
            </Text>
            <Text style={styles.tutText}>
              🚀 **Lực thập phân**: Điều chỉnh lực phóng số thập phân (12,0; 14,5 m/s) để viên đạn rơi trúng hồng tâm.
            </Text>
          </View>
        }
        resultData={{
          isWon: targets.every((t) => t.isHit),
          score,
          maxScore: 100,
          playtimeSeconds: elapsedSeconds,
          correctCount,
          incorrectCount,
          skillsPracticed: ['Đo góc nhọn, vuông, tù', 'Lực bắn số thập phân', 'Quỹ đạo parabol 2 chiều'],
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
    backgroundColor: '#DC2626',
    borderColor: '#991B1B',
  },
  diffBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  diffBtnTextActive: {
    color: colors.white,
  },
  artilleryArena: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FED7AA',
  },
  angleClassificationTag: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  angleClassificationText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
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
  controlsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
    ...shadows.sm,
  },
  controlsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subControlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  angleButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  angleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
  },
  angleBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  angleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  angleBtnTextSelected: {
    color: colors.white,
  },
  powerButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  powerBtn: {
    flex: 1,
    minWidth: 64,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  powerBtnSelected: {
    backgroundColor: colors.emerald,
    borderColor: colors.emeraldDark,
  },
  powerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  powerBtnTextSelected: {
    color: colors.white,
  },
  fireBtn: {
    backgroundColor: colors.rose,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    ...shadows.md,
  },
  fireBtnDisabled: {
    backgroundColor: colors.textLight,
  },
  fireBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  tutText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
});
