import React from 'react';
import Svg, { Path, Ellipse } from 'react-native-svg';

export const CrystalArt = React.memo(function CrystalArt({ size = 48, color = 'violet' }: { size?: number; color?: 'violet' | 'cyan' | 'gold' | 'pink' }) {
  const colors = { violet: ['#C8ACFF', '#8B62DC', '#573AAB'], cyan: ['#A1FFF0', '#3CC8BC', '#158B90'], gold: ['#FFF1B0', '#F2C05E', '#D48E35'], pink: ['#FFC1DA', '#DF86BB', '#A65293'] }[color];
  return <Svg width={size} height={size} viewBox="0 0 64 72" fill="none" style={{ position: 'relative', zIndex: 1 }}>
    <Ellipse cx="32" cy="66" rx="18" ry="4" fill={colors[2]} opacity=".14" />
    <Path d="M32 3 52 23 45 49 32 62 15 46 11 24Z" fill={colors[2]} />
    <Path d="M32 3 52 23 32 34 11 24Z" fill={colors[0]} />
    <Path d="m11 24 21 10v28L15 46Z" fill={colors[1]} />
    <Path d="m32 3-9 22 9 9 10-10Z" fill="#FFFFFF" opacity=".57" />
    <Path d="m32 34 20-11-7 26-13 13Z" fill={colors[1]} opacity=".65" />
    <Path d="M32 5 13 24l3 17" stroke="#FFFFFF" strokeWidth="2" opacity=".7" />
    <Path d="m49 7 1.5 4.5L55 13l-4.5 1.5L49 19l-1.5-4.5L43 13l4.5-1.5Z" fill={colors[0]} />
  </Svg>;
});
