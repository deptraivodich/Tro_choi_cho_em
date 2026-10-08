import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect, Path, Circle, Polygon, G } from 'react-native-svg';
import { GameHeader } from '../../components/GameHeader';
import { GameModal } from '../../components/GameModal';
import { colors, shadows } from '../../theme/colors';
import { soundManager } from '../../core/audioController';
import { useGameTimer } from '../../core/game-loop/useGameTimer';
import {
  MassUnit,
  MASS_UNIT_NAMES,
  convertMass,
  calculateFloatingMarketTrade,
  formatVND,
} from '../../core/math/units';
import { profileManager } from '../../storage/profileManager';
import { GameSessionResult } from '../../types';

import {
  generateFloatingMarketDeals,
  MarketDeal,
} from '../../core/math/generators';

export const FloatingMarketScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | 'result' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  // Merchant Wallet & Boat Cargo State
  const [walletVND, setWalletVND] = useState(25_000_000); // 25 million VND capital
  const [boatCapacityKg] = useState(3000); // 3,000 kg capacity
  const [isTestMode, setIsTestMode] = useState(false);

  const [deals, setDeals] = useState<MarketDeal[]>(() => generateFloatingMarketDeals('easy'));
  const [currentDealIndex, setCurrentDealIndex] = useState(0);
  const currentDeal = deals[currentDealIndex];

  const handleDifficultyChange = (newDiff: 'easy' | 'medium' | 'hard') => {
    soundManager.playTap();
    setDifficulty(newDiff);
    const newDeals = generateFloatingMarketDeals(newDiff);
    setDeals(newDeals);
    setCurrentDealIndex(0);
    setUserConvertedKg(null);
    setTradeSummary(null);
    setFeedback(null);
  };

  // User Math Input
  const [userConvertedKg, setUserConvertedKg] = useState<number | null>(null);
  const [userRetailPrice, setUserRetailPrice] = useState(currentDeal.suggestedRetailPricePerKg);
  const [tradeSummary, setTradeSummary] = useState<{
    cost: number;
    revenue: number;
    profit: number;
  } | null>(null);

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

  const correctKg = convertMass(
    currentDeal.wholesaleQty,
    currentDeal.wholesaleUnit,
    currentDeal.retailUnit
  );

  const conversionOptions = [
    correctKg,
    correctKg * 10,
    correctKg / 10,
    correctKg + 200,
  ].sort(() => Math.random() - 0.5);

  const handleSelectConversion = (kg: number) => {
    soundManager.playTap();
    setUserConvertedKg(kg);
    setFeedback(null);
  };

  const handleExecuteTrade = () => {
    if (userConvertedKg === null) {
      setFeedback('Em hãy quy đổi khối lượng nông sản sang kg trước nhé!');
      return;
    }

    if (userConvertedKg !== correctKg) {
      soundManager.playIncorrect();
      setIsSuccess(false);
      setIncorrectCount((c) => c + 1);
      setFeedback(
        `Phép đổi chưa chính xác. 1 ${MASS_UNIT_NAMES[currentDeal.wholesaleUnit]} = ${convertMass(1, currentDeal.wholesaleUnit, 'kg')} kg. Vậy ${currentDeal.wholesaleQty} ${MASS_UNIT_NAMES[currentDeal.wholesaleUnit]} = ${correctKg} kg.`
      );
      return;
    }

    // Check boat capacity
    if (correctKg > boatCapacityKg) {
      soundManager.playIncorrect();
      setIsSuccess(false);
      setFeedback(`Khối lượng ${correctKg} kg vượt quá sức chứa ${boatCapacityKg} kg của ghe thuyền!`);
      return;
    }

    // Calculate trade result
    const result = calculateFloatingMarketTrade({
      buyPricePerUnit: currentDeal.buyPricePerWholesale,
      quantityBought: currentDeal.wholesaleQty,
      massUnit: currentDeal.wholesaleUnit,
      transportFee: currentDeal.transportFee,
      sellPricePerRetailUnit: userRetailPrice,
      retailUnit: 'kg',
    });

    if (result.totalCost > walletVND) {
      soundManager.playIncorrect();
      setIsSuccess(false);
      setFeedback('Tổng chi phí mua và vận chuyển vượt quá số vốn hiện có của em!');
      return;
    }

    soundManager.playVictory();
    setIsSuccess(true);
    setTradeSummary({
      cost: result.totalCost,
      revenue: result.totalRevenue,
      profit: result.profitOrLoss,
    });

    setWalletVND((v) => v + result.profitOrLoss);
    setScore((s) => s + 50);
    setCorrectCount((c) => c + 1);

    setFeedback(
      `🎉 Chuyến buôn thắng lớn! Doanh thu: ${formatVND(result.totalRevenue)}, Lợi nhuận ròng: ${formatVND(result.profitOrLoss)}.`
    );
  };

  const handleNextDeal = () => {
    soundManager.playTap();
    if (currentDealIndex + 1 < deals.length) {
      setCurrentDealIndex((i) => i + 1);
      setUserConvertedKg(null);
      setTradeSummary(null);
      setFeedback(null);
    } else {
      finishGame();
    }
  };

  const finishGame = async () => {
    pause();
    soundManager.playVictory();
    const result: GameSessionResult = {
      sessionId: `fm-${Date.now()}`,
      gameId: 'floating-market',
      profileId: 'local-learner-sandbox-01',
      difficulty: 'medium',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: elapsedSeconds,
      isWon: true,
      score,
      maxScore: 200,
      correctCount,
      incorrectCount,
      skillsPracticed: ['Đổi đơn vị khối lượng (tấn, tạ, kg)', 'Tính doanh thu & lợi nhuận', 'Quản lý tài chính'],
      schemaVersion: 1,
    };
    await profileManager.saveSessionResult(result);
    setModalType('result');
  };

  return (
    <View style={styles.container}>
      <GameHeader
        title="Thương Nhân Chợ Nổi"
        topicBadge="Khối lượng & Lợi nhuận"
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
            <Text style={styles.statPillText}>💰 {formatVND(walletVND)}</Text>
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

        {/* River Boat Visual */}
        <View style={styles.riverArena}>
          <Svg width="100%" height={140} viewBox="0 0 340 140">
            {/* Water */}
            <Rect x="0" y="0" width="340" height="140" fill="#BAE6FD" />
            <Path d="M0 60 Q 90 40 180 60 T 360 60 L360 140 L0 140 Z" fill="#7DD3FC" />

            {/* Wooden Mekong Boat */}
            <G transform="translate(100, 45)">
              <Path d="M 0 35 Q 70 50 140 35 L 125 55 Q 70 65 15 55 Z" fill="#92400E" />
              {/* Boat Roof Canopy */}
              <Polygon points="25,15 115,15 125,35 15,35" fill="#F59E0B" />
              {/* Cargo Boxes / Watermelons */}
              <Circle cx="50" cy="30" r="8" fill="#15803D" />
              <Circle cx="65" cy="28" r="7" fill="#16A34A" />
              <Circle cx="80" cy="31" r="8" fill="#15803D" />
            </G>
          </Svg>

          <View style={styles.boatStatsTag}>
            <Text style={styles.boatStatsText}>
              🚤 Sức chứa kho thuyền: {boatCapacityKg} kg
            </Text>
          </View>
        </View>

        {/* Current Deal Information */}
        <View style={styles.dealCard}>
          <Text style={styles.dealTitle}>
            🌾 Mặt hàng: {currentDeal.produceName}
          </Text>
          <View style={styles.dealRow}>
            <Text style={styles.dealLabel}>Khối lượng nhập kho:</Text>
            <Text style={styles.dealHighlight}>
              {currentDeal.wholesaleQty} {MASS_UNIT_NAMES[currentDeal.wholesaleUnit]}
            </Text>
          </View>
          <View style={styles.dealRow}>
            <Text style={styles.dealLabel}>Giá mua sỉ cả lô:</Text>
            <Text style={styles.dealVal}>{formatVND(currentDeal.buyPricePerWholesale)}</Text>
          </View>
          <View style={styles.dealRow}>
            <Text style={styles.dealLabel}>Phí vận chuyển ghe:</Text>
            <Text style={styles.dealVal}>{formatVND(currentDeal.transportFee)}</Text>
          </View>
        </View>

        {/* Step 1: Unit Conversion */}
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>
            Bước 1: Đổi {currentDeal.wholesaleQty} {MASS_UNIT_NAMES[currentDeal.wholesaleUnit]} sang {currentDeal.retailUnit}:
          </Text>
          <View style={styles.conversionGrid}>
            {conversionOptions.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionBtn,
                  userConvertedKg === opt && styles.optionBtnSelected,
                ]}
                onPress={() => handleSelectConversion(opt)}
              >
                <Text
                  style={[
                    styles.optionBtnText,
                    userConvertedKg === opt && styles.optionBtnTextSelected,
                  ]}
                >
                  {opt.toLocaleString('vi-VN')} kg
                </Text>
              </TouchableOpacity>
            ))}
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

        {/* Trade Result Summary */}
        {tradeSummary ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Báo Cáo Chuyến Buôn:</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng chi phí:</Text>
              <Text style={styles.summaryVal}>{formatVND(tradeSummary.cost)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng doanh thu bán lẻ:</Text>
              <Text style={styles.summaryVal}>{formatVND(tradeSummary.revenue)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Lợi nhuận ròng:</Text>
              <Text style={[styles.summaryVal, { color: colors.emerald, fontWeight: '900' }]}>
                +{formatVND(tradeSummary.profit)}
              </Text>
            </View>

            <TouchableOpacity style={styles.nextDealBtn} onPress={handleNextDeal}>
              <Text style={styles.nextDealBtnText}>
                {currentDealIndex + 1 < deals.length
                  ? 'Giong thuyền sang chuyến tiếp theo ➔'
                  : '🏆 Hoàn thành ngày họp chợ!'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.tradeBtn} onPress={handleExecuteTrade}>
            <Text style={styles.tradeBtnText}>⚖️ BÁN HÀNG VÀ TÍNH LỢI NHUẬN</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modals */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Thương Nhân Chợ Nổi"
        onResume={() => {
          resume();
          setModalType(null);
        }}
        onRestart={() => {
          reset();
          setCurrentDealIndex(0);
          setUserConvertedKg(null);
          setTradeSummary(null);
          setWalletVND(25_000_000);
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
              🛶 **Bảng quy đổi khối lượng**:
              - 1 tấn = 10 tạ = 100 yến = 1.000 kg.
              - 1 tạ = 100 kg.
              - 1 yến = 10 kg.
              - 1 kg = 1.000 g.
            </Text>
            <Text style={styles.tutText}>
              💰 **Tính lợi nhuận**:
              - Tổng chi phí = Giá mua sỉ + Phí vận chuyển ghe.
              - Doanh thu = Số lượng (kg) × Giá bán lẻ mỗi kg.
              - Lợi nhuận = Doanh thu - Tổng chi phí.
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
          skillsPracticed: ['Đổi tấn - tạ - kg', 'Tính doanh thu bán lẻ', 'Tính lời / lỗ'],
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
    backgroundColor: colors.teal,
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
  riverArena: {
    backgroundColor: '#BAE6FD',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  boatStatsTag: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  boatStatsText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dealCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
    ...shadows.sm,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  dealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  dealLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dealHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  dealVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  conversionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    minWidth: 120,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    borderRadius: 10,
    alignItems: 'center',
  },
  optionBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  optionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionBtnTextSelected: {
    color: colors.white,
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
  tradeBtn: {
    backgroundColor: colors.emerald,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 8,
    ...shadows.md,
  },
  tradeBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.emeraldDark,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  nextDealBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  nextDealBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  tutText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
});
