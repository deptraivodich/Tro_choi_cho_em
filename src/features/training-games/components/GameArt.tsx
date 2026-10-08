import React from 'react';
import Svg, {
  Path,
  Rect,
  Circle,
  Polygon,
  G,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Ellipse,
  Text as SvgText,
} from 'react-native-svg';

// ============================================================================
// ENERGY DEFENSE ART
// ============================================================================

/**
 * Illustrated Laser Defense Turret
 */
export const TurretArt: React.FC<{
  x: number;
  y: number;
  isCharged: boolean;
  size?: number;
}> = ({ x, y, isCharged, size = 64 }) => {
  const crystalColor = isCharged ? '#10B981' : '#8B5CF6';
  const glowColor = isCharged ? '#34D399' : '#A78BFA';

  return (
    <G transform={`translate(${x - size / 2}, ${y - size / 2})`}>
      {/* Platform Base */}
      <Ellipse cx={size / 2} cy={size * 0.8} rx={size * 0.45} ry={size * 0.16} fill="#1E293B" />
      <Ellipse cx={size / 2} cy={size * 0.77} rx={size * 0.4} ry={size * 0.13} fill="#334155" />
      <Rect x={size * 0.3} y={size * 0.6} width={size * 0.4} height={size * 0.18} rx={4} fill="#475569" />

      {/* Mechanical Copper Coils */}
      <Rect x={size * 0.35} y={size * 0.48} width={size * 0.3} height={size * 0.12} rx={3} fill="#B45309" />
      <Line x1={size * 0.38} y1={size * 0.49} x2={size * 0.38} y2={size * 0.59} stroke="#F59E0B" strokeWidth={2} />
      <Line x1={size * 0.5} y1={size * 0.49} x2={size * 0.5} y2={size * 0.59} stroke="#F59E0B" strokeWidth={2} />
      <Line x1={size * 0.62} y1={size * 0.49} x2={size * 0.62} y2={size * 0.59} stroke="#F59E0B" strokeWidth={2} />

      {/* Floating Power Crystal */}
      {isCharged && (
        <Circle cx={size / 2} cy={size * 0.3} r={size * 0.35} fill={glowColor} opacity={0.3} />
      )}
      <Polygon
        points={`
          ${size * 0.5},${size * 0.1}
          ${size * 0.7},${size * 0.28}
          ${size * 0.62},${size * 0.46}
          ${size * 0.38},${size * 0.46}
          ${size * 0.3},${size * 0.28}
        `}
        fill={crystalColor}
      />
      {/* Crystal facet highlight */}
      <Polygon
        points={`
          ${size * 0.5},${size * 0.1}
          ${size * 0.62},${size * 0.28}
          ${size * 0.5},${size * 0.46}
        `}
        fill="#FFFFFF"
        opacity={0.35}
      />
    </G>
  );
};

/**
 * Illustrated Base Fortress Citadel
 */
export const CitadelArt: React.FC<{
  x: number;
  y: number;
  hpPercent: number;
  size?: number;
}> = ({ x, y, hpPercent, size = 70 }) => {
  return (
    <G transform={`translate(${x - size / 2}, ${y - size / 2})`}>
      {/* Energy Shield Dome */}
      <Path
        d={`M ${size * 0.05} ${size * 0.85} A ${size * 0.45} ${size * 0.45} 0 0 1 ${size * 0.95} ${size * 0.85}`}
        stroke={hpPercent > 30 ? '#38BDF8' : '#EF4444'}
        strokeWidth={3}
        fill={hpPercent > 30 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
      />

      {/* Main Stone Fortress Body */}
      <Rect x={size * 0.2} y={size * 0.4} width={size * 0.6} height={size * 0.5} rx={6} fill="#334155" />
      <Rect x={size * 0.25} y={size * 0.45} width={size * 0.5} height={size * 0.45} rx={4} fill="#1E293B" />

      {/* Crenels (Móng thành) */}
      <Rect x={size * 0.2} y={size * 0.32} width={size * 0.14} height={size * 0.1} fill="#475569" />
      <Rect x={size * 0.43} y={size * 0.32} width={size * 0.14} height={size * 0.1} fill="#475569" />
      <Rect x={size * 0.66} y={size * 0.32} width={size * 0.14} height={size * 0.1} fill="#475569" />

      {/* High-tech Power Reactor Core */}
      <Circle cx={size * 0.5} cy={size * 0.62} r={size * 0.15} fill="#0F172A" />
      <Circle
        cx={size * 0.5}
        cy={size * 0.62}
        r={size * 0.1}
        fill={hpPercent > 30 ? '#0284C7' : '#DC2626'}
      />
      <Circle cx={size * 0.5} cy={size * 0.62} r={size * 0.05} fill="#FFFFFF" />

      {/* Flag / Antenna */}
      <Line x1={size * 0.5} y1={size * 0.32} x2={size * 0.5} y2={size * 0.15} stroke="#64748B" strokeWidth={2} />
      <Polygon points={`${size * 0.5},${size * 0.15} ${size * 0.72},${size * 0.22} ${size * 0.5},${size * 0.29}`} fill="#F59E0B" />
    </G>
  );
};

/**
 * Illustrated Creeps (Quái vật)
 */
export const CreepArt: React.FC<{
  x: number;
  y: number;
  type?: 'scout' | 'slime' | 'golem';
  hp: number;
  maxHp: number;
  size?: number;
}> = ({ x, y, type = 'slime', hp, maxHp, size = 36 }) => {
  const hpRatio = Math.max(0, Math.min(1, hp / maxHp));

  return (
    <G transform={`translate(${x - size / 2}, ${y - size / 2})`}>
      {/* Shadow */}
      <Ellipse cx={size / 2} cy={size * 0.88} rx={size * 0.38} ry={size * 0.12} fill="rgba(0,0,0,0.25)" />

      {type === 'slime' && (
        <G>
          {/* Slime Jelly Body */}
          <Path
            d={`
              M ${size * 0.2} ${size * 0.8}
              C ${size * 0.1} ${size * 0.5}, ${size * 0.25} ${size * 0.2}, ${size * 0.5} ${size * 0.2}
              C ${size * 0.75} ${size * 0.2}, ${size * 0.9} ${size * 0.5}, ${size * 0.8} ${size * 0.8}
              Z
            `}
            fill="#EF4444"
          />
          {/* Inner highlight */}
          <Ellipse cx={size * 0.4} cy={size * 0.35} rx={size * 0.12} ry={size * 0.08} fill="#FCA5A5" />
          {/* Eyes */}
          <Circle cx={size * 0.4} cy={size * 0.5} r={3.5} fill="#FFFFFF" />
          <Circle cx={size * 0.42} cy={size * 0.5} r={2} fill="#1E1B4B" />
          <Circle cx={size * 0.6} cy={size * 0.5} r={3.5} fill="#FFFFFF" />
          <Circle cx={size * 0.62} cy={size * 0.5} r={2} fill="#1E1B4B" />
        </G>
      )}

      {type === 'scout' && (
        <G>
          {/* Winged Scout Bug */}
          <Ellipse cx={size * 0.25} cy={size * 0.35} rx={size * 0.2} ry={size * 0.1} fill="#BAE6FD" opacity={0.7} />
          <Ellipse cx={size * 0.75} cy={size * 0.35} rx={size * 0.2} ry={size * 0.1} fill="#BAE6FD" opacity={0.7} />
          {/* Body */}
          <Ellipse cx={size / 2} cy={size * 0.55} rx={size * 0.28} ry={size * 0.32} fill="#F97316" />
          <Line x1={size * 0.35} y1={size * 0.3} x2={size * 0.2} y2={size * 0.15} stroke="#C2410C" strokeWidth={2} />
          <Line x1={size * 0.65} y1={size * 0.3} x2={size * 0.8} y2={size * 0.15} stroke="#C2410C" strokeWidth={2} />
          {/* Big eye */}
          <Circle cx={size / 2} cy={size * 0.5} r={5} fill="#1E293B" />
          <Circle cx={size / 2} cy={size * 0.5} r={3} fill="#E2E8F0" />
        </G>
      )}

      {type === 'golem' && (
        <G>
          {/* Armored Rock Golem */}
          <Rect x={size * 0.2} y={size * 0.3} width={size * 0.6} height={size * 0.55} rx={6} fill="#64748B" />
          <Rect x={size * 0.26} y={size * 0.36} width={size * 0.48} height={size * 0.42} rx={3} fill="#475569" />
          <Circle cx={size * 0.5} cy={size * 0.52} r={4} fill="#F59E0B" />
        </G>
      )}

      {/* HP Bar */}
      <Rect x={size * 0.1} y={size * 0.05} width={size * 0.8} height={4} rx={2} fill="#1F2937" />
      <Rect
        x={size * 0.1}
        y={size * 0.05}
        width={size * 0.8 * hpRatio}
        height={4}
        rx={2}
        fill={hpRatio > 0.4 ? '#10B981' : '#EF4444'}
      />
    </G>
  );
};

/**
 * Laser Beam and Hit Impact Burst FX
 */
export const LaserBeamArt: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}> = ({ x1, y1, x2, y2 }) => {
  return (
    <G>
      {/* Outer Glow */}
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#34D399" strokeWidth={8} strokeLinecap="round" opacity={0.6} />
      {/* Intense Core */}
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      {/* Impact Sparks at target */}
      <Circle cx={x2} cy={y2} r={10} fill="#6EE7B7" opacity={0.7} />
      <Circle cx={x2} cy={y2} r={5} fill="#FFFFFF" />
    </G>
  );
};
