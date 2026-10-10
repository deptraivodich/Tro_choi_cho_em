import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { GameMode, Player, CharacterId, CHARACTERS_META } from '../types/index';
import { RACE_ASSETS } from '../assets/index';
import { soundManager } from '../../../shared/audio/audioController';

interface SetupModalProps {
  visible: boolean;
  onStartGame: (mode: GameMode, players: Player[]) => void;
  onExit: () => void;
}

const ALL_CHARACTERS: CharacterId[] = ['fox', 'penguin', 'bunny', 'turtle'];

export const SetupModal: React.FC<SetupModalProps> = ({ visible, onStartGame, onExit }) => {
  const [mode, setMode] = useState<GameMode>('single');
  const [numPlayers, setNumPlayers] = useState<number>(4);

  // Initial player names & characters
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Em',
    'Cánh Cụt Máy',
    'Thỏ Tím Máy',
    'Rùa Con Máy',
  ]);

  const [playerChars, setPlayerChars] = useState<CharacterId[]>([
    'fox',
    'penguin',
    'bunny',
    'turtle',
  ]);

  const handleModeChange = (newMode: GameMode) => {
    soundManager.playTap();
    setMode(newMode);
    if (newMode === 'single') {
      setPlayerNames([
        'Em',
        'Cánh Cụt Máy',
        'Thỏ Tím Máy',
        'Rùa Con Máy',
      ]);
    } else {
      setPlayerNames([
        'Người chơi 1',
        'Người chơi 2',
        'Người chơi 3',
        'Người chơi 4',
      ]);
    }
  };

  const handleCharSelect = (playerIdx: number, charId: CharacterId) => {
    soundManager.playTap();
    // Swap character if already chosen by another player to prevent duplicates
    const oldChar = playerChars[playerIdx];
    const existingIndex = playerChars.indexOf(charId);

    const updated = [...playerChars];
    if (existingIndex !== -1 && existingIndex !== playerIdx) {
      updated[existingIndex] = oldChar;
    }
    updated[playerIdx] = charId;
    setPlayerChars(updated);
  };

  const handleNameChange = (playerIdx: number, text: string) => {
    const updated = [...playerNames];
    updated[playerIdx] = text;
    setPlayerNames(updated);
  };

  const handleStart = () => {
    soundManager.playVictory();
    const activePlayers: Player[] = [];
    for (let i = 0; i < numPlayers; i++) {
      const isBot = mode === 'single' && i > 0;
      activePlayers.push({
        id: `p-${i + 1}`,
        name: playerNames[i] || CHARACTERS_META[playerChars[i]].defaultPlayerName,
        character: playerChars[i],
        isBot,
        currentTileId: 'tile_0',
        pathHistory: ['tile_0'],
        position: 0,
        hasShield: false,
        cleanseCount: 0,
        skipNextTurn: false,
        currentPose: 'idle_1',
        rank: null,
      });
    }
    onStartGame(mode, activePlayers);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Image source={RACE_ASSETS.ui.header_sign} style={styles.headerSign} resizeMode="contain" />
            <Text style={styles.subtitle}>Giải toán lớp 5 và đua qua khu rừng diệu kỳ</Text>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Mode Selector */}
            <Text style={styles.sectionTitle}>1. Chọn Chế Độ Chơi</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'single' && styles.modeBtnActive]}
                onPress={() => handleModeChange('single')}
              >
                <Text style={styles.modeIcon}>🤖</Text>
                <Text style={[styles.modeBtnText, mode === 'single' && styles.modeBtnTextActive]}>
                  Chơi một mình
                </Text>
                <Text style={styles.modeSubText}>1 Người thật + Máy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeBtn, mode === 'local_multiplayer' && styles.modeBtnActive]}
                onPress={() => handleModeChange('local_multiplayer')}
              >
                <Text style={styles.modeIcon}>👥</Text>
                <Text
                  style={[styles.modeBtnText, mode === 'local_multiplayer' && styles.modeBtnTextActive]}
                >
                  Chơi cùng bạn
                </Text>
                <Text style={styles.modeSubText}>Nhiều người 1 máy</Text>
              </TouchableOpacity>
            </View>

            {/* Number of players */}
            <Text style={styles.sectionTitle}>2. Số Lượng Tham Gia</Text>
            <View style={styles.numRow}>
              {[2, 3, 4].map((count) => (
                <TouchableOpacity
                  key={`num-${count}`}
                  style={[styles.numBtn, numPlayers === count && styles.numBtnActive]}
                  onPress={() => {
                    soundManager.playTap();
                    setNumPlayers(count);
                  }}
                >
                  <Text style={[styles.numBtnText, numPlayers === count && styles.numBtnTextActive]}>
                    {count} Người chơi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Player details */}
            <Text style={styles.sectionTitle}>3. Nhân Vật & Tên Người Chơi</Text>
            {Array.from({ length: numPlayers }).map((_, idx) => {
              const isBot = mode === 'single' && idx > 0;
              const currentChar = playerChars[idx];
              const meta = CHARACTERS_META[currentChar];

              return (
                <View key={`player-setup-${idx}`} style={styles.playerSetupCard}>
                  <View style={styles.playerSetupHeader}>
                    <Text style={styles.playerSetupBadge}>
                      {isBot ? `🤖 Máy ${idx}` : `👤 Người chơi ${idx + 1}`}
                    </Text>
                    <TextInput
                      style={styles.nameInput}
                      value={playerNames[idx]}
                      onChangeText={(t) => handleNameChange(idx, t)}
                      placeholder="Nhập tên..."
                      maxLength={14}
                    />
                  </View>

                  {/* Character selection avatars */}
                  <View style={styles.charSelectRow}>
                    {ALL_CHARACTERS.map((charId) => {
                      const isSelected = currentChar === charId;
                      const isUsedByOther = playerChars.slice(0, numPlayers).includes(charId) && !isSelected;
                      const avatarSrc = RACE_ASSETS.characters[charId].avatar;

                      return (
                        <TouchableOpacity
                          key={`char-opt-${idx}-${charId}`}
                          style={[
                            styles.charAvatarBtn,
                            isSelected && styles.charAvatarBtnSelected,
                          ]}
                          onPress={() => handleCharSelect(idx, charId)}
                        >
                          <Image source={avatarSrc} style={styles.charAvatarImg} />
                          {isSelected && <View style={styles.selectedTick}><Text style={styles.tickText}>✓</Text></View>}
                          {isUsedByOther && <View style={styles.swapBadge}><Text style={styles.swapText}>Đổi</Text></View>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {/* Quick Rules Banner */}
            <View style={styles.rulesCard}>
              <Text style={styles.rulesCardTitle}>📜 LUẬT CHƠI NHANH:</Text>
              <Text style={styles.ruleItem}>• Tung xúc xắc, giải toán lớp 5: đúng thì đi đủ số ô xúc xắc (1–6), sai thì đứng yên.</Text>
              <Text style={styles.ruleItem}>• <Text style={styles.ruleGreen}>Ô Thưởng (+1, +2, Khiên, Sao Giải Trừ)</Text> giúp tăng tốc và tự chặn phạt.</Text>
              <Text style={styles.ruleItem}>• Ô phạt: lùi 1–2 ô, mất lượt; về xuất phát chỉ có ở 10 ô đầu. Khiên và sao giúp chặn phạt.</Text>
              <Text style={styles.ruleItem}>• Ai cán đích đầu tiên sẽ giành Cúp Vàng. Tại ngã rẽ, em được chọn đường chính hoặc đường tắt!</Text>
            </View>
          </ScrollView>

          {/* Footer actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
              <Text style={styles.exitBtnText}>‹ Về sảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStart}
              accessibilityLabel="start-race-button"
              testID="start-race-button"
            >
              <Text style={styles.startBtnText}>🏁 XUẤT PHÁT ĐUA NGAY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 28,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderWidth: 3,
    borderColor: '#D97706',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#FDE68A',
  },
  headerSign: {
    width: 240,
    height: 60,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 4,
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#78350F',
    marginTop: 12,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modeBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  modeIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
  },
  modeBtnTextActive: {
    color: '#059669',
  },
  modeSubText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  numRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  numBtnActive: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  numBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
  },
  numBtnTextActive: {
    color: '#FFFFFF',
  },
  playerSetupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  playerSetupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playerSetupBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
  },
  nameInput: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  charSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  charAvatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  charAvatarBtnSelected: {
    borderColor: '#059669',
    backgroundColor: '#D1FAE5',
    transform: [{ scale: 1.1 }],
  },
  charAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  selectedTick: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#059669',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  swapBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#9CA3AF',
    borderRadius: 6,
    paddingHorizontal: 3,
  },
  swapText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  rulesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rulesCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 4,
  },
  ruleItem: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 2,
  },
  ruleBold: {
    fontWeight: '900',
    color: '#1F2937',
  },
  ruleGreen: {
    fontWeight: '800',
    color: '#059669',
  },
  ruleRed: {
    fontWeight: '800',
    color: '#DC2626',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#FDE68A',
    backgroundColor: '#FEF3C7',
  },
  exitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
  },
  exitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
  },
  startBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
