import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, useFrameCallback } from 'react-native-reanimated';
import { RACE_ASSETS } from '../assets';
import { DICE_ROLL_DURATION_MS } from '../state/turnTiming';

function Face({ value, result, elapsed, reduced }: { value: number; result: number; elapsed: ReturnType<typeof useSharedValue<number>>; reduced: boolean }) {
  const style = useAnimatedStyle(() => ({ opacity: (elapsed.value >= 500 || reduced ? result : Math.floor(elapsed.value / 65) % 6 + 1) === value ? 1 : 0 }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>
    <Image source={RACE_ASSETS.dice[value as keyof typeof RACE_ASSETS.dice]} style={styles.image} resizeMode="contain" />
  </Animated.View>;
}
export function DiceOverlay({ value, paused, reduced, getRemaining }: { value: number; paused: boolean; reduced: boolean; getRemaining: () => number }) {
  const elapsed = useSharedValue(0);
  const frozen = useSharedValue(paused);
  useEffect(() => { frozen.set(paused); elapsed.set(DICE_ROLL_DURATION_MS - getRemaining()); }, [paused, frozen, elapsed, getRemaining]);
  useFrameCallback(frame => {
    if (!frozen.value) elapsed.set(Math.min(DICE_ROLL_DURATION_MS, elapsed.value + Math.max(frame.timeSincePreviousFrame ?? 0, 0)));
  });
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, elapsed.value / 500);
    const bounce = reduced ? 0 : Math.sin(t * Math.PI);
    return { transform: [{ perspective: 500 }, { translateY: -bounce * 34 }, { scale: 1 + bounce * .18 },
      { rotateX: `${reduced ? 0 : (1 - t) * 360}deg` }, { rotateY: `${reduced ? 0 : (1 - t) * 540}deg` },
      { rotateZ: `${reduced ? 0 : Math.sin(t * Math.PI * 4) * (1 - t) * 20}deg` }] };
  });
  const labelStyle = useAnimatedStyle(() => ({ opacity: elapsed.value >= 500 || reduced ? 1 : 0 }));
  return <View pointerEvents="none" testID="dice-overlay" style={styles.overlay}>
    <Animated.View testID="rolling-dice" style={[styles.die, style]}>
      {[1, 2, 3, 4, 5, 6].map(face => <Face key={face} value={face} result={value} elapsed={elapsed} reduced={reduced} />)}
    </Animated.View>
    <Animated.View style={labelStyle}><Text testID="dice-result" style={styles.result}>Tung được {value}</Text></Animated.View>
  </View>;
}
const styles = StyleSheet.create({ overlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,45,31,.22)' },
  die: { width: 106, height: 106, shadowColor: '#000', shadowOpacity: .45, shadowRadius: 15, shadowOffset: { width: 0, height: 12 } },
  image: { width: '100%', height: '100%' }, result: { marginTop: 10, paddingHorizontal: 18, paddingVertical: 6,
    backgroundColor: '#FEF3C7', borderRadius: 12, fontSize: 22, fontWeight: '900', color: '#78350F' } });
