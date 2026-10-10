import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GameMetadata } from '../types/index';
import { colors, shadows } from '../theme/colors';
import { GAME_PALETTES } from '../theme/gamePalettes';
import { GameIcon } from './GameIcons';
import { soundManager } from '../audio/audioController';

interface GameCardProps {
  game: GameMetadata;
  onPlay: (game: GameMetadata) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onPlay }) => {
  const palette = GAME_PALETTES[game.id];
  const getDifficultyBadge = (diff: GameMetadata['difficulty']) => {
    switch (diff) {
      case 'easy':
        return { text: 'Cơ bản', bg: colors.emeraldLight, color: colors.emeraldDark };
      case 'medium':
        return { text: 'Vừa sức', bg: colors.amberLight, color: colors.amberDark };
      case 'hard':
        return { text: 'Thử thách', bg: colors.roseLight, color: colors.roseDark };
    }
  };

  const diffBadge = getDifficultyBadge(game.difficulty);

  return (
    <View style={[styles.card, palette && { borderColor: palette.cardBorder, borderLeftWidth: 4 }]}>
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <GameIcon gameId={game.id} size={58} />
        </View>

        <View style={styles.infoCol}>
          <View style={styles.tagsRow}>
            <View style={[styles.badge, { backgroundColor: diffBadge.bg }]}>
              <Text style={[styles.badgeText, { color: diffBadge.color }]}>
                {diffBadge.text}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.primaryExtraLight }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {game.recommendedGrade}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                ⏱️ ~{game.durationMinutes}p
              </Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {game.title}
          </Text>

          <Text style={styles.mathSkill} numberOfLines={1}>
            🎯 {game.mathSkill}
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {game.description}
      </Text>

      <View style={styles.actionRow}>
        <View style={styles.topicTag}>
          <Text style={styles.topicText}>{game.topic}</Text>
        </View>

        <TouchableOpacity
          testID={`game-card-play-${game.id}`}
          accessibilityRole="button"
          style={[styles.playBtn, { backgroundColor: game.accentColor || colors.primary }]}
          onPress={() => {
            soundManager.playTap();
            onPlay(game);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.playBtnText}>Chơi ngay 🚀</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 8,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  mathSkill: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  topicTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topicText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  playBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    ...shadows.sm,
  },
  playBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
});
