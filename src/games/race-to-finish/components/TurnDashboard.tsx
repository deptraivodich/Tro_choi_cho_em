import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Player, GamePhase, CHARACTERS_META } from '../types/index';
import { RACE_ASSETS } from '../assets/index';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface TurnDashboardProps {
  activePlayer: Player;
  currentDiceValue: number;
  gamePhase: GamePhase;
  logMessage: string;
  onRollPress: () => void;
  paused: boolean;
}

export const TurnDashboard: React.FC<TurnDashboardProps> = ({
  activePlayer,
  currentDiceValue,
  gamePhase,
  logMessage,
  onRollPress, paused,
}) => {
  const meta = CHARACTERS_META[activePlayer.character];
  const avatarSource = RACE_ASSETS.characters[activePlayer.character].avatar;

  // Dice roll animation (rotation and scale bounce)
  const [shakeAnim] = useState(() => new Animated.Value(0));
  const [displayDiceVal, setDisplayDiceVal] = useState(currentDiceValue || 3);

  const reduced = useReducedMotion();
  const isRolling = gamePhase === 'rolling' && !paused;
  const canRoll = gamePhase === 'ready_to_roll' && !activePlayer.isBot && !paused;

  useEffect(() => {
    if (isRolling && !reduced) {
      // Rapidly flicker dice values during 0.7s roll
      const interval = setInterval(() => {
        setDisplayDiceVal(value => value % 6 + 1);
      }, 70);

      const animation = Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]);
      animation.start();

      return () => { clearInterval(interval); animation.stop(); };
    }
    shakeAnim.setValue(0);
  }, [isRolling, currentDiceValue, reduced, shakeAnim]);

  const spin = shakeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-22deg', '0deg', '22deg'] });
  const lift = shakeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [-6, 0, -6] });
  const scale = shakeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.12, 1, 1.12] });
  const diceImageSource =
    RACE_ASSETS.dice[(isRolling && !reduced ? displayDiceVal : currentDiceValue) as 1 | 2 | 3 | 4 | 5 | 6] || RACE_ASSETS.dice[3];

  return (
    <View testID="turn-dashboard" style={styles.container}>
      <View style={styles.turnRow}>
        <View style={[styles.avatarCircle, { borderColor: meta.borderColor }]}>
          <Image source={avatarSource} style={styles.avatarImg} resizeMode="contain" />
        </View>
        <Text testID="active-turn-label" style={styles.turnLabelText} numberOfLines={1}>
          {activePlayer.isBot ? `Lượt máy: ${activePlayer.name}` : `Lượt của ${activePlayer.name}`}
        </Text>
        <View style={styles.inventorySection} accessibilityLabel="Vật phẩm đang giữ">
          {activePlayer.hasShield && <View style={styles.item}>
            <Image source={RACE_ASSETS.items.shield} style={styles.invItemIcon} />
            <Text style={styles.itemCount}>1</Text>
          </View>}
          {activePlayer.cleanseCount > 0 && <View style={styles.item}>
            <Image source={RACE_ASSETS.items.cleanse} style={styles.invItemIcon} />
            <Text style={styles.itemCount}>{activePlayer.cleanseCount}</Text>
          </View>}
          {!activePlayer.hasShield && activePlayer.cleanseCount === 0 &&
            <Text style={styles.emptyInvText}>Vật phẩm: 0</Text>}
        </View>
      </View>

      <View style={styles.dashboardRow}>
        <Animated.View testID="animated-dice" style={[styles.diceBox,
          { transform: [{ rotate: spin }, { translateY: lift }, { scale }] }]}>
          <Image testID="dice-face" accessibilityLabel={`Xúc xắc ${isRolling && !reduced ? displayDiceVal : currentDiceValue}`}
            source={diceImageSource} style={styles.diceImage} resizeMode="contain" />
        </Animated.View>
        <View style={styles.actionSection}>
          <TouchableOpacity style={[styles.rollButton, !canRoll && styles.rollButtonDisabled]}
            onPress={onRollPress} disabled={!canRoll} activeOpacity={0.8}
            accessibilityLabel="roll-dice-button" testID="roll-dice-button">
            <Text style={styles.rollButtonText}>
              {paused ? 'Đang tạm dừng' : isRolling ? 'Đang lắc xúc xắc…'
                : ['moving', 'applying_effect'].includes(gamePhase) ? 'Đang di chuyển…'
                : activePlayer.isBot ? 'Máy đang chơi…' : 'ĐỔ XÚC XẮC'}
            </Text>
          </TouchableOpacity>
          <Text testID="dice-result" style={styles.resultText}>
            {gamePhase === 'ready_to_roll' ? 'Giải toán đúng để di chuyển'
              : gamePhase === 'rolling' ? 'Chờ xúc xắc dừng'
              : `Kết quả: ${currentDiceValue} • Giải toán đúng để đi`}
          </Text>
        </View>
      </View>
      <Text style={styles.tickerText} numberOfLines={2} accessibilityLiveRegion="polite">
        {logMessage || 'Bấm “ĐỔ XÚC XẮC” để bắt đầu lượt!'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8E7BC', borderRadius: 18, borderWidth: 2, borderColor: '#A66B25',
    paddingHorizontal: 10, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 8,
  },
  turnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImg: { width: 28, height: 28, borderRadius: 14 },
  turnLabelText: { flex: 1, fontSize: 12, fontWeight: '900', color: '#78350F' },
  inventorySection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  item: { flexDirection: 'row', alignItems: 'center' },
  invItemIcon: { width: 24, height: 24 },
  itemCount: { fontSize: 11, fontWeight: '900', color: '#92400E' },
  emptyInvText: { fontSize: 10, color: '#92400E' },
  dashboardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  diceBox: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  diceImage: { width: 56, height: 56 },
  actionSection: { flex: 1, alignItems: 'stretch' },
  rollButton: {
    backgroundColor: '#059669', borderRadius: 16, borderWidth: 2, borderColor: '#047857',
    minHeight: 48, paddingHorizontal: 8, paddingVertical: 8,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#065F46', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  rollButtonDisabled: { backgroundColor: '#9CA3AF', borderColor: '#6B7280', shadowOpacity: 0.1 },
  rollButtonText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
  resultText: { fontSize: 10, fontWeight: '700', color: '#92400E', textAlign: 'center', marginTop: 3 },
  tickerText: { fontSize: 11, fontWeight: '700', color: '#78350F', lineHeight: 15, marginTop: 5 },
});
