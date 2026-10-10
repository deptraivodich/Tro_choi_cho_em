import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Player, CHARACTERS_META } from '../types/index';
import { RACE_ASSETS } from '../assets/index';
import { FINISH_TILE_ID, getTileOrder } from '../data/boardConfig';

interface PlayerBannerProps {
  players: Player[];
  activePlayerIndex: number;
}

export const PlayerBanner: React.FC<PlayerBannerProps> = ({ players, activePlayerIndex }) => {
  return (
    <View style={styles.container}>
      <View style={styles.playersRow}>
        {players.map((p, idx) => {
          const isActive = idx === activePlayerIndex;
          const meta = CHARACTERS_META[p.character];
          const avatarSource = RACE_ASSETS.characters[p.character].avatar;

          return (
            <View
              key={p.id}
              style={[
                styles.playerCard,
                isActive && [styles.playerCardActive, { borderColor: meta.borderColor }],
              ]}
            >
              {/* Avatar circle */}
              <View
                style={[
                  styles.avatarWrapper,
                  { borderColor: meta.borderColor, backgroundColor: meta.bgTint },
                ]}
              >
                <Image source={avatarSource} style={styles.avatarImage} resizeMode="contain" />

                {/* Status Badges */}
                {p.hasShield && (
                  <View style={styles.badgeShield}>
                    <Image source={RACE_ASSETS.items.shield} style={styles.miniIcon} />
                  </View>
                )}
                {p.cleanseCount > 0 && (
                  <View style={styles.badgeCleanse}>
                    <Image source={RACE_ASSETS.items.cleanse} style={styles.miniIcon} />
                  </View>
                )}
                {p.skipNextTurn && (
                  <View style={styles.badgeSkip}>
                    <Text style={styles.skipIconText}>⏳</Text>
                  </View>
                )}
              </View>

              {/* Name & Position */}
              <Text style={[styles.nameText, isActive && styles.nameTextActive]} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={[styles.posBadge, isActive && { backgroundColor: meta.color }]}>
                <Text style={[styles.posText, isActive && styles.posTextActive]}>
                  {p.position === 0 ? 'Xuất phát' : p.currentTileId === FINISH_TILE_ID ? 'Về đích' : `${Math.round(p.position / getTileOrder(FINISH_TILE_ID) * 100)}%`}
                </Text>
              </View>

              {/* Active Indicator Arrow */}
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: meta.color }]}>
                  <Text style={styles.activeIndicatorText}>LƯỢT</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  playerCard: {
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 52,
    position: 'relative',
  },
  playerCardActive: {
    backgroundColor: 'rgba(254, 243, 199, 0.85)',
    transform: [{ scale: 1.06 }],
    borderColor: '#F59E0B',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  badgeShield: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 1,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  badgeCleanse: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 1,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  badgeSkip: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipIconText: {
    fontSize: 9,
  },
  miniIcon: {
    width: 13,
    height: 13,
  },
  nameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 3,
    maxWidth: 70,
  },
  nameTextActive: {
    color: '#1F2937',
    fontWeight: '900',
  },
  posBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginTop: 2,
  },
  posText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  posTextActive: {
    color: '#FFFFFF',
  },
  activeIndicator: {
    position: 'absolute',
    top: -6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeIndicatorText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
