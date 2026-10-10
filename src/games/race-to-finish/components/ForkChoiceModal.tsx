import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { Player } from '../types/index';
import { soundManager } from '../../../shared/audio/audioController';

interface ForkChoiceModalProps {
  visible: boolean;
  activePlayer: Player | null;
  remainingSteps: number;
  forkTileOrder: number;
  onSelectBranch: (choice: 'main' | 'shortcut') => void;
  paused: boolean;
}

export const ForkChoiceModal: React.FC<ForkChoiceModalProps> = ({
  visible,
  activePlayer,
  remainingSteps,
  onSelectBranch,
  paused,
}) => {
  if (!visible || !activePlayer) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.badge}>NGÃ RẼ CHIẾN THUẬT</Text>
          <Text style={styles.title}>CHỌN TUYẾN ĐƯỜNG ĐI TIẾP</Text>
          <Text style={styles.subtitle}>
            {activePlayer.name} còn {remainingSteps} bước di chuyển. Bạn muốn đi theo hướng nào?
          </Text>

          <View style={styles.choicesRow}>
            {/* Main Path Choice */}
            <TouchableOpacity
              testID="choose-main"
              disabled={activePlayer.isBot || paused}
              style={[styles.card, styles.mainCard]}
              onPress={() => {
                soundManager.playTap();
                onSelectBranch('main');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.cardHeader}>ĐƯỜNG CHÍNH</Text>
              <Text style={styles.cardDesc}>
                Đường mòn uốn lượn quen thuộc quanh sườn núi.
              </Text>
              <View style={styles.selectBtnMain}>
                <Text style={styles.btnText}>CHỌN ĐƯỜNG CHÍNH</Text>
              </View>
            </TouchableOpacity>

            {/* Shortcut Choice */}
            <TouchableOpacity
              testID="choose-shortcut"
              disabled={activePlayer.isBot || paused}
              style={[styles.card, styles.shortcutCard]}
              onPress={() => {
                soundManager.playCorrect();
                onSelectBranch('shortcut');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.hotTag}>
                <Text style={styles.hotTagText}>BỎ QUA NHIỀU Ô</Text>
              </View>
              <Text style={styles.cardHeaderShortcut}>⚡ ĐƯỜNG TẮT</Text>
              <Text style={styles.cardDescShortcut}>
                Phóng nhanh qua lối tắt bí mật ({'>>>'}), rút ngắn khoảng cách tới đích!
              </Text>
              <View style={styles.selectBtnShortcut}>
                <Text style={styles.btnTextShortcut}>CHỌN ĐƯỜNG TẮT ➔</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: Math.min(500, Dimensions.get('window').width * 0.92),
    backgroundColor: '#1E293B',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#F59E0B',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  choicesRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 160,
  },
  mainCard: {
    backgroundColor: '#334155',
    borderColor: '#64748B',
  },
  shortcutCard: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
    position: 'relative',
  },
  hotTag: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hotTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  cardHeaderShortcut: {
    fontSize: 16,
    fontWeight: '900',
    color: '#34D399',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 12,
  },
  cardDescShortcut: {
    fontSize: 11,
    color: '#A7F3D0',
    lineHeight: 16,
    marginBottom: 12,
  },
  selectBtnMain: {
    backgroundColor: '#475569',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  selectBtnShortcut: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnTextShortcut: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
