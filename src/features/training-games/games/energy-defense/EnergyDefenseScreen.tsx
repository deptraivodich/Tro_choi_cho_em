import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import Svg, {
  Rect,
  Circle,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Ellipse,
  Polygon,
} from 'react-native-svg';
import { GameHeader } from '../../components/GameHeader';
import { GameModal } from '../../components/GameModal';
import { TimerBar } from '../../components/TimerBar';
import { colors, shadows } from '../../theme/colors';
import { GAME_PALETTES } from '../../theme/gamePalettes';
import { soundManager } from '../../core/audioController';
import { useGameTimer } from '../../core/game-loop/useGameTimer';
import {
  generateEnergyDefenseProblem,
  EnergyDefenseProblem,
  EnergyPiece,
} from '../../core/math/generators';
import { areFractionsEqual, addFractions, Fraction } from '../../core/math/fraction';
import { profileManager } from '../../storage/profileManager';
import { GameSessionResult } from '../../types';
import { TurretArt, CitadelArt, CreepArt, LaserBeamArt } from '../../components/GameArt';

interface Creep {
  id: number;
  type: 'scout' | 'slime' | 'golem';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
}

const TOTAL_SESSION_SECONDS = 360; // 6 minutes

export const EnergyDefenseScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const palette = GAME_PALETTES['energy-defense'];

  const isMountedRef = useRef(true);
  const activeTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [isPracticeFreeze, setIsPracticeFreeze] = useState(false);

  // Problem and selection state
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [problem, setProblem] = useState<EnergyDefenseProblem>(() =>
    generateEnergyDefenseProblem('easy')
  );
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);

  // Game stats
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [baseHp, setBaseHp] = useState(100);
  const [towerCharged, setTowerCharged] = useState(false);
  const [laserTarget, setLaserTarget] = useState<{ x: number; y: number } | null>(null);

  // Creeps along path
  const [creeps, setCreeps] = useState<Creep[]>([
    { id: 1, type: 'scout', x: 20, y: 70, hp: 30, maxHp: 30, speed: 1.1 },
    { id: 2, type: 'slime', x: -50, y: 70, hp: 45, maxHp: 45, speed: 0.9 },
  ]);

  const { elapsedSeconds, isPaused, pause, resume, reset } = useGameTimer({
    initialSeconds: 0,
    autoStart: true,
  });

  const safeTimeout = useCallback((fn: () => void, delayMs: number) => {
    const id = setTimeout(() => {
      if (isMountedRef.current) {
        fn();
      }
    }, delayMs);
    activeTimeouts.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeTimeouts.current.forEach(clearTimeout);
      activeTimeouts.current = [];
    };
  }, []);

  const handleScreenExit = useCallback(() => {
    isMountedRef.current = false;
    pause();
    activeTimeouts.current.forEach(clearTimeout);
    activeTimeouts.current = [];
    onExit();
  }, [pause, onExit]);

  // Calculate current selected sum
  const selectedPieces = problem.availablePieces.filter((p) =>
    selectedPieceIds.includes(p.id)
  );

  let currentSumFraction: Fraction = { num: 0, den: 1 };
  if (selectedPieces.length > 0) {
    currentSumFraction = selectedPieces[0].fraction;
    for (let i = 1; i < selectedPieces.length; i++) {
      currentSumFraction = addFractions(currentSumFraction, selectedPieces[i].fraction);
    }
  }

  const currentNumericSum = selectedPieces.reduce((acc, p) => acc + p.numericVal, 0);
  const roundedCurrentSum = Math.round(currentNumericSum * 1000) / 1000;
  const isExactMatch =
    selectedPieces.length > 0 &&
    areFractionsEqual(currentSumFraction, problem.targetFraction);

  // Creeps movement loop
  useEffect(() => {
    if (isPaused || modalType !== null || isPracticeFreeze) return;

    const interval = setInterval(() => {
      setCreeps((prev) => {
        const next: Creep[] = [];
        let damageToBase = 0;

        for (const c of prev) {
          let nx = c.x + c.speed;
          let ny = c.y;

          // Path: (0, 70) -> (170, 70) -> (170, 145) -> (310, 145)
          if (nx >= 170 && c.y < 145) {
            nx = 170;
            ny = c.y + c.speed;
          } else if (c.y >= 145) {
            ny = 145;
            nx = c.x + c.speed;
          }

          if (nx >= 295) {
            // Hit Citadel
            damageToBase += 15;
            soundManager.playIncorrect();
          } else {
            next.push({ ...c, x: nx, y: ny });
          }
        }

        if (damageToBase > 0) {
          setBaseHp((hp) => {
            const newHp = Math.max(0, hp - damageToBase);
            if (newHp === 0) finishGame(false);
            return newHp;
          });
        }

        // Spawn new creep dynamically
        if (next.length < 3 && Math.random() < 0.06) {
          const creepTypes: ('scout' | 'slime' | 'golem')[] = ['scout', 'slime', 'golem'];
          const t = creepTypes[Math.floor(Math.random() * creepTypes.length)];
          const hp = t === 'golem' ? 60 : t === 'slime' ? 40 : 25;
          const spd = t === 'golem' ? 0.7 : t === 'slime' ? 1.0 : 1.3;
          next.push({
            id: Date.now() + Math.random(),
            type: t,
            x: 0,
            y: 70,
            hp,
            maxHp: hp,
            speed: spd,
          });
        }

        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, modalType, isPracticeFreeze]);

  // Session time limit check
  useEffect(() => {
    if (elapsedSeconds >= TOTAL_SESSION_SECONDS && modalType === null) {
      finishGame(true);
    }
  }, [elapsedSeconds, modalType]);

  const finishGame = async (isWon: boolean) => {
    pause();
    soundManager.playVictory();
    const result: GameSessionResult = {
      sessionId: `ed-${Date.now()}`,
      gameId: 'energy-defense',
      profileId: 'local-learner-sandbox-01',
      difficulty,
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon,
      score,
      maxScore: Math.max(100, score),
      correctCount,
      incorrectCount,
      skillsPracticed: ['Cộng số thập phân', 'Phân số tương đương', 'Ghép năng lượng'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    setModalType('result');
  };

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    setSelectedPieceIds([]);
    setFeedback(null);
    setProblem(generateEnergyDefenseProblem(newDiff, undefined, historyIds));
  };

  const togglePiece = (pieceId: string) => {
    soundManager.playTap();
    setFeedback(null);
    if (selectedPieceIds.includes(pieceId)) {
      setSelectedPieceIds(selectedPieceIds.filter((id) => id !== pieceId));
    } else {
      setSelectedPieceIds([...selectedPieceIds, pieceId]);
    }
  };

  const handleChargeTower = () => {
    if (selectedPieceIds.length === 0) {
      setFeedback('Em hãy chọn các viên pha lê năng lượng bên dưới nhé!');
      setIsSuccessFeedback(false);
      return;
    }

    if (isExactMatch) {
      soundManager.playCorrect();
      setIsSuccessFeedback(true);
      setFeedback(`🎉 Tuyệt vời! ${problem.explanation}`);
      setTowerCharged(true);
      setScore((s) => s + 25);
      setCorrectCount((c) => c + 1);

      // Fire laser at first incoming creep
      if (creeps.length > 0) {
        const targetCreep = creeps[0];
        setLaserTarget({ x: targetCreep.x, y: targetCreep.y });
        safeTimeout(() => {
          setCreeps((prev) => prev.slice(1));
          setLaserTarget(null);
          setTowerCharged(false);
          setSelectedPieceIds([]);
          // Record history to prevent repetition
          const newHistory = [...historyIds, problem.id];
          setHistoryIds(newHistory);
          setProblem(generateEnergyDefenseProblem(difficulty, undefined, newHistory));
        }, 600);
      } else {
        safeTimeout(() => {
          setTowerCharged(false);
          setSelectedPieceIds([]);
          const newHistory = [...historyIds, problem.id];
          setHistoryIds(newHistory);
          setProblem(generateEnergyDefenseProblem(difficulty, undefined, newHistory));
        }, 800);
      }
    } else {
      soundManager.playIncorrect();
      setIsSuccessFeedback(false);
      setIncorrectCount((c) => c + 1);
      const diff = Math.round(Math.abs(problem.targetNumeric - currentNumericSum) * 100) / 100;
      if (currentNumericSum < problem.targetNumeric) {
        setFeedback(
          `⚡ Tổng hiện tại là ${roundedCurrentSum.toString().replace('.', ',')}, còn thiếu ${diff.toString().replace('.', ',')} nữa để đủ ${problem.targetDisplay}. Em chọn thêm nhé!`
        );
      } else {
        setFeedback(
          `⚠️ Tổng năng lượng (${roundedCurrentSum.toString().replace('.', ',')}) đã vượt quá mục tiêu ${problem.targetDisplay} là ${diff.toString().replace('.', ',')}. Em hãy bỏ bớt mảnh nhé!`
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <GameHeader
        title="Thủ Thành Năng Lượng"
        topicBadge="Cộng thập phân & phân số"
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
            <Text style={styles.statPillText}>🏆 {score} đ</Text>
          </View>
        }
      />

      <TimerBar
        elapsedSeconds={elapsedSeconds}
        totalSeconds={TOTAL_SESSION_SECONDS}
        isCountDown
      />

      {/* Main Game Frame (Max width 1024 bounded on Desktop) */}
      <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
        {/* Left / Top: 2D Battlefield Arena */}
        <View style={[styles.arenaWrapper, isDesktop && styles.arenaWrapperDesktop]}>
          <View style={styles.arenaHeaderRow}>
            {/* Difficulty Selector */}
            <View style={styles.diffSelector}>
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

            {/* Freeze Thinking Toggle */}
            <TouchableOpacity
              style={[
                styles.freezeBtn,
                isPracticeFreeze && styles.freezeBtnActive,
              ]}
              onPress={() => setIsPracticeFreeze(!isPracticeFreeze)}
            >
              <Text style={styles.freezeBtnText}>
                {isPracticeFreeze ? '⏸️ Đang dừng suy nghĩ' : '⏳ Tạm dừng quái vật'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* SVG 2D Illustrated Battlefield */}
          <View style={styles.svgContainer}>
            <Svg width="100%" height={240} viewBox="0 0 350 240">
              <Defs>
                <LinearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#0F172A" />
                  <Stop offset="1" stopColor="#1E293B" />
                </LinearGradient>
                <LinearGradient id="pathGradient" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#475569" />
                  <Stop offset="1" stopColor="#334155" />
                </LinearGradient>
              </Defs>

              {/* Background Landscape */}
              <Rect x="0" y="0" width="350" height="240" fill="url(#bgSky)" />

              {/* Distant Mountains */}
              <Polygon points="0,110 60,60 130,110" fill="#1E293B" opacity={0.6} />
              <Polygon points="90,110 170,45 250,110" fill="#0F172A" opacity={0.8} />
              <Polygon points="220,110 290,70 350,110" fill="#1E293B" opacity={0.6} />

              {/* Decorative Trees / Ground Crystals */}
              <Circle cx="40" cy="180" r="14" fill="#065F46" />
              <Circle cx="40" cy="172" r="10" fill="#10B981" />
              <Circle cx="120" cy="40" r="12" fill="#065F46" />
              <Circle cx="240" cy="200" r="16" fill="#065F46" />

              {/* Winding Cobblestone Road with depth */}
              <Path
                d="M -10 70 L 170 70 L 170 145 L 340 145"
                stroke="#1E293B"
                strokeWidth="42"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M -10 70 L 170 70 L 170 145 L 340 145"
                stroke="url(#pathGradient)"
                strokeWidth="34"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Road markings */}
              <Path
                d="M 10 70 L 150 70 M 170 85 L 170 130 M 185 145 L 300 145"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeDasharray="6 6"
                fill="none"
              />

              {/* Laser Beam FX */}
              {laserTarget && (
                <LaserBeamArt
                  x1={95}
                  y1={135}
                  x2={laserTarget.x}
                  y2={laserTarget.y}
                />
              )}

              {/* Turret Placement (at x:95, y:155) */}
              <TurretArt x={95} y={155} isCharged={towerCharged} size={64} />

              {/* Creeps along path */}
              {creeps.map((c) => (
                <CreepArt
                  key={c.id}
                  x={c.x}
                  y={c.y}
                  type={c.type}
                  hp={c.hp}
                  maxHp={c.maxHp}
                  size={36}
                />
              ))}

              {/* Base Citadel (at x:310, y:145) */}
              <CitadelArt x={310} y={145} hpPercent={baseHp} size={70} />
            </Svg>

            {/* Base HP Overlay Badge */}
            <View style={styles.baseHpBadge}>
              <Text style={styles.baseHpTitle}>🏰 Căn cứ Hoàng Gia</Text>
              <View style={styles.hpTrack}>
                <View
                  style={[
                    styles.hpFill,
                    {
                      width: `${baseHp}%`,
                      backgroundColor: baseHp > 40 ? '#10B981' : '#EF4444',
                    },
                  ]}
                />
              </View>
              <Text style={styles.hpValueText}>{baseHp}/100 HP</Text>
            </View>
          </View>
        </View>

        {/* Right / Bottom: Compact Energy Dashboard & Math Sockets */}
        <View style={[styles.dashboardWrapper, isDesktop && styles.dashboardWrapperDesktop]}>
          {/* Target Energy Header */}
          <View style={styles.targetBanner}>
            <View>
              <Text style={styles.targetSubhead}>NĂNG LƯỢNG MỤC TIÊU CỦA TRỤ:</Text>
              <Text style={styles.targetDescription}>
                Ghép các viên pha lê sao cho tổng bằng đúng mức này
              </Text>
            </View>
            <View style={styles.targetValueBadge}>
              <Text style={styles.targetValueText}>{problem.targetDisplay}</Text>
            </View>
          </View>

          {/* Live Equation Expression Bar */}
          <View style={styles.equationBar}>
            <Text style={styles.equationLabel}>BIỂU THỨC ĐANG GHÉP:</Text>
            <Text style={styles.equationContent}>
              {selectedPieces.length === 0 ? (
                <Text style={styles.equationEmpty}>
                  Chưa chọn mảnh nào. Hãy chạm các viên pha lê bên dưới!
                </Text>
              ) : (
                <Text style={styles.equationFormula}>
                  {selectedPieces.map((p) => p.display).join(' + ')}
                  {' = '}
                  <Text
                    style={{
                      color: isExactMatch ? colors.emerald : colors.amberDark,
                      fontWeight: '900',
                    }}
                  >
                    {roundedCurrentSum.toString().replace('.', ',')}
                  </Text>
                </Text>
              )}
            </Text>

            {/* Match Status Indicator */}
            {selectedPieces.length > 0 && (
              <View
                style={[
                  styles.statusPill,
                  isExactMatch
                    ? styles.statusPillMatch
                    : currentNumericSum > problem.targetNumeric
                    ? styles.statusPillOver
                    : styles.statusPillUnder,
                ]}
              >
                <Text style={styles.statusPillText}>
                  {isExactMatch
                    ? '✅ Khớp hoàn hảo! Sẵn sàng kích hoạt!'
                    : currentNumericSum > problem.targetNumeric
                    ? `⚠️ Đang thừa ${(
                        Math.round((currentNumericSum - problem.targetNumeric) * 100) / 100
                      )
                        .toString()
                        .replace('.', ',')}`
                    : `⚡ Còn thiếu ${(
                        Math.round((problem.targetNumeric - currentNumericSum) * 100) / 100
                      )
                        .toString()
                        .replace('.', ',')}`}
                </Text>
              </View>
            )}
          </View>

          {/* Feedback message banner */}
          {feedback && (
            <View
              style={[
                styles.feedbackBox,
                { backgroundColor: isSuccessFeedback ? colors.successBg : colors.errorBg },
              ]}
            >
              <Text
                style={[
                  styles.feedbackText,
                  { color: isSuccessFeedback ? colors.emeraldDark : colors.error },
                ]}
              >
                {feedback}
              </Text>
            </View>
          )}

          {/* Available Energy Crystals Grid */}
          <Text style={styles.crystalsHeader}>
            Kho Pha Lê Năng Lượng (Chạm để chọn / bỏ chọn):
          </Text>
          <View style={styles.crystalsGrid}>
            {problem.availablePieces.map((piece) => {
              const isSelected = selectedPieceIds.includes(piece.id);
              return (
                <TouchableOpacity
                  key={piece.id}
                  style={[
                    styles.crystalCard,
                    isSelected && styles.crystalCardSelected,
                  ]}
                  onPress={() => togglePiece(piece.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.crystalIconRing}>
                    <Text style={styles.crystalIcon}>💎</Text>
                  </View>
                  <Text
                    style={[
                      styles.crystalText,
                      isSelected && styles.crystalTextSelected,
                    ]}
                  >
                    {piece.display}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedCheck}>
                      <Text style={styles.selectedCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Trigger Laser Button (Bounded size) */}
          <TouchableOpacity
            style={[
              styles.chargeBtn,
              isExactMatch && styles.chargeBtnReady,
            ]}
            onPress={handleChargeTower}
            activeOpacity={0.8}
          >
            <Text style={styles.chargeBtnText}>
              ⚡ KÍCH HOẠT PHÁO NĂNG LƯỢNG
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Game Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Thủ Thành Năng Lượng"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          setBaseHp(100);
          setScore(0);
          setCorrectCount(0);
          setIncorrectCount(0);
          setSelectedPieceIds([]);
          setProblem(generateEnergyDefenseProblem(difficulty));
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
              🛡️ **Nhiệm vụ**: Bảo vệ Căn cứ Hoàng Gia khỏi quái vật vũ trụ trong 6 phút!
            </Text>
            <Text style={styles.tutText}>
              🔋 **Cơ chế**: Trụ pháo laser cần đúng mức năng lượng (ví dụ 1,5 hoặc 2 1/4).
            </Text>
            <Text style={styles.tutText}>
              🧩 **Cách chơi**: Chạm vào các viên pha lê để ghép thành tổng chính xác. Hệ thống chấp nhận **mọi tổ hợp hợp lệ**!
            </Text>
            <Text style={styles.tutText}>
              ⏳ **Mẹo**: Nếu cần thêm thời gian suy nghĩ, hãy bấm nút "Tạm dừng quái vật" ở góc trên bên phải để thong thả tính toán!
            </Text>
          </View>
        }
        resultData={{
          isWon: baseHp > 0,
          score,
          maxScore: 100,
          playtimeSeconds: elapsedSeconds,
          correctCount,
          incorrectCount,
          skillsPracticed: ['Cộng phân số', 'Cộng số thập phân', 'Ước lượng năng lượng'],
          explanation: problem.explanation,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  statPill: {
    backgroundColor: colors.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.amberDark,
  },
  mainLayout: {
    flex: 1,
    maxWidth: 1024,
    width: '100%',
    alignSelf: 'center',
  },
  mainLayoutDesktop: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  arenaWrapper: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  arenaWrapperDesktop: {
    flex: 1.2,
  },
  arenaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  diffSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  diffBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
  },
  diffBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A78BFA',
  },
  diffBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  diffBtnTextActive: {
    color: '#FFFFFF',
  },
  freezeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  freezeBtnActive: {
    backgroundColor: '#D97706',
  },
  freezeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  svgContainer: {
    position: 'relative',
    width: '100%',
  },
  baseHpBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  baseHpTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  hpTrack: {
    width: 90,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
  },
  hpValueText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'right',
  },
  dashboardWrapper: {
    flex: 1,
    padding: 14,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    margin: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  dashboardWrapperDesktop: {
    margin: 0,
    maxWidth: 440,
  },
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
    marginBottom: 10,
  },
  targetSubhead: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
  targetDescription: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  targetValueBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  targetValueText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  equationBar: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  equationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 4,
  },
  equationContent: {
    fontSize: 14,
  },
  equationEmpty: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  equationFormula: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statusPill: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusPillMatch: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusPillOver: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusPillUnder: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  feedbackBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  crystalsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  crystalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  crystalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#475569',
    position: 'relative',
    minWidth: 95,
  },
  crystalCardSelected: {
    backgroundColor: '#1E1B4B',
    borderColor: '#8B5CF6',
  },
  crystalIconRing: {
    marginRight: 6,
  },
  crystalIcon: {
    fontSize: 14,
  },
  crystalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  crystalTextSelected: {
    color: '#C4B5FD',
  },
  selectedCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  chargeBtn: {
    backgroundColor: '#475569',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  chargeBtnReady: {
    backgroundColor: '#10B981',
  },
  chargeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tutText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
});
