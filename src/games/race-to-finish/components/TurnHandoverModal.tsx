import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Player, CHARACTERS_META } from '../types/index';
import { RACE_ASSETS } from '../assets/index';
import { soundManager } from '../../../shared/audio/audioController';

interface TurnHandoverModalProps {
  visible: boolean;
  nextPlayer: Player;
  onReady: () => void;
}

export const TurnHandoverModal: React.FC<TurnHandoverModalProps> = ({
  visible,
  nextPlayer,
  onReady,
}) => {
  const meta = CHARACTERS_META[nextPlayer.character];
  const avatarSource = RACE_ASSETS.characters[nextPlayer.character].avatar;

  const handlePress = () => {
    soundManager.playTap();
    onReady();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.smallHeader}>👥 CHUYỂN GIAO THIẾT BỊ</Text>

          <View style={[styles.avatarCircle, { borderColor: meta.borderColor, backgroundColor: meta.bgTint }]}>
            <Image source={avatarSource} style={styles.avatarImg} resizeMode="contain" />
          </View>

          <Text style={styles.turnTitle}>ĐẾN LƯỢT CỦA</Text>
          <Text style={[styles.playerName, { color: meta.color }]}>{nextPlayer.name}</Text>

          <Text style={styles.guidanceText}>
            Hãy chuyển máy cho bạn <Text style={styles.boldText}>{nextPlayer.name}</Text> để sẵn sàng đổ xúc xắc!
          </Text>

          <TouchableOpacity style={[styles.readyBtn, { backgroundColor: meta.color }]} onPress={handlePress}>
            <Text style={styles.readyBtnText}>🎲 SẴN SÀNG ĐỔ XÚC XẮC</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  smallHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  turnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
  },
  playerName: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 10,
  },
  guidanceText: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  boldText: {
    fontWeight: '800',
    color: '#1F2937',
  },
  readyBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  readyBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
