import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, shadows } from '../theme/colors';
import { soundManager } from '../core/audioController';

export type ModalType = 'pause' | 'tutorial' | 'result' | null;

interface GameModalProps {
  type: ModalType;
  title?: string;
  tutorialContent?: React.ReactNode;
  resultData?: {
    isWon: boolean;
    score: number;
    maxScore: number;
    playtimeSeconds: number;
    correctCount: number;
    incorrectCount: number;
    skillsPracticed: string[];
    explanation?: string;
  };
  onResume?: () => void;
  onRestart?: () => void;
  onExit?: () => void;
  onCloseTutorial?: () => void;
}

export const GameModal: React.FC<GameModalProps> = ({
  type,
  title,
  tutorialContent,
  resultData,
  onResume,
  onRestart,
  onExit,
  onCloseTutorial,
}) => {
  if (!type) return null;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  return (
    <Modal visible={!!type} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {type === 'pause' && (
            <View style={styles.content}>
              <View style={[styles.iconCircle, { backgroundColor: colors.amberLight }]}>
                <Text style={styles.iconLarge}>⏸️</Text>
              </View>
              <Text style={styles.modalTitle}>Trò chơi tạm dừng</Text>
              <Text style={styles.modalSub}>
                Em hãy nghỉ ngơi một chút rồi tiếp tục nhé!
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  soundManager.playTap();
                  onResume?.();
                }}
              >
                <Text style={styles.primaryBtnText}>▶ Tiếp tục chơi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => {
                  soundManager.playTap();
                  onRestart?.();
                }}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                  🔄 Chơi lại từ đầu
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => {
                  soundManager.playTap();
                  onExit?.();
                }}
              >
                <Text style={styles.ghostBtnText}>🏠 Về sảnh chính</Text>
              </TouchableOpacity>
            </View>
          )}

          {type === 'tutorial' && (
            <View style={styles.tutorialContainer}>
              <View style={styles.tutorialHeader}>
                <Text style={styles.modalTitle}>{title || 'Hướng dẫn trò chơi'}</Text>
                {onExit && (
                  <TouchableOpacity
                    style={styles.headerExitBtn}
                    onPress={() => {
                      soundManager.playTap();
                      onExit();
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Thoát về sảnh"
                  >
                    <Text style={styles.headerExitBtnText}>‹ Về sảnh</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView style={styles.tutorialScroll}>
                {tutorialContent}
              </ScrollView>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.emerald, marginTop: 12 }]}
                onPress={() => {
                  soundManager.playTap();
                  onCloseTutorial?.();
                }}
              >
                <Text style={styles.primaryBtnText}>✨ Đã hiểu! Vào chơi ngay</Text>
              </TouchableOpacity>

              {onExit && (
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => {
                    soundManager.playTap();
                    onExit();
                  }}
                  accessibilityLabel="Về sảnh chính"
                >
                  <Text style={styles.ghostBtnText}>🏠 Về sảnh chính</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {type === 'result' && resultData && (
            <ScrollView contentContainerStyle={styles.content}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: resultData.isWon
                      ? colors.emeraldLight
                      : colors.primaryExtraLight,
                  },
                ]}
              >
                <Text style={styles.iconLarge}>
                  {resultData.isWon ? '🌟' : '💪'}
                </Text>
              </View>

              <Text style={styles.modalTitle}>
                {resultData.isWon ? 'Tuyệt vời! Hoàn thành ván chơi!' : 'Cố gắng lên nhé!'}
              </Text>

              <Text style={styles.modalSub}>
                {resultData.isWon
                  ? 'Em đã áp dụng rất tốt các kiến thức toán học!'
                  : 'Không sao cả, mỗi lần chơi là một lần rèn luyện tư duy.'}
              </Text>

              {/* Stats Box */}
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>⏱️ Thời gian chơi:</Text>
                  <Text style={styles.statValue}>
                    {formatSeconds(resultData.playtimeSeconds)}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>🎯 Điểm số:</Text>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {resultData.score}/{resultData.maxScore}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>✅ Số câu đúng:</Text>
                  <Text style={[styles.statValue, { color: colors.emerald }]}>
                    {resultData.correctCount}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>💡 Cần xem lại:</Text>
                  <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                    {resultData.incorrectCount}
                  </Text>
                </View>
              </View>

              {/* Skills Practiced */}
              {resultData.skillsPracticed.length > 0 && (
                <View style={styles.skillsBox}>
                  <Text style={styles.skillsTitle}>Kỹ năng đã rèn luyện:</Text>
                  <View style={styles.skillsWrap}>
                    {resultData.skillsPracticed.map((skill, i) => (
                      <View key={i} style={styles.skillPill}>
                        <Text style={styles.skillPillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {resultData.explanation && (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationText}>
                    {resultData.explanation}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                onPress={() => {
                  soundManager.playTap();
                  onRestart?.();
                }}
              >
                <Text style={styles.primaryBtnText}>🔄 Chơi lại vòng này</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => {
                  soundManager.playTap();
                  onExit?.();
                }}
              >
                <Text style={styles.ghostBtnText}>🏠 Quay về sảnh trò chơi</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    padding: 20,
    ...shadows.lg,
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconLarge: {
    fontSize: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    ...shadows.sm,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    backgroundColor: colors.white,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  ghostBtn: {
    paddingVertical: 10,
    marginTop: 4,
  },
  ghostBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tutorialContainer: {
    maxHeight: '100%',
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.lavenderBorder,
    paddingBottom: 10,
    marginBottom: 10,
  },
  headerExitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.lavenderBorder,
  },
  headerExitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  tutorialScroll: {
    maxHeight: 320,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    width: '100%',
    marginVertical: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  skillsBox: {
    width: '100%',
    marginTop: 8,
  },
  skillsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    backgroundColor: colors.primaryExtraLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  explanationBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    borderRadius: 10,
    width: '100%',
  },
  explanationText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
  },
});
