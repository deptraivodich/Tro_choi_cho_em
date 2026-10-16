import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Fraction } from '../../../shared/math/fraction';
import type { Mode } from '../logic/config';
export type MathValue = { kind: 'decimal'; text: string } | { kind: 'fraction'; whole: number; num: number; den: number };
export function parseMathLabel(label: string): MathValue {
  const primary = label.split('(')[0].trim();
  const mixed = primary.match(/^(\d+)\s*(?:\+|\s)\s*(\d+)\/(\d+)$/);
  if (mixed) return { kind: 'fraction', whole: Number(mixed[1]), num: Number(mixed[2]), den: Number(mixed[3]) };
  const fraction = primary.match(/^(\d+)\/(\d+)$/);
  if (fraction) return { kind: 'fraction', whole: 0, num: Number(fraction[1]), den: Number(fraction[2]) };
  return { kind: 'decimal', text: primary };
}
export function sumLabel(value: Fraction, mode: Mode): string {
  if (value.den === 1) return String(value.num);
  if (mode === 'easy') return String(Math.round(value.num / value.den * 1000) / 1000).replace('.', ',');
  const whole = mode === 'hard' ? Math.floor(value.num / value.den) : 0;
  return whole ? `${whole} ${value.num % value.den}/${value.den}` : `${value.num}/${value.den}`;
}
export function MathNumber({ value, size = 22, color = '#254E49', testID }: { value: string; size?: number; color?: string; testID?: string }) {
  const parsed = parseMathLabel(value);
  const label = parsed.kind === 'decimal' ? parsed.text : `${parsed.whole ? parsed.whole + ' và ' : ''}${parsed.num} phần ${parsed.den}`;
  return <View testID={testID} accessible accessibilityLabel={label} style={s.row}>
    {parsed.kind === 'decimal' ? <Text style={{ fontSize: size, lineHeight: size * 1.25, color, fontWeight: '900' }}>{parsed.text}</Text> :
      <>{parsed.whole > 0 && <Text style={{ fontSize: size, color, fontWeight: '900', marginRight: 5 }}>{parsed.whole}</Text>}
        <View style={s.fraction}><Text style={{ fontSize: size * .7, color, fontWeight: '800' }}>{parsed.num}</Text>
          <View style={{ height: 2, alignSelf: 'stretch', backgroundColor: color, minWidth: size * .65 }} />
          <Text style={{ fontSize: size * .7, color, fontWeight: '800' }}>{parsed.den}</Text></View></>}
  </View>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 1 }, fraction: { alignItems: 'center', paddingHorizontal: 2 } });
