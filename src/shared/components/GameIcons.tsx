import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Polygon,
  G,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { GameId } from '../types/index';
import { colors } from '../theme/colors';

interface GameIconProps {
  gameId: GameId;
  size?: number;
}

export const GameIcon: React.FC<GameIconProps> = ({ gameId, size = 64 }) => {
  const vb = '0 0 100 100';

  switch (gameId) {
    case 'energy-defense':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="towerGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#A855F7" />
              <Stop offset="1" stopColor="#6B21A8" />
            </LinearGradient>
            <LinearGradient id="energyGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#38BDF8" />
              <Stop offset="1" stopColor="#0284C7" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="#F3E8FF" />
          {/* Base */}
          <Rect x="30" y="68" width="40" height="14" rx="4" fill="#6B21A8" />
          {/* Tower Body */}
          <Polygon points="36,68 44,36 56,36 64,68" fill="url(#towerGrad)" />
          {/* Energy Core */}
          <Circle cx="50" cy="30" r="14" fill="url(#energyGrad)" />
          <Circle cx="50" cy="30" r="8" fill="#E0F2FE" />
          {/* Lightning Spark */}
          <Path d="M52 22 L45 31 L51 31 L48 38 L57 29 L51 29 Z" fill="#FBBF24" />
          {/* Energy Ring */}
          <Circle cx="50" cy="30" r="20" stroke="#38BDF8" strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
        </Svg>
      );

    case 'planet-rescue':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="planetGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#0EA5E9" />
              <Stop offset="1" stopColor="#1E3A8A" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="#E0F2FE" />
          {/* Planet */}
          <Circle cx="48" cy="52" r="26" fill="url(#planetGrad)" />
          <Circle cx="38" cy="44" r="6" fill="#38BDF8" opacity="0.6" />
          <Circle cx="58" cy="62" r="4" fill="#38BDF8" opacity="0.6" />
          {/* Orbit Shield */}
          <Path
            d="M20 54 A 36 14 0 1 0 76 50"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="3.5"
            strokeDasharray="6 4"
          />
          {/* Spaceship */}
          <G transform="translate(62, 22) rotate(35)">
            <Polygon points="10,0 20,20 0,20" fill="#EF4444" />
            <Polygon points="7,20 10,26 13,20" fill="#FBBF24" />
            <Circle cx="10" cy="12" r="3" fill="#FFFFFF" />
          </G>
        </Svg>
      );

    case 'terrain-racing':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#10B981" />
              <Stop offset="1" stopColor="#047857" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="#ECFDF5" />
          {/* Hills */}
          <Path
            d="M4 64 Q 28 42 50 60 T 96 52 L96 94 L4 94 Z"
            fill="url(#hillGrad)"
          />
          {/* Buggy / Race Car */}
          <G transform="translate(36, 38) rotate(-8)">
            <Rect x="0" y="8" width="30" height="12" rx="4" fill="#F43F5E" />
            <Polygon points="6,8 12,0 22,0 26,8" fill="#FB7185" />
            <Circle cx="8" cy="20" r="6" fill="#1F2937" />
            <Circle cx="8" cy="20" r="3" fill="#D1D5DB" />
            <Circle cx="24" cy="20" r="6" fill="#1F2937" />
            <Circle cx="24" cy="20" r="3" fill="#D1D5DB" />
            {/* Speed flag */}
            <Line x1="-4" y1="6" x2="-4" y2="16" stroke="#9CA3AF" strokeWidth="2" />
          </G>
        </Svg>
      );

    case 'race-to-finish':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="raceBgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#D1FAE5" />
              <Stop offset="1" stopColor="#FEF3C7" />
            </LinearGradient>
            <LinearGradient id="diceGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#F3F4F6" />
            </LinearGradient>
            <LinearGradient id="goldCup" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FDE047" />
              <Stop offset="1" stopColor="#D97706" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="url(#raceBgGrad)" />

          {/* Stepping stone path curve */}
          <Path
            d="M 18 72 Q 40 85 65 68 T 84 32"
            stroke="#D97706"
            strokeWidth="5"
            strokeDasharray="6 4"
            fill="none"
            strokeLinecap="round"
          />

          {/* 3D Dice */}
          <G transform="translate(18, 28)">
            {/* Shadow */}
            <Rect x="4" y="8" width="36" height="36" rx="8" fill="rgba(0, 0, 0, 0.15)" />
            {/* Cube */}
            <Rect x="2" y="4" width="36" height="36" rx="8" fill="url(#diceGrad)" stroke="#D1D5DB" strokeWidth="1.5" />
            {/* Dots (Number 3 or 5) */}
            <Circle cx="10" cy="12" r="3" fill="#DC2626" />
            <Circle cx="20" cy="22" r="3" fill="#1F2937" />
            <Circle cx="30" cy="32" r="3" fill="#1F2937" />
            <Circle cx="10" cy="32" r="3" fill="#1F2937" />
            <Circle cx="30" cy="12" r="3" fill="#1F2937" />
          </G>

          {/* Golden Trophy (Finish Line) */}
          <G transform="translate(52, 22)">
            {/* Cup bowl */}
            <Path d="M 10 12 L 30 12 L 26 28 Q 20 34 14 28 Z" fill="url(#goldCup)" />
            {/* Handles */}
            <Path d="M 10 14 C 4 14 4 24 12 24" stroke="#F59E0B" strokeWidth="2.5" fill="none" />
            <Path d="M 30 14 C 36 14 36 24 28 24" stroke="#F59E0B" strokeWidth="2.5" fill="none" />
            {/* Stem & base */}
            <Rect x="18" y="32" width="4" height="6" fill="#D97706" />
            <Rect x="12" y="38" width="16" height="5" rx="2" fill="#78350F" />
            {/* Sparkle star */}
            <Polygon points="20,6 22,10 26,10 23,13 24,17 20,14 16,17 17,13 14,10 18,10" fill="#FBBF24" />
          </G>

          {/* Little green wing badge */}
          <G transform="translate(10, 62)">
            <Circle cx="10" cy="10" r="10" fill="#10B981" />
            <Path d="M 5 12 Q 11 6 15 9 Q 12 14 6 14 Z" fill="#FFFFFF" />
          </G>
        </Svg>
      );

    case 'block-island':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="islandGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#34D399" />
              <Stop offset="1" stopColor="#059669" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="#EFF6FF" />
          {/* Floating Island Cliff */}
          <Polygon points="16,56 84,56 70,84 30,84" fill="#78350F" />
          <Polygon points="16,56 84,56 80,64 20,64" fill="#92400E" />
          <Rect x="14" y="50" width="72" height="8" rx="4" fill="url(#islandGrad)" />
          {/* Grid Blocks / Castles on Island */}
          <Rect x="26" y="32" width="16" height="18" fill="#F59E0B" rx="2" />
          <Rect x="44" y="24" width="20" height="26" fill="#3B82F6" rx="2" />
          <Polygon points="44,24 54,12 64,24" fill="#EF4444" />
          <Rect x="66" y="36" width="12" height="14" fill="#10B981" rx="2" />
          {/* Measuring ruler markings */}
          <Line x1="20" y1="53" x2="80" y2="53" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="3 3" />
        </Svg>
      );

    case 'vault-code':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="vaultGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#64748B" />
              <Stop offset="1" stopColor="#1E293B" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="#F1F5F9" />
          {/* Vault Door Outer Ring */}
          <Circle cx="50" cy="50" r="36" fill="url(#vaultGrad)" />
          <Circle cx="50" cy="50" r="28" fill="#334155" />
          {/* Dial Spokes */}
          <Line x1="50" y1="26" x2="50" y2="74" stroke="#94A3B8" strokeWidth="3" />
          <Line x1="26" y1="50" x2="74" y2="50" stroke="#94A3B8" strokeWidth="3" />
          <Circle cx="50" cy="50" r="12" fill="#FBBF24" />
          <Circle cx="50" cy="50" r="6" fill="#D97706" />
          {/* Digital LED Display */}
          <Rect x="30" y="68" width="40" height="12" rx="3" fill="#0284C7" />
          <SvgText
            x="50"
            y="78"
            fill="#FFFFFF"
            fontSize="8"
            fontWeight="bold"
            textAnchor="middle"
          >
            45.60
          </SvgText>
        </Svg>
      );

    case 'floating-market':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#38BDF8" />
              <Stop offset="1" stopColor="#0284C7" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="#E0F2FE" />
          {/* River Water Waves */}
          <Path
            d="M8 68 Q 28 62 48 68 T 92 68 L92 92 L8 92 Z"
            fill="url(#waterGrad)"
          />
          {/* Wooden Boat */}
          <Path
            d="M16 54 Q 50 68 84 54 L78 66 Q 50 74 22 66 Z"
            fill="#B45309"
          />
          {/* Watermelons & Produce */}
          <Circle cx="36" cy="48" r="8" fill="#15803D" />
          <Circle cx="48" cy="46" r="7" fill="#16A34A" />
          <Circle cx="60" cy="49" r="8" fill="#DC2626" />
          <Polygon points="50,22 64,36 36,36" fill="#FBBF24" />
          {/* Weight Scale balance icon */}
          <Circle cx="50" cy="22" r="3" fill="#78350F" />
        </Svg>
      );

    case 'rhythm-bakery':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="cakeGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FDE047" />
              <Stop offset="1" stopColor="#F59E0B" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="#FEF3C7" />
          {/* Conveyor Belt */}
          <Rect x="12" y="66" width="76" height="14" rx="4" fill="#4B5563" />
          <Circle cx="24" cy="73" r="4" fill="#9CA3AF" />
          <Circle cx="44" cy="73" r="4" fill="#9CA3AF" />
          <Circle cx="64" cy="73" r="4" fill="#9CA3AF" />
          <Circle cx="80" cy="73" r="4" fill="#9CA3AF" />
          {/* Pie / Cake on conveyor */}
          <Path
            d="M32 58 C32 46 68 46 68 58 Z"
            fill="url(#cakeGrad)"
          />
          <Rect x="30" y="58" width="40" height="8" rx="2" fill="#D97706" />
          {/* Strawberry slices on top */}
          <Polygon points="44,48 48,40 52,48" fill="#EF4444" />
          <Polygon points="54,50 58,42 62,50" fill="#EF4444" />
          {/* Musical Rhythm Note */}
          <G transform="translate(64, 18)">
            <Circle cx="6" cy="18" r="4" fill="#7C3AED" />
            <Line x1="10" y1="18" x2="10" y2="6" stroke="#7C3AED" strokeWidth="2.5" />
            <Path d="M10 6 Q 16 8 16 14" stroke="#7C3AED" strokeWidth="2.5" fill="none" />
          </G>
        </Svg>
      );

    case 'treasure-dive':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="subGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FBBF24" />
              <Stop offset="1" stopColor="#D97706" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="#ECFEFF" />
          {/* Ocean Depth */}
          <Path d="M4 64 L96 64 L96 96 L4 96 Z" fill="#0891B2" opacity="0.4" />
          {/* Submarine Body */}
          <Rect x="20" y="40" width="50" height="24" rx="12" fill="url(#subGrad)" />
          {/* Periscope / Conning tower */}
          <Rect x="38" y="30" width="14" height="12" rx="3" fill="#D97706" />
          {/* Submarine Window */}
          <Circle cx="34" cy="52" r="6" fill="#38BDF8" />
          <Circle cx="34" cy="52" r="3" fill="#FFFFFF" />
          <Circle cx="52" cy="52" r="6" fill="#38BDF8" />
          {/* Propeller */}
          <Polygon points="16,46 12,42 12,62 16,58" fill="#92400E" />
          {/* Treasure chest */}
          <G transform="translate(66, 68)">
            <Rect x="0" y="6" width="22" height="16" rx="2" fill="#B45309" />
            <Path d="M0 6 Q 11 0 22 6 Z" fill="#F59E0B" />
            <Circle cx="11" cy="12" r="2.5" fill="#FBBF24" />
          </G>
        </Svg>
      );

    case 'royal-artillery':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Defs>
            <LinearGradient id="cannonGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#475569" />
              <Stop offset="1" stopColor="#0F172A" />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="46" fill="#FFF7ED" />
          {/* Citadel Stone Wall */}
          <Rect x="12" y="68" width="76" height="24" rx="2" fill="#78350F" />
          <Rect x="12" y="62" width="16" height="8" fill="#92400E" />
          <Rect x="42" y="62" width="16" height="8" fill="#92400E" />
          <Rect x="72" y="62" width="16" height="8" fill="#92400E" />
          {/* Protractor Arc */}
          <Path
            d="M24 64 A 28 28 0 0 1 76 64"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          {/* Cannon Barrel pointing at angle */}
          <G transform="translate(40, 54) rotate(-35)">
            <Polygon points="0,4 36,0 36,16 0,12" fill="url(#cannonGrad)" />
            <Circle cx="0" cy="8" r="8" fill="#D97706" />
          </G>
          {/* Wheel */}
          <Circle cx="40" cy="56" r="10" fill="#B45309" />
          <Circle cx="40" cy="56" r="4" fill="#FBBF24" />
        </Svg>
      );

    default:
      return null;
  }
};
