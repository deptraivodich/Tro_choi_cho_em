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
    } else {
      shakeAnim.setValue(0);
    }
  }, [isRolling, currentDiceValue, reduced, shakeAnim]);

  const spin = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  const diceImageSource =
    RACE_ASSETS.dice[(isRolling && !reduced ? displayDiceVal : currentDiceValue) as 1 | 2 | 3 | 4 | 5 | 6] || RACE_ASSETS.dice[3];

  return (
    <View style={styles.container}>
      {/* Upper Dashboard: Avatar | Dice & Roll Button | Item Pouch */}
      <View style={styles.dashboardRow}>
        {/* Left: Active Player Card */}
        <View style={styles.playerSection}>
          <View style={[styles.avatarCircle, { borderColor: meta.borderColor }]}>
            <Image source={avatarSource} style={styles.avatarImg} resizeMode="contain" />
          </View>
          <View style={styles.turnLabelPill}>
            <Text style={styles.turnLabelText} numberOfLines={1}>
              {activePlayer.isBot ? `Máy: ${activePlayer.name}` : `Lượt của ${activePlayer.name}`}
            </Text>
          </View>
        </View>

        {/* Center: Animated 3D Dice & Action Button */}
        <View style={styles.centerSection}>
          {/* Animated 3D Dice */}
          <Animated.View style={[styles.diceBox, { transform: [{ rotate: spin }] }]}>
            <Image source={diceImageSource} style={styles.diceImage} resizeMode="contain" />
          </Animated.View>

          {/* Roll Button */}
          <TouchableOpacity
            style={[
              styles.rollButton,
              (!canRoll || isRolling) && styles.rollButtonDisabled,
            ]}
            onPress={onRollPress}
            disabled={!canRoll || isRolling}
            activeOpacity={0.8}
            accessibilityLabel="roll-dice-button"
            testID="roll-dice-button"
          >
            <Text style={styles.rollButtonText}>
              {isRolling
                ? 'Đang lắc xúc xắc...'
                : gamePhase === 'moving'
                ? 'Đang di chuyển...'
                : activePlayer.isBot
                ? 'Máy đang chơi...'
                : 'ĐỔ XÚC XẮC'}
            </Text>
          </TouchableOpacity>

          {/* Rule Reminder Pill */}
          <View style={styles.rulePill}>
            <Text style={styles.rulePillText}>Giải toán đúng để di chuyển</Text>
          </View>
        </View>

        {/* Right: Item Inventory Pouch */}
        <View style={styles.inventorySection}>
          <Text style={styles.invTitle}>Vật phẩm</Text>
          <View style={styles.invRow}>
            {activePlayer.hasShield && (
              <View style={styles.invSlot}>
                <Image source={RACE_ASSETS.items.shield} style={styles.invItemIcon} />
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>1</Text>
                </View>
              </View>
            )}
            {activePlayer.cleanseCount > 0 && (
              <View style={styles.invSlot}>
                <Image source={RACE_ASSETS.items.cleanse} style={styles.invItemIcon} />
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{activePlayer.cleanseCount}</Text>
                </View>
              </View>
            )}
            {!activePlayer.hasShield && activePlayer.cleanseCount === 0 && (
              <View style={styles.invSlot}>
                <Text style={styles.emptyInvText}>Trống</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Live Ticker Log Announcement */}
      <View style={styles.tickerBar}>
        <Text style={styles.tickerIcon}>📢</Text>
        <Text style={styles.tickerText} numberOfLines={2}>
          {logMessage || 'Bấm "ĐỔ XÚC XẮC" để bắt đầu lượt chạy đua!'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 2,
    borderColor: '#D97706',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  dashboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerSection: {
    alignItems: 'center',
    width: 90,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  turnLabelPill: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    maxWidth: 95,
  },
  turnLabelText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  diceBox: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  diceImage: {
    width: 56,
    height: 56,
  },
  rollButton: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#047857',
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    minWidth: 140,
    alignItems: 'center',
  },
  rollButtonDisabled: {
    backgroundColor: '#9CA3AF',
    borderColor: '#6B7280',
    shadowOpacity: 0.1,
  },
  rollButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  rulePill: {
    marginTop: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rulePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  inventorySection: {
    alignItems: 'center',
    width: 70,
  },
  invTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 2,
  },
  invRow: {
    flexDirection: 'row',
    gap: 6,
  },
  invSlot: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D97706',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  itemSlotContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invItemIcon: {
    width: 34,
    height: 34,
  },
  countBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#D97706',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emptyInvText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  tickerBar: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tickerIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  tickerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    lineHeight: 15,
  },
});
