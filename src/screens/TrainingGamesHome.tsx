import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { GAME_LIST } from '../games/registry';
import { GameCard } from '../shared/components/GameCard';
import { GameId, GameMetadata, LocalUserProfile } from '../shared/types/index';
import { colors, shadows } from '../shared/theme/colors';
import { soundManager } from '../shared/audio/audioController';
import { profileManager } from '../shared/storage/profileManager';

interface TrainingGamesHomeProps {
  onSelectGame: (gameId: GameId) => void;
}

export const TrainingGamesHome: React.FC<TrainingGamesHomeProps> = ({ onSelectGame }) => {
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isSoundEnabled());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    profileManager.getOrCreateProfile().then((p) => {
      setProfile(p);
      setSoundEnabled(p.settings.soundEnabled);
      soundManager.setSoundEnabled(p.settings.soundEnabled);
    });
  }, []);

  const toggleSound = async () => {
    const next = !soundEnabled;
    soundManager.setSoundEnabled(next);
    setSoundEnabled(next);
    if (next) soundManager.playTap();
    if (profile) {
      await profileManager.updateSettings({ soundEnabled: next });
    }
  };

  const categories = [
    { id: 'all', label: 'Tất cả 10 trò chơi 🌟' },
    { id: 'fractions', label: 'Phân số & Hỗn số 🍰' },
    { id: 'decimals', label: 'Số học & Chiến thuật 🎲' },
    { id: 'geometry', label: 'Hình học & Đo lường 📐' },
  ];

  const filteredGames = GAME_LIST.filter((g) => {
    if (selectedCategory === 'fractions') {
      return ['energy-defense', 'planet-rescue', 'rhythm-bakery'].includes(g.id);
    }
    if (selectedCategory === 'decimals') {
      return ['race-to-finish', 'vault-code', 'floating-market'].includes(g.id);
    }
    if (selectedCategory === 'geometry') {
      return ['terrain-racing', 'block-island', 'treasure-dive', 'royal-artillery'].includes(g.id);
    }
    return true;
  });

  // Responsive grid layout: 1 col on mobile, 2 cols on tablet/desktop (width >= 720)
  const isTabletOrDesktop = width >= 720;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Top App Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🎮</Text>
          </View>
          <View>
            <Text style={styles.appName}>Trò chơi rèn luyện cho em</Text>
            <Text style={styles.welcomeText}>
              Xin chào, {profile?.displayName || 'Nhà toán học nhí'}! ✨
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.soundBtn, !soundEnabled && styles.soundBtnMuted]}
          onPress={toggleSound}
          accessibilityLabel="Bật tắt âm thanh"
        >
          <Text style={styles.soundBtnIcon}>{soundEnabled ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>Học Toán Qua 10 Trò Chơi 2D!</Text>
            <Text style={styles.bannerSubtitle}>
              Khám phá thế giới toán học diệu kỳ: xây thành, đua xe, đua về đích, làm bánh và vượt đại dương.
            </Text>
          </View>
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeNumber}>10/10</Text>
            <Text style={styles.bannerBadgeLabel}>Sẵn sàng</Text>
          </View>
        </View>

        {/* Category Pills */}
        <View style={styles.categoryScroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => {
                    soundManager.playTap();
                    setSelectedCategory(cat.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 10 Games Grid */}
        <View style={[styles.gamesContainer, isTabletOrDesktop && styles.gamesGrid]}>
          {filteredGames.map((game) => (
            <View
              key={game.id}
              style={[
                styles.cardWrapper,
                isTabletOrDesktop && { width: '50%' },
              ]}
            >
              <GameCard
                game={game}
                onPlay={(g) => onSelectGame(g.id)}
              />
            </View>
          ))}
        </View>

        {/* Friendly Kid Encouragement Footer */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            🌈 Nhắc nhở dịu dàng: Chơi 15 - 20 phút em hãy chớp mắt và vươn vai thư giãn nhé!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lavenderBorder,
    ...shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryExtraLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
  },
  logoIcon: {
    fontSize: 22,
  },
  appName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  soundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundBtnMuted: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.textLight,
  },
  soundBtnIcon: {
    fontSize: 18,
  },
  scrollContainer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 32,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 8,
    marginBottom: 16,
    ...shadows.md,
  },
  bannerTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.white,
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.primaryExtraLight,
    lineHeight: 18,
  },
  bannerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  bannerBadgeNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.white,
  },
  bannerBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    marginTop: 2,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryRow: {
    paddingHorizontal: 8,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    ...shadows.sm,
  },
  categoryPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  categoryPillTextSelected: {
    color: colors.white,
  },
  gamesContainer: {
    flexDirection: 'column',
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    width: '100%',
  },
  footerNote: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
