import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { PendingPenalty } from '../types';
import { RACE_ASSETS } from '../assets';

interface CleanseChoiceModalProps {
  visible: boolean;
  pendingPenalty: PendingPenalty | null;
  onUseCleanse: () => void;
  onKeepCleanse: () => void;
}

export const CleanseChoiceModal: React.FC<CleanseChoiceModalProps> = ({
  visible,
  pendingPenalty,
  onUseCleanse,
  onKeepCleanse,
}) => {
  if (!pendingPenalty) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Image source={RACE_ASSETS.items.cleanse} style={styles.starImg} resizeMode="contain" />
          </View>

          <Text style={styles.title}>DÙNG NGÔI SAO GIẢI BẤT LỢI?</Text>

          <View style={styles.penaltyAlertBox}>
            <Text style={styles.penaltyTitle}>⚠️ Hình phạt vừa rơi vào:</Text>
            <Text style={styles.penaltyDesc}>{pendingPenalty.description}</Text>
          </View>

          <Text style={styles.infoText}>
            Em đang sở hữu 1 Ngôi Sao Giải Bất Lợi. Em có muốn dùng ngay để xóa bỏ hình phạt này không?
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.keepBtn} onPress={onKeepCleanse}>
              <Text style={styles.keepBtnText}>Giữ lại (Chịu phạt)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.useBtn} onPress={onUseCleanse}>
              <Text style={styles.useBtnText}>✨ DÙNG NGÔI SAO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFBEB',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  starImg: {
    width: 48,
    height: 48,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 12,
  },
  penaltyAlertBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    marginBottom: 12,
  },
  penaltyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 2,
  },
  penaltyDesc: {
    fontSize: 13,
    fontWeight: '900',
    color: '#991B1B',
  },
  infoText: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  keepBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  keepBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  useBtn: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  useBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
