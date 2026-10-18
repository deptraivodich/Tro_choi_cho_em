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
/** Long division of integers: never round a rational value for presentation. */
function exactDecimal(value: Fraction): string | null {
  let numerator = BigInt(value.num), denominator = BigInt(value.den);
  const negative = (numerator < 0n) !== (denominator < 0n);
  numerator = numerator < 0n ? -numerator : numerator;
  denominator = denominator < 0n ? -denominator : denominator;
  if (!denominator) return null;
  let a = numerator, b = denominator;
  while (b) [a, b] = [b, a % b];
  numerator /= a; denominator /= a;
  let finite = denominator;
  while (finite % 2n === 0n) finite /= 2n;
  while (finite % 5n === 0n) finite /= 5n;
  if (finite !== 1n) return null;
  let text = String(numerator / denominator), remainder = numerator % denominator;
  if (remainder) text += ',';
  while (remainder) {
    remainder *= 10n;
    text += String(remainder / denominator);
    remainder %= denominator;
  }
  return (negative && numerator ? '-' : '') + text;
}

export function sumLabel(value: Fraction, mode: Mode, operands: readonly string[] = []): string {
  if (value.num % value.den === 0) return String(value.num / value.den);
  // Practice mixes representations: follow the selected operands, not just the mode.
  const fractional = mode === 'hard' || operands.some(label => parseMathLabel(label).kind === 'fraction');
  if (!fractional) {
    const decimal = exactDecimal(value);
    if (decimal !== null) return decimal;
  }
  const whole = mode === 'hard' ? Math.floor(value.num / value.den) : 0;
  return whole ? `${whole} ${value.num % value.den}/${value.den}` : `${value.num}/${value.den}`;
}
export function MathNumber({ value, size = 22, color = '#254E49', testID }: { value: string; size?: number; color?: string; testID?: string }) {
  const parsed = parseMathLabel(value);
  const label = parsed.kind === 'decimal' ? parsed.text : `${parsed.whole ? parsed.whole + ' và ' : ''}${parsed.num} phần ${parsed.den}`;
  return <View testID={testID} accessible accessibilityLabel={label} style={s.row}>
    {parsed.kind === 'decimal' ? <Text style={{ fontSize: size, lineHeight: size * 1.25, color, fontWeight: '900' }}>{parsed.text}</Text> :
      <>{parsed.whole > 0 && <Text style={{ fontSize: size, color, fontWeight: '900', marginRight: 5 }}>{parsed.whole}</Text>}
        <View style={s.fraction}><Text style={{ fontSize: size * .7, lineHeight: size * .82, color, fontWeight: '800' }}>{parsed.num}</Text>
          <View style={{ height: 2, alignSelf: 'stretch', backgroundColor: color, minWidth: size * .65 }} />
          <Text style={{ fontSize: size * .7, lineHeight: size * .82, color, fontWeight: '800' }}>{parsed.den}</Text></View></>}
  </View>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 1 }, fraction: { alignItems: 'center', paddingHorizontal: 2 } });
