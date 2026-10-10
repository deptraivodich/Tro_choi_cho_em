/**
 * Game Palettes: Dedicated environments and visual identities for all 10 games
 * Moving away from flat pastel purple across the board.
 */
export interface GamePalette {
  id: string;
  worldName: string;
  skyGradient: [string, string];
  groundColor: string;
  pathColor: string;
  pathBorder: string;
  accent: string;
  accentGlow: string;
  cardBg: string;
  cardBorder: string;
  textHeading: string;
  panelBg: string;
}

export const GAME_PALETTES: Record<string, GamePalette> = {
  'energy-defense': {
    id: 'energy-defense',
    worldName: 'Thung Lũng Năng Lượng Tinh Thể',
    skyGradient: ['#1E1B4B', '#312E81'], // Deep night nebula
    groundColor: '#1E293B', // Slate biome
    pathColor: '#334155', // Cobblestone path
    pathBorder: '#64748B',
    accent: '#10B981', // Emerald mana laser
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    cardBg: '#0F172A',
    cardBorder: '#38BDF8',
    textHeading: '#F8FAFC',
    panelBg: '#1E293B',
  },
  'planet-rescue': {
    id: 'planet-rescue',
    worldName: 'Hạm Đội Thiên Hà Khơi Xa',
    skyGradient: ['#0B0F19', '#1E1B4B'],
    groundColor: '#0F172A',
    pathColor: '#1E293B',
    pathBorder: '#38BDF8',
    accent: '#38BDF8',
    accentGlow: 'rgba(56, 189, 248, 0.4)',
    cardBg: '#111827',
    cardBorder: '#818CF8',
    textHeading: '#F0F9FF',
    panelBg: '#1E1B4B',
  },
  'terrain-racing': {
    id: 'terrain-racing',
    worldName: 'Đường Đua Đồi Cát & Khe Núi',
    skyGradient: ['#38BDF8', '#BAE6FD'], // Daytime clear blue sky
    groundColor: '#EA580C', // Terracotta canyon earth
    pathColor: '#FDBA74',
    pathBorder: '#C2410C',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.4)',
    cardBg: '#FFF7ED',
    cardBorder: '#FB923C',
    textHeading: '#7C2D12',
    panelBg: '#FFFFFF',
  },
  'race-to-finish': {
    id: 'race-to-finish',
    worldName: 'Khu Rừng Phiêu Lưu Xúc Xắc',
    skyGradient: ['#065F46', '#10B981'], // Forest greens
    groundColor: '#FEF3C7',
    pathColor: '#FDE68A',
    pathBorder: '#D97706',
    accent: '#059669', // Emerald forest
    accentGlow: 'rgba(5, 150, 105, 0.4)',
    cardBg: '#FFFFFF',
    cardBorder: '#D97706',
    textHeading: '#78350F',
    panelBg: '#FEF3C7',
  },
  'block-island': {
    id: 'block-island',
    worldName: 'Quần Đảo Khối Ngọc Biển Xanh',
    skyGradient: ['#0284C7', '#7DD3FC'], // Tropical ocean
    groundColor: '#16A34A', // Emerald island grass
    pathColor: '#FDE047', // Sandy beach
    pathBorder: '#CA8A04',
    accent: '#059669',
    accentGlow: 'rgba(5, 150, 105, 0.4)',
    cardBg: '#FFFFFF',
    cardBorder: '#86EFAC',
    textHeading: '#14532D',
    panelBg: '#F0FDF4',
  },
  'vault-code': {
    id: 'vault-code',
    worldName: 'Căn Cứ Cửa Hầm Thép Bí Mật',
    skyGradient: ['#0F172A', '#1E293B'], // Heavy vault interior
    groundColor: '#0F172A',
    pathColor: '#334155',
    pathBorder: '#64748B',
    accent: '#F59E0B', // Glowing terminal amber
    accentGlow: 'rgba(245, 158, 11, 0.4)',
    cardBg: '#1E293B',
    cardBorder: '#F59E0B',
    textHeading: '#F8FAFC',
    panelBg: '#0F172A',
  },
  'floating-market': {
    id: 'floating-market',
    worldName: 'Chợ Nổi Sông Nước Miền Tây',
    skyGradient: ['#0284C7', '#E0F2FE'], // Mekong river morning
    groundColor: '#0D9488', // Teal river water
    pathColor: '#99F6E4',
    pathBorder: '#0F766E',
    accent: '#E11D48', // Tropical dragonfruit / watermelon
    accentGlow: 'rgba(225, 29, 72, 0.4)',
    cardBg: '#FFFFFF',
    cardBorder: '#5EEAD4',
    textHeading: '#134E4A',
    panelBg: '#F0FDFA',
  },
  'rhythm-bakery': {
    id: 'rhythm-bakery',
    worldName: 'Tiệm Bánh Ngọt Nhịp Giai Điệu',
    skyGradient: ['#FDF2F8', '#FCE7F3'], // Warm pastel bakery
    groundColor: '#FFFBEB',
    pathColor: '#FDE68A',
    pathBorder: '#D97706',
    accent: '#D97706', // Baked honey gold
    accentGlow: 'rgba(217, 119, 6, 0.4)',
    cardBg: '#FFFFFF',
    cardBorder: '#FCD34D',
    textHeading: '#78350F',
    panelBg: '#FFFBEB',
  },
  'treasure-dive': {
    id: 'treasure-dive',
    worldName: 'Vực Thẳm Đại Dương & Tàu Ngầm Vàng',
    skyGradient: ['#0369A1', '#082F49'], // Sunlit reef down to abyssal deep
    groundColor: '#0C4A6E',
    pathColor: '#075985',
    pathBorder: '#0284C7',
    accent: '#FBBF24', // Gold chest glow
    accentGlow: 'rgba(251, 191, 36, 0.5)',
    cardBg: '#082F49',
    cardBorder: '#38BDF8',
    textHeading: '#F0F9FF',
    panelBg: '#0C4A6E',
  },
  'royal-artillery': {
    id: 'royal-artillery',
    worldName: 'Thành Lũy Cung Đình Đại Nội',
    skyGradient: ['#78350F', '#451A03'], // Sunset fortress dusk
    groundColor: '#57534E', // Ancient stone battlement
    pathColor: '#78716C',
    pathBorder: '#A8A29E',
    accent: '#DC2626', // Imperial banner crimson
    accentGlow: 'rgba(220, 38, 38, 0.4)',
    cardBg: '#292524',
    cardBorder: '#F59E0B',
    textHeading: '#FEF3C7',
    panelBg: '#1C1917',
  },
};
