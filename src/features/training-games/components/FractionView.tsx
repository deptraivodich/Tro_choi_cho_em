import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface FractionViewProps {
  numerator: number | string;
  denominator: number | string;
  whole?: number | string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const FractionView: React.FC<FractionViewProps> = ({
  numerator,
  denominator,
  whole,
  size = 'md',
  color = colors.textPrimary,
}) => {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const numDenFontSize = isSmall ? 13 : isLarge ? 20 : 16;
  const wholeFontSize = isSmall ? 18 : isLarge ? 28 : 22;
  const barHeight = isSmall ? 1.5 : isLarge ? 2.5 : 2;

  return (
    <View style={styles.container}>
      {whole !== undefined && Number(whole) !== 0 && (
        <Text style={[styles.wholeText, { fontSize: wholeFontSize, color }]}>
          {whole}
        </Text>
      )}
      <View style={styles.fractionStack}>
        <Text style={[styles.partText, { fontSize: numDenFontSize, color }]}>
          {numerator}
        </Text>
        <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
        <Text style={[styles.partText, { fontSize: numDenFontSize, color }]}>
          {denominator}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  wholeText: {
    fontWeight: '700',
    marginRight: 6,
  },
  fractionStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  partText: {
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  bar: {
    width: '100%',
    minWidth: 16,
    marginVertical: 2,
    borderRadius: 1,
  },
});
