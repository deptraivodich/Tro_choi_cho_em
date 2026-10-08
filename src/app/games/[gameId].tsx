import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GAME_REGISTRY } from '../../features/training-games/registry';
import { GameId } from '../../features/training-games/types';
import { colors } from '../../features/training-games/theme/colors';

export default function GameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const isExitingRef = useRef(false);

  const handleExit = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;

    // Safely check if there is a previous route in navigation stack.
    // If canGoBack() is false (e.g. direct URL, page reload, deep link),
    // navigate to the real lobby route ('/') with replace.
    // If canGoBack() is true, pop the game screen from the stack.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  // Handle hardware back press on Android
  useEffect(() => {
    const onHardwareBack = () => {
      handleExit();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [handleExit]);

  if (!gameId || !(gameId in GAME_REGISTRY)) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Không tìm thấy trò chơi</Text>
        <Text style={styles.errorDesc}>
          Trò chơi "{gameId}" không tồn tại trong danh mục hệ thống.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>Quay về sảnh trò chơi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const validId = gameId as GameId;
  const entry = GAME_REGISTRY[validId];
  const GameComponent = entry.component;

  return <GameComponent onExit={handleExit} />;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
