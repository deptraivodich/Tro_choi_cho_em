import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { Player } from '../types/index';
import { RACE_ASSETS } from '../assets/index';
import { TokenPlacement } from '../logic/tokenPlacement';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SHORTCUTS } from '../data/boardConfig';

interface Props {
  player: Player; placement: TokenPlacement; active: boolean; moving: boolean; paused: boolean;
  actionId: number; onComplete: (id: number) => void;
}
export function AnimatedToken({ player, placement, active, moving, paused, actionId, onComplete }: Props) {
  const [position] = useState(() => new Animated.ValueXY({ x: placement.x, y: placement.y }));
  const callback = useRef(onComplete);
  useLayoutEffect(() => { callback.current = onComplete; }, [onComplete]);
  const reduced = useReducedMotion();
  const traversingShortcut = moving && SHORTCUTS.some(shortcut =>
    player.currentTileId === shortcut.mergeTileId && player.pathHistory[player.pathHistory.length - 2] === shortcut.forkTileId);
  useEffect(() => {
    if (paused) return;
    let alive = true;
    const animation = Animated.timing(position, {
      toValue: { x: placement.x, y: placement.y }, duration: reduced ? 70 : moving ? (traversingShortcut ? 800 : 280) : 180,
      easing: Easing.inOut(Easing.quad), useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (alive && finished && moving) callback.current(actionId);
    });
    return () => { alive = false; animation.stop(); };
  }, [position, placement.x, placement.y, moving, paused, actionId, reduced, traversingShortcut]);
  const assets = RACE_ASSETS.characters[player.character];
  return (
    <Animated.View testID={`token-${player.id}`} accessibilityLabel={`${player.name}: ${player.currentTileId}`}
      pointerEvents="none" style={[styles.token, { width: placement.size, height: placement.size,
        zIndex: active ? 24 : 22, transform: position.getTranslateTransform() }]}>
      {active && <View style={styles.halo} />}
      <Image source={assets[player.currentPose] || assets.idle_1} style={styles.sprite} resizeMode="contain" />
      <View style={styles.items}>
        {player.hasShield && <Image source={RACE_ASSETS.items.shield} style={styles.badge} />}
        {player.cleanseCount > 0 && <Image source={RACE_ASSETS.items.cleanse} style={styles.badge} />}
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  token: { position: 'absolute', left: 0, top: 0 }, sprite: { width: '100%', height: '100%' },
  halo: { position: 'absolute', width: '90%', height: '30%', bottom: 0, left: '5%', borderRadius: 99,
    backgroundColor: 'rgba(250,204,21,0.55)', borderColor: '#FDE047', borderWidth: 2 },
  items: { position: 'absolute', top: -8, right: -4, flexDirection: 'row' }, badge: { width: 16, height: 16 },
});
