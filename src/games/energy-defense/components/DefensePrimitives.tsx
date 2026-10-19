import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect, Line, Polyline } from 'react-native-svg';
import { defense } from '../theme';

export type IconName = 'back' | 'sound' | 'mute' | 'help' | 'pause' | 'play' | 'bolt' | 'shield' | 'clock' | 'check' | 'refresh' | 'close' | 'star';
export function DefenseIcon({ name, size = 22, color = defense.ink }: { name: IconName; size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {name === 'back' && <><Path d="M14 5l-7 7 7 7" /><Line x1="7" y1="12" x2="21" y2="12" /></>}
    {(name === 'sound' || name === 'mute') && <><Path d="M11 4L6 8H3v8h3l5 4V4Z" />{name === 'sound' ? <><Path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></> : <Path d="M16 9l6 6m0-6l-6 6" />}</>}
    {name === 'help' && <><Circle cx="12" cy="12" r="9" /><Path d="M9.4 9a2.7 2.7 0 1 1 4.5 2c-1.2.8-1.9 1.2-1.9 3" /><Circle cx="12" cy="17" r=".7" fill={color} /></>}
    {name === 'pause' && <><Rect x="6" y="4" width="4" height="16" rx="1" fill={color} stroke="none" /><Rect x="14" y="4" width="4" height="16" rx="1" fill={color} stroke="none" /></>}
    {name === 'play' && <Path d="M8 4l13 8-13 8V4Z" fill={color} stroke="none" />}
    {name === 'bolt' && <Path d="M14 2L4 14h7l-1 8 10-12h-7l1-8Z" fill={color} stroke="none" />}
    {name === 'shield' && <><Path d="M12 2L3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z" /><Polyline points="8,12 11,15 16,9" /></>}
    {name === 'clock' && <><Circle cx="12" cy="12" r="9" /><Path d="M12 7v5l3 2" /></>}
    {name === 'check' && <Path d="M5 12l5 5L20 6" />}
    {name === 'refresh' && <><Path d="M20 7A9 9 0 1 0 21 15M20 2v6h-6" /></>}
    {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" />}
    {name === 'star' && <Path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" fill={color} stroke="none" />}
  </Svg>;
}

type ButtonProps = {
  label: string; onPress: () => void; icon?: IconName; accessibilityLabel?: string;
  tone?: 'primary' | 'secondary' | 'quiet' | 'gold'; disabled?: boolean; selected?: boolean;
  style?: StyleProp<ViewStyle>; testID?: string; compact?: boolean;
};

export function DefenseButton({ label, onPress, icon, accessibilityLabel, tone = 'primary', disabled, selected, style, testID, compact }: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const color = tone === 'primary' ? '#FFFFFF' : defense.ink;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label}
    accessibilityState={{ disabled: !!disabled, ...(selected === undefined ? {} : { selected }) }} aria-selected={selected}
    disabled={disabled} onPress={onPress} testID={testID} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={({ pressed }) => [s.button, s[tone], compact && s.compact,
      hovered && !disabled && s.hover, pressed && s.pressed, disabled && s.disabled, style]}>
    <View style={s.buttonShine} pointerEvents="none" />
    {icon && <DefenseIcon name={icon} size={compact ? 17 : 21} color={disabled ? '#849799' : color} />}
    <Text style={[s.label, { color: disabled ? '#849799' : color }, compact && s.compactLabel]}>{label}</Text>
  </Pressable>;
}

export function IconButton({ icon, label, onPress, gold = false }: { icon: IconName; label: string; onPress: () => void; gold?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={({ pressed }) => [s.iconButton, gold && s.iconGold, hovered && s.hover, pressed && s.pressed]}>
    <DefenseIcon name={icon} size={21} />
  </Pressable>;
}

const s = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderBottomWidth: 4, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  primary: { backgroundColor: defense.teal, borderColor: '#086467' },
  secondary: { backgroundColor: '#EBF5F1', borderColor: '#C4DBD4' },
  quiet: { backgroundColor: '#FFFFFF', borderColor: defense.line },
  gold: { backgroundColor: '#F7D77F', borderColor: '#D3AF54' },
  buttonShine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#FFFFFF', opacity: 0.26 },
  label: { fontSize: 15, lineHeight: 21, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  compact: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderBottomWidth: 3 },
  compactLabel: { fontSize: 12, lineHeight: 17 },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F9F6', borderWidth: 1, borderBottomWidth: 3, borderColor: '#D8E8E1' },
  iconGold: { backgroundColor: '#FFF0C7', borderColor: '#E8CE8B' },
  hover: { borderColor: '#6BBDB3', opacity: 0.93 },
  pressed: { transform: [{ translateY: 2 }, { scale: 0.98 }], borderBottomWidth: 1 },
  disabled: { backgroundColor: '#E6ECEA', borderColor: '#D2DEDA' },
});
