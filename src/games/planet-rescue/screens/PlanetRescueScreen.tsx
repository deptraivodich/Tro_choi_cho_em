import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Circle, Rect, Path, G, Polygon, Line } from 'react-native-svg';
import { GameHeader } from '../../../shared/components/GameHeader';
import { GameModal } from '../../../shared/components/GameModal';
import { FractionView } from '../../../shared/components/FractionView';
import { colors, shadows } from '../../../shared/theme/colors';
import { soundManager } from '../../../shared/audio/audioController';
import { useGameTimer } from '../../../shared/hooks/useGameTimer';
import { generatePlanetRescueRooms, PlanetRescueRoom } from '../../../shared/math/generators';
import { simplifyFraction, gcd, Fraction } from '../../../shared/math/fraction';
import { profileManager } from '../../../shared/storage/profileManager';
import { GameSessionResult } from '../../../shared/types/index';

type CardType = 'simplify' | 'common_denom' | 'laser_attack';

interface ActionCard {
  id: string;
  type: CardType;
  title: string;
  desc: string;
  icon: string;
}

export const PlanetRescueScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [rooms, setRooms] = useState<PlanetRescueRoom[]>(() => generatePlanetRescueRooms('easy'));
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);

  // Player & Boss State
  const [playerHp, setPlayerHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);
  const [shieldActive, setShieldActive] = useState(true);
  const [currentShieldFraction, setCurrentShieldFraction] = useState<Fraction>(
    rooms[0].shieldFraction
  );

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    const newRooms = generatePlanetRescueRooms(newDiff);
    setRooms(newRooms);
    setCurrentRoomIndex(0);
    setCurrentShieldFraction(newRooms[0].shieldFraction);
    setShieldActive(true);
    setBossHp(100);
    setActiveCardType(null);
    setFeedback(null);
  };

  // Math interaction state
  const [activeCardType, setActiveCardType] = useState<CardType | null>(null);
  const [selectedDivisor, setSelectedDivisor] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Run Stats
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  const { elapsedSeconds, isPaused, pause, resume, reset } = useGameTimer({
    initialSeconds: 0,
    autoStart: true,
  });

  const currentRoom = rooms[currentRoomIndex];

  // Save/Restore run progress
  useEffect(() => {
    profileManager.getGameState<{ roomIndex: number; score: number }>(
      'planet-rescue',
      'local-learner-sandbox-01',
      { roomIndex: 0, score: 0 }
    ).then((saved) => {
      if (saved && saved.roomIndex < rooms.length) {
        setCurrentRoomIndex(saved.roomIndex);
        setCurrentShieldFraction(rooms[saved.roomIndex].shieldFraction);
        setScore(saved.score);
      }
    });
  }, [rooms]);

  const cards: ActionCard[] = [
    {
      id: 'c1',
      type: 'simplify',
      title: 'Thẻ Rút Gọn',
      desc: 'Chia cả tử và mẫu cho ước số chung',
      icon: '✂️',
    },
    {
      id: 'c2',
      type: 'common_denom',
      title: 'Thẻ Quy Đồng',
      desc: 'Nhân cả tử và mẫu với thừa số phụ',
      icon: '🔄',
    },
    {
      id: 'c3',
      type: 'laser_attack',
      title: 'Pháo Năng Lượng',
      desc: 'Tấn công xuyên giáp khi đúng mẫu số',
      icon: '🚀',
    },
  ];

  const handleCardClick = (card: ActionCard) => {
    soundManager.playTap();
    setActiveCardType(card.type);
    setSelectedDivisor(null);
    setFeedback(null);
  };

  const handleApplySimplify = (divisor: number) => {
    setSelectedDivisor(divisor);
    const targetGcd = gcd(currentRoom.shieldFraction.num, currentRoom.shieldFraction.den);

    if (divisor === targetGcd) {
      soundManager.playCorrect();
      setIsSuccess(true);
      const simplified = simplifyFraction(currentRoom.shieldFraction);
      setCurrentShieldFraction(simplified);
      setShieldActive(false);
      setScore((s) => s + 30);
      setCorrectCount((c) => c + 1);
      setFeedback(
        `🎉 Tuyệt vời! Rút gọn ${currentRoom.shieldFraction.num}/${currentRoom.shieldFraction.den} cho ${divisor} = ${simplified.num}/${simplified.den}. Khiên đã bị vô hiệu hóa!`
      );
    } else {
      soundManager.playIncorrect();
      setIsSuccess(false);
      setIncorrectCount((c) => c + 1);
      setFeedback(
        `Chưa chính xác: ${divisor} chưa phải là ước chung để rút gọn tối giản phân số này. Em hãy tìm số mà cả tử và mẫu đều chia hết nhé!`
      );
    }
  };

  const handleAttack = () => {
    if (shieldActive) {
      soundManager.playIncorrect();
      setIsSuccess(false);
      setFeedback('⚠️ Khiên lượng tử của hành tinh vẫn còn! Em cần dùng Thẻ Rút Gọn để phá khiên trước.');
      return;
    }

    soundManager.playCorrect();
    setIsSuccess(true);
    setScore((s) => s + 50);
    setCorrectCount((c) => c + 1);
    setBossHp((hp) => Math.max(0, hp - 50));

    if (currentRoomIndex + 1 < rooms.length) {
      setFeedback('💥 Tấn công trúng đích! Hành tinh đã được giải cứu. Đang tiến đến phòng tiếp theo...');
      setTimeout(() => {
        const nextIdx = currentRoomIndex + 1;
        setCurrentRoomIndex(nextIdx);
        setCurrentShieldFraction(rooms[nextIdx].shieldFraction);
        setShieldActive(true);
        setBossHp(100);
        setActiveCardType(null);
        setFeedback(null);
        profileManager.setGameState('planet-rescue', 'local-learner-sandbox-01', {
          roomIndex: nextIdx,
          score: score + 50,
        });
      }, 1500);
    } else {
      // Completed all rooms!
      finishGame(true);
    }
  };

  const finishGame = async (isWon: boolean) => {
    pause();
    soundManager.playVictory();
    const result: GameSessionResult = {
      sessionId: `pr-${Date.now()}`,
      gameId: 'planet-rescue',
      profileId: 'local-learner-sandbox-01',
      difficulty: 'medium',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon,
      score: score + 100,
      maxScore: 350,
      correctCount,
      incorrectCount,
      skillsPracticed: ['Rút gọn phân số', 'Ước chung lớn nhất', 'Quy đồng mẫu số'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    // Reset saved room
    await profileManager.setGameState('planet-rescue', 'local-learner-sandbox-01', {
      roomIndex: 0,
      score: 0,
    });
    setModalType('result');
  };

  const isExitingRef = useRef(false);

  const handleScreenExit = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    pause();
    onExit();
  }, [pause, onExit]);

  return (
    <View style={styles.container}>
      <GameHeader
        title="Giải Cứu Hành Tinh"
        topicBadge="Rút gọn & quy đồng phân số"
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
              🪐 Phòng {currentRoom.roomNumber}/{rooms.length}
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

        {/* Room Map Progress Dots */}
        <View style={styles.roomMap}>
          {rooms.map((r, idx) => (
            <React.Fragment key={r.roomNumber}>
              <View
                style={[
                  styles.roomNode,
                  idx < currentRoomIndex && styles.roomNodeDone,
                  idx === currentRoomIndex && styles.roomNodeCurrent,
                ]}
              >
                <Text style={styles.roomNodeText}>{r.roomNumber}</Text>
              </View>
              {idx < rooms.length - 1 && <View style={styles.roomLine} />}
            </React.Fragment>
          ))}
        </View>

        {/* 2D Space Battlefield */}
        <View style={styles.spaceArena}>
          <Svg width="100%" height={170} viewBox="0 0 340 170">
            {/* Stars background */}
            <Circle cx="40" cy="30" r="1.5" fill="#FFFFFF" opacity="0.8" />
            <Circle cx="120" cy="50" r="1" fill="#FFFFFF" opacity="0.6" />
            <Circle cx="220" cy="20" r="1.5" fill="#FFFFFF" opacity="0.9" />
            <Circle cx="300" cy="60" r="1" fill="#FFFFFF" opacity="0.7" />

            {/* Player Battleship (Left) */}
            <G transform="translate(40, 75)">
              <Polygon points="0,15 45,0 45,30" fill="#3B82F6" />
              <Polygon points="10,15 35,5 35,25" fill="#60A5FA" />
              <Circle cx="32" cy="15" r="4" fill="#FFFFFF" />
              {/* Engine flame */}
              <Polygon points="0,10 -15,15 0,20" fill="#F59E0B" />
            </G>

            {/* Enemy Alien Planet Boss (Right) */}
            <G transform="translate(240, 75)">
              <Circle cx="20" cy="15" r="32" fill="#7C3AED" />
              <Circle cx="10" cy="5" r="8" fill="#A855F7" />
              <Circle cx="28" cy="25" r="6" fill="#A855F7" />

              {/* Shield Ring around Boss */}
              {shieldActive && (
                <Circle
                  cx="20"
                  cy="15"
                  r="42"
                  stroke="#F59E0B"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  fill="none"
                />
              )}
            </G>
          </Svg>

          {/* Enemy Shield Info Floating Box */}
          <View style={styles.bossCard}>
            <Text style={styles.bossName}>{currentRoom.roomName}</Text>
            <View style={styles.shieldRow}>
              <Text style={styles.shieldTitle}>
                {shieldActive ? '🛡️ Khiên năng lượng:' : '🔓 Khiên đã phá:'}
              </Text>
              <View style={styles.shieldFractionBadge}>
                <FractionView
                  numerator={currentShieldFraction.num}
                  denominator={currentShieldFraction.den}
                  size="sm"
                  color={shieldActive ? colors.amberDark : colors.emeraldDark}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Feedback message banner */}
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

        {/* Action Card Selection */}
        <Text style={styles.sectionHeader}>Chọn thẻ chiến thuật của phi thuyền:</Text>
        <View style={styles.cardDeck}>
          {cards.map((c) => {
            const isSelected = activeCardType === c.type;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.tacticalCard, isSelected && styles.tacticalCardSelected]}
                onPress={() => handleCardClick(c)}
                activeOpacity={0.8}
              >
                <Text style={styles.cardIcon}>{c.icon}</Text>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardDesc}>{c.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Interactive Math Options for Selected Card */}
        {activeCardType === 'simplify' && (
          <View style={styles.actionPanel}>
            <Text style={styles.panelTitle}>
              Chọn số chia để rút gọn phân số {currentRoom.shieldFraction.num}/{currentRoom.shieldFraction.den}:
            </Text>
            <View style={styles.numberOptionsRow}>
              {[2, 3, 4, 5, 6, 7].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.numBtn,
                    selectedDivisor === num && styles.numBtnSelected,
                  ]}
                  onPress={() => handleApplySimplify(num)}
                >
                  <Text
                    style={[
                      styles.numBtnText,
                      selectedDivisor === num && styles.numBtnTextSelected,
                    ]}
                  >
                    Chia {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {activeCardType === 'laser_attack' && (
          <View style={styles.actionPanel}>
            <Text style={styles.panelTitle}>
              {currentRoom.attackConditionText}
            </Text>
            <TouchableOpacity
              style={[styles.attackExecuteBtn, !shieldActive && { backgroundColor: colors.emerald }]}
              onPress={handleAttack}
            >
              <Text style={styles.attackExecuteBtnText}>
                🚀 PHÓNG TIA PHÂN SỐ XUYÊN GIÁP
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Giải Cứu Hành Tinh"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          setCurrentRoomIndex(0);
          setCurrentShieldFraction(rooms[0].shieldFraction);
          setShieldActive(true);
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
              🪐 **Cốt truyện**: Giải cứu 5 trạm không gian khỏi khiên lượng tử của hắc ám!
            </Text>
            <Text style={styles.tutText}>
              ✂️ **Rút gọn phân số**: Khiên địch có dạng phân số chưa tối giản (như 8/12). Em dùng Thẻ Rút Gọn, chọn đúng ước chung lớn nhất (chia cho 4) để rút gọn về 2/3.
            </Text>
            <Text style={styles.tutText}>
              🚀 **Bắn pháo**: Sau khi khiên bị hạ, dùng Thẻ Phóng Pháo để tiêu diệt mục tiêu và bay sang hành tinh tiếp theo!
            </Text>
            <Text style={styles.tutText}>
              💾 **Tự động lưu**: Tiến độ giữa các phòng được lưu lại, em có thể tiếp tục chơi bất cứ lúc nào.
            </Text>
          </View>
        }
        resultData={{
          isWon: true,
          score,
          maxScore: 350,
          playtimeSeconds: elapsedSeconds,
          correctCount,
          incorrectCount,
          skillsPracticed: ['Rút gọn phân số', 'Tìm ước chung lớn nhất', 'Chiến thuật theo lượt'],
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
    marginBottom: 14,
  },
  diffBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  diffBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  diffBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  diffBtnTextActive: {
    color: colors.white,
  },
  roomMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  roomNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomNodeDone: {
    backgroundColor: colors.emerald,
  },
  roomNodeCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.sm,
  },
  roomNodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  roomLine: {
    width: 24,
    height: 3,
    backgroundColor: colors.surfaceAlt,
  },
  spaceArena: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  bossCard: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bossName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shieldTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  shieldFractionBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  cardDeck: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tacticalCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    alignItems: 'center',
    ...shadows.sm,
  },
  tacticalCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  actionPanel: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  numberOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
  },
  numBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  numBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  numBtnTextSelected: {
    color: colors.white,
  },
  attackExecuteBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  attackExecuteBtnText: {
    color: colors.white,
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
