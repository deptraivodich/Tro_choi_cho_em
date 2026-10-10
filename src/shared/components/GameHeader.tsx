import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, shadows } from '../theme/colors';
import { soundManager } from '../audio/audioController';

interface GameHeaderProps {
  title: string;
  topicBadge?: string;
  onPause: () => void;
  onHelp: () => void;
  onExit: () => void;
  extraStats?: React.ReactNode;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  title,
  topicBadge,
  onPause,
  onHelp,
  onExit,
  extraStats,
}) => {
  const [soundOn, setSoundOn] = useState(soundManager.isSoundEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    soundManager.setSoundEnabled(next);
    setSoundOn(next);
    if (next) soundManager.playTap();
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftRow}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => {
            soundManager.playTap();
            onExit();
          }}
          accessibilityLabel="Về sảnh"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.btnIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {topicBadge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{topicBadge}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.middleRow}>
        {extraStats}
      </View>

      <View style={styles.rightRow}>
        <TouchableOpacity
          style={[styles.circleBtn, !soundOn && styles.mutedBtn]}
          onPress={toggleSound}
          accessibilityLabel="Bật tắt âm thanh"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.btnIcon}>{soundOn ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => {
            soundManager.playTap();
            onHelp();
          }}
          accessibilityLabel="Hướng dẫn"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.btnIcon}>❓</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.circleBtn, styles.pauseBtn]}
          onPress={() => {
            soundManager.playTap();
            onPause();
          }}
          accessibilityLabel="Tạm dừng"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.btnIcon}>⏸️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lavenderBorder,
    ...shadows.sm,
    zIndex: 100,
    elevation: 4,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.lavenderBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mutedBtn: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.textLight,
  },
  pauseBtn: {
    backgroundColor: colors.amberLight,
    borderColor: colors.amber,
    marginRight: 0,
  },
  btnIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  titleCol: {
    marginLeft: 4,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryExtraLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
