import { RaceModal } from './RaceModal';
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { Player, CHARACTERS_META } from '../types/index';
import { RACE_ASSETS } from '../assets/index';
import { CharacterAvatar } from './CharacterAvatar';
import { TokenSprite } from './TokenSprite';
import { soundManager } from '../../../shared/audio/audioController';
import { FINISH_TILE_ID, getTileOrder } from '../data/boardConfig';

interface VictoryModalProps {
  visible: boolean;
  winner: Player | null;
  allPlayers: Player[];
  onPlayAgain: () => void;
  onExit: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  visible,
  winner,
  allPlayers,
  onPlayAgain,
  onExit,
}) => {
  if (!winner) return null;

  const meta = CHARACTERS_META[winner.character];

  // Sorted players by position descending
  const sortedPlayers = [...allPlayers].sort((a, b) => b.position - a.position);

  return (
    <RaceModal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <ScrollView style={styles.card} contentContainerStyle={{ alignItems: 'center' }}>
          {/* Trophy & Confetti Header */}
          <View style={styles.trophyHeader}>
            <Image source={RACE_ASSETS.items.trophy} style={styles.trophyImg} resizeMode="contain" />
          </View>

          <Text style={styles.championBadge}>👑 NHÀ VÔ ĐỊCH ĐƯỜNG ĐUA</Text>
          <Text style={[styles.winnerName, { color: meta.color }]}>{winner.name}</Text>

          {/* Winner Hero Sprite in Victory Pose */}
          <View style={styles.heroSpriteContainer}>
            <TokenSprite character={winner.character} pose="victory" size={120} />
          </View>

          <Text style={styles.victorySubtitle}>
            Đã vượt qua khu rừng phiêu lưu và cán đích đầu tiên! 🎉
          </Text>

          {/* Leaderboard */}
          <View style={styles.leaderboardBox}>
            <Text style={styles.lbHeader}>BẢNG XẾP HẠNG CUỐI CÙNG</Text>
            {sortedPlayers.map((p, idx) => {

              return (
                <View key={`rank-${p.id}`} style={styles.lbRow}>
                  <Text style={styles.rankNum}>#{idx + 1}</Text>
                  <CharacterAvatar character={p.character} size={26} style={styles.lbAvatar} />
                  <Text style={styles.lbName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.lbPosition}>
                    {p.currentTileId === FINISH_TILE_ID ? '🏆 Về đích' : `${Math.round(p.position / getTileOrder(FINISH_TILE_ID) * 100)}% chặng đua`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity testID="victory-exit" style={styles.exitBtn} onPress={onExit}>
              <Text style={styles.exitBtnText}>🏠 Về Sảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playAgainBtn}
              onPress={() => {
                soundManager.playTap();
                onPlayAgain();
              }}
            >
              <Text style={styles.playAgainBtnText}>🔄 Chơi Lại Trận Mới</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </RaceModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FEF3C7',
    borderRadius: 28,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    flexGrow: 0,
    borderWidth: 3,
    borderColor: '#D97706',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  trophyHeader: {
    marginTop: 0,
    marginBottom: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  trophyImg: {
    width: 90,
    height: 90,
  },
  championBadge: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 1,
  },
  winnerName: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 4,
  },
  heroSpriteContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSprite: {
    width: '100%',
    height: '100%',
  },
  victorySubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350F',
    textAlign: 'center',
    marginVertical: 6,
  },
  leaderboardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  lbHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rankNum: {
    width: 24,
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
  },
  lbAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
  },
  lbName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  lbPosition: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 6,
  },
  exitBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  exitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
  },
  playAgainBtn: {
    flex: 1.4,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  playAgainBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
