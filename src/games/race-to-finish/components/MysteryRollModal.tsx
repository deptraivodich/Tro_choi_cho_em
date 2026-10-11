import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, Animated, Easing, ScrollView } from 'react-native';
import { MysteryRollState, BonusEffectType, PenaltyEffectType, Player } from '../types/index';
import { BONUS_METADATA, PENALTY_METADATA } from '../logic/gameEngine';
import { reelPlan, REEL_CARD_WIDTH, REEL_STRIDE } from '../logic/reelPlan';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { RACE_ASSETS } from '../assets/index';
import { CLEANSE_CHOICE_MS } from '../state/turnTiming';

interface MysteryRollModalProps {
  visible: boolean; state: MysteryRollState | null; activePlayer: Player | null;
  paused: boolean; revealed: boolean; actionId: number; onSpinComplete: (id: number) => void;
  onUseCleanse: () => void;
}
export const MysteryRollModal: React.FC<MysteryRollModalProps> = ({
  visible, state, activePlayer, paused, revealed, actionId, onSpinComplete,
  onUseCleanse,
}) => {
  const [translateX] = useState(() => new Animated.Value(0));
  const [viewportWidth, setViewportWidth] = useState(0);
  const elapsed = useRef(0);
  const callback = useRef(onSpinComplete);
  useLayoutEffect(() => { callback.current = onSpinComplete; }, [onSpinComplete]);
  const reduced = useReducedMotion();
  const plan = useMemo(() => state ? reelPlan(state) : null, [state]);
  useEffect(() => { translateX.setValue(0); elapsed.current = 0; }, [state?.id, translateX]);
  useEffect(() => {
    if (!visible || !plan || !viewportWidth || paused || revealed) return;
    let alive = true;
    const start = Date.now();
    const totalDuration = reduced ? 180 : 2600;
    const animation = Animated.timing(translateX, {
      toValue: plan.targetX, duration: Math.max(80, totalDuration - elapsed.current),
      easing: Easing.bezier(0.15, 0, 0.1, 1), useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (alive && finished) callback.current(actionId);
    });
    return () => { alive = false; elapsed.current += Date.now() - start; animation.stop(); };
  }, [visible, plan, viewportWidth, paused, revealed, actionId, reduced, translateX]);
  if (!visible || !state || !activePlayer || !plan) return null;
  const isBonus = state.type === 'bonus';
  const isBot = activePlayer.isBot;
  const metadata = (key: BonusEffectType | PenaltyEffectType) => isBonus ? BONUS_METADATA[key as BonusEffectType] : PENALTY_METADATA[key as PenaltyEffectType];
  const resultMeta = metadata(state.result);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <ScrollView style={[styles.modalCard, isBonus ? styles.bonusCard : styles.penaltyCard]} contentContainerStyle={{ alignItems: 'center' }}>
          <View style={[styles.headerBanner, isBonus ? styles.bonusBanner : styles.penaltyBanner]}>
            <Text testID="mystery-title" style={styles.headerTitle}>
              {isBonus ? 'Ô Thưởng Bí Ẩn' : 'Ô Phạt Bí Ẩn'}
            </Text>
            <Text style={styles.headerSubtitle}>Các kết quả có thể nhận</Text>
          </View>
          <Text style={styles.possibleResults}>{plan.options.map(key => metadata(key).title).join(' • ')}</Text>
          <View testID="mystery-reel" style={styles.reelContainer} onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}>
            <View testID="mystery-pointer" style={styles.pointerNeedle}><View style={[styles.triangle, isBonus ? styles.bonusTriangle : styles.penaltyTriangle]} /></View>
            <Animated.View testID="mystery-reel-track" style={[styles.cardsRow, {
              left: viewportWidth / 2 - REEL_CARD_WIDTH / 2, width: plan.slots.length * REEL_STRIDE,
              transform: [{ translateX }],
            }]}>
              {plan.slots.map((key, slot) => {
                const meta = metadata(key);
                return <View key={slot} testID={revealed && slot === plan.targetSlot ? 'mystery-winning-item' : undefined}
                  style={[styles.reelCardItem, isBonus ? styles.bonusCardItem : styles.penaltyCardItem,
                    revealed && slot === plan.targetSlot && styles.selectedReelCardItem]}>
                  <Image source={RACE_ASSETS.items[meta.iconKey]} style={styles.cardIcon} resizeMode="contain" />
                  <Text style={styles.cardItemText}>{meta.title}</Text>
                </View>;
              })}
            </Animated.View>
          </View>
          <View style={styles.resultBannerBox}>
            <Text style={styles.resultLabel}>KẾT QUẢ</Text>
            <Text testID="mystery-result" style={[styles.resultTitle, isBonus ? styles.bonusResultText : styles.penaltyResultText]}>
              {revealed ? resultMeta.title : paused ? 'Tạm dừng' : 'Đang quay...'}
            </Text>
            <Text style={styles.resultDesc}>{revealed ? resultMeta.desc : reduced ? 'Đang chọn kết quả...' : 'Các thẻ đang quay và giảm tốc...'}</Text>
          </View>
          {revealed && state.hasShieldProtection && <View style={styles.shieldNotice}>
            <Image source={RACE_ASSETS.items.shield} style={styles.miniShieldIcon} />
            <Text style={styles.shieldNoticeText}>Khiên tự động bảo vệ và chặn hình phạt này!</Text>
          </View>}
          {!revealed ? <Text style={styles.spinningText}>Chờ vòng quay dừng...</Text> : <View style={styles.actionContainer}>
            {!isBonus && state.canUseCleanse && !isBot && <View style={styles.cleanseChoiceRow}>
              <TouchableOpacity testID="use-cleanse" disabled={isBot || paused} style={[styles.actionBtn, styles.useCleanseBtn]} onPress={onUseCleanse}>
                <Text style={styles.actionBtnText}>DÙNG NGÔI SAO HÓA GIẢI</Text>
              </TouchableOpacity>
              <Text style={styles.spinningText}>Tự áp dụng sau {CLEANSE_CHOICE_MS / 1000} giây nếu em không dùng sao.</Text>
            </View>}
            <Text style={styles.spinningText}>{paused ? 'Đang tạm dừng' : 'Kết quả sẽ được tự động áp dụng.'}</Text>
          </View>}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    flexGrow: 0,
    borderRadius: 24,
    borderWidth: 4,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20,
  },
  bonusCard: {
    backgroundColor: '#064E3B',
    borderColor: '#34D399',
  },
  penaltyCard: {
    backgroundColor: '#450A0A',
    borderColor: '#F87171',
  },
  headerBanner: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  bonusBanner: {
    backgroundColor: '#047857',
    borderWidth: 2,
    borderColor: '#6EE7B7',
  },
  penaltyBanner: {
    backgroundColor: '#991B1B',
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#E0E7FF',
    marginTop: 2,
    fontWeight: '600',
  },
  possibleResults: { color: '#FEF3C7', fontSize: 14, textAlign: 'center', marginBottom: 10 },
  reelContainer: { width: '100%', height: 152, overflow: 'hidden', marginBottom: 16, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12 },
  pointerNeedle: {
    position: 'absolute',
    top: -2,
    left: '50%',
    marginLeft: -10,
    zIndex: 10,
    alignItems: 'center',
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 0,
    borderTopWidth: 14,
  },
  bonusTriangle: {
    borderTopColor: '#FBBF24',
  },
  penaltyTriangle: {
    borderTopColor: '#F59E0B',
  },
  cardsRow: { position: 'absolute', top: 28, flexDirection: 'row' },
  reelCardItem: {
    width: REEL_CARD_WIDTH,
    marginRight: REEL_STRIDE - REEL_CARD_WIDTH,
    height: 110,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  bonusCardItem: {
    backgroundColor: '#065F46',
    borderColor: '#059669',
  },
  penaltyCardItem: {
    backgroundColor: '#7F1D1D',
    borderColor: '#B91C1C',
  },
  selectedReelCardItem: {
    borderColor: '#FDE047',
    borderWidth: 3,
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
  },
  cardIcon: {
    width: 44,
    height: 44,
    marginBottom: 6,
  },
  cardItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resultBannerBox: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 1,
    marginBottom: 2,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  bonusResultText: {
    color: '#065F46',
  },
  penaltyResultText: {
    color: '#991B1B',
  },
  resultDesc: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  shieldNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  miniShieldIcon: {
    width: 28,
    height: 28,
  },
  shieldNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  spinningNotice: {
    paddingVertical: 10,
  },
  spinningText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FEF08A',
  },
  actionBtn: {
    minHeight: 52,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cleanseChoiceRow: {
    width: '100%',
    flexDirection: 'column',
    gap: 8,
  },
  useCleanseBtn: {
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FCD34D',
    width: '100%',
  },
});
