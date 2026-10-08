import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface TimerBarProps {
  elapsedSeconds: number;
  totalSeconds: number;
  isCountDown?: boolean;
}

export const TimerBar: React.FC<TimerBarProps> = ({
  elapsedSeconds,
  totalSeconds,
  isCountDown = false,
}) => {
  const displaySeconds = isCountDown
    ? Math.max(0, totalSeconds - elapsedSeconds)
    : elapsedSeconds;

  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));

  let barColor = colors.primary;
  if (isCountDown) {
    if (progressPercent > 80) barColor = colors.rose;
    else if (progressPercent > 60) barColor = colors.amber;
    else barColor = colors.emerald;
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <Text style={styles.label}>
          {isCountDown ? '⏳ Thời gian còn:' : '⏱️ Thời gian:'}
        </Text>
        <Text style={[styles.timeText, { color: barColor }]}>{timeFormatted}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${isCountDown ? 100 - progressPercent : progressPercent}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  track: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
