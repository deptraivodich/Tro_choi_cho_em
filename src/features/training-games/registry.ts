import React from 'react';
import { GameId, GameMetadata } from './types';
import { colors } from './theme/colors';

// Import all 10 game screens
import { EnergyDefenseScreen } from './games/energy-defense';
import { PlanetRescueScreen } from './games/planet-rescue';
import { TerrainRacingScreen } from './games/terrain-racing';
import { RaceToFinishScreen } from './games/race-to-finish';
import { BlockIslandScreen } from './games/block-island';
import { VaultCodeScreen } from './games/vault-code';
import { FloatingMarketScreen } from './games/floating-market';
import { RhythmBakeryScreen } from './games/rhythm-bakery';
import { TreasureDiveScreen } from './games/treasure-dive';
import { RoyalArtilleryScreen } from './games/royal-artillery';

export interface GameRegistryEntry {
  metadata: GameMetadata;
  component: React.ComponentType<{ onExit: () => void }>;
}

export const GAME_REGISTRY: Record<GameId, GameRegistryEntry> = {
  'energy-defense': {
    metadata: {
      id: 'energy-defense',
      title: 'Thủ Thành Năng Lượng',
      tagline: 'Ghép năng lượng số thập phân và phân số để kích hoạt pháo bảo vệ căn cứ',
      topic: 'Số học & Phân số',
      mathSkill: 'Cộng/trừ số thập phân và phân số',
      description: 'Quái vật đang tiến về căn cứ! Tính toán và chọn các mảnh năng lượng chính xác (ví dụ 0,5 + 1,0 = 1,5) để sạc đầy trụ pháo tiêu diệt quái vật.',
      recommendedGrade: 'Lớp 4 - 5',
      durationMinutes: 6,
      difficulty: 'easy',
      accentColor: colors.primary,
      badgeText: 'Thủ thành 2D',
    },
    component: EnergyDefenseScreen,
  },

  'planet-rescue': {
    metadata: {
      id: 'planet-rescue',
      title: 'Giải Cứu Hành Tinh',
      tagline: 'Chiến thuật theo lượt rút gọn và quy đồng mẫu số xuyên giáp lượng tử',
      topic: 'Phân số nâng cao',
      mathSkill: 'Rút gọn & quy đồng phân số',
      description: 'Hành trình vượt qua 5 trạm không gian, dùng Thẻ Rút Gọn để chia cho ước số chung (8/12 -> 2/3) và bắn pháo laser giải cứu hành tinh.',
      recommendedGrade: 'Lớp 4 - 5',
      durationMinutes: 15,
      difficulty: 'medium',
      accentColor: colors.cyan,
      badgeText: 'Chiến thuật thẻ',
    },
    component: PlanetRescueScreen,
  },

  'terrain-racing': {
    metadata: {
      id: 'terrain-racing',
      title: 'Siêu Xe Vượt Địa Hình',
      tagline: 'Tính vận tốc v = s : t để siêu xe phóng qua vực thẳm an toàn',
      topic: 'Toán chuyển động',
      mathSkill: 'Vận tốc, quãng đường, thời gian',
      description: 'Trước mỗi chặng đua, đọc kỹ quãng đường và thời gian để tính vận tốc cần thiết (v = s/t), cấu hình động cơ để xe bay qua hẻm núi!',
      recommendedGrade: 'Lớp 5',
      durationMinutes: 15,
      difficulty: 'medium',
      accentColor: colors.emerald,
      badgeText: 'Đua xe 2D',
    },
    component: TerrainRacingScreen,
  },

  'race-to-finish': {
    metadata: {
      id: 'race-to-finish',
      title: 'Đua Về Đích',
      tagline: 'Đua xúc xắc 21 ô thần tốc, nhận biết chẵn/lẻ và suy luận chiến thuật',
      topic: 'Số học & Chiến thuật',
      mathSkill: 'Nhận biết chẵn/lẻ & Đếm bước',
      description: 'Gieo xúc xắc vượt 21 ô đá zíc zắc trong rừng diệu kỳ! Số lẻ đi 1 ô, số chẵn đi 2 ô, tận dụng khiên phép và ngôi sao giải bất lợi để về đích trước tiên.',
      recommendedGrade: 'Lớp 3 - 5',
      durationMinutes: 8,
      difficulty: 'easy',
      accentColor: '#059669',
      badgeText: 'Đua bàn cờ 2D',
    },
    component: RaceToFinishScreen,
  },

  'block-island': {
    metadata: {
      id: 'block-island',
      title: 'Lãnh Chúa Đảo Khối',
      tagline: 'Quy hoạch đảo nổi với diện tích và chu vi hình học chuẩn xác',
      topic: 'Hình học phẳng',
      mathSkill: 'Diện tích & chu vi hình phẳng',
      description: 'Đặt và dỡ bỏ các khối đất trên lưới đảo 2D để xây kho bãi, tường thành. Chú ý loại trừ cạnh tiếp giáp nội bộ khi tính chu vi!',
      recommendedGrade: 'Lớp 4 - 5',
      durationMinutes: 12,
      difficulty: 'medium',
      accentColor: colors.amber,
      badgeText: 'Xây dựng đảo',
    },
    component: BlockIslandScreen,
  },

  'vault-code': {
    metadata: {
      id: 'vault-code',
      title: 'Mật Mã Cửa Hầm',
      tagline: 'Suy luận giá trị hàng chữ số và dấu hiệu chia hết để mở kho báu',
      topic: 'Cấu tạo số',
      mathSkill: 'Giá trị hàng, số thập phân, chia hết',
      description: 'Mỗi ngày có 3 cánh cửa mật mã. Dựa vào gợi ý hàng phần mười, lớn hơn/nhỏ hơn và dấu hiệu chia hết của phần nguyên để mở khóa trong 5 lượt.',
      recommendedGrade: 'Lớp 4 - 5',
      durationMinutes: 8,
      difficulty: 'hard',
      accentColor: colors.indigo,
      badgeText: 'Giải mật mã',
    },
    component: VaultCodeScreen,
  },

  'floating-market': {
    metadata: {
      id: 'floating-market',
      title: 'Thương Nhân Chợ Nổi',
      tagline: 'Quy đổi tấn - tạ - kg và tính toán doanh thu lợi nhuận chuyến buôn',
      topic: 'Đo lường & Tiền tệ',
      mathSkill: 'Đổi đơn vị khối lượng, lời/lỗ',
      description: 'Giong thuyền trên sông miền Tây, mua sỉ nông sản theo tấn, đổi sang kg để bán lẻ, tính chi phí vận chuyển và tối ưu hóa lợi nhuận ròng.',
      recommendedGrade: 'Lớp 4 - 5',
      durationMinutes: 12,
      difficulty: 'medium',
      accentColor: colors.teal,
      badgeText: 'Kinh doanh sông nước',
    },
    component: FloatingMarketScreen,
  },

  'rhythm-bakery': {
    metadata: {
      id: 'rhythm-bakery',
      title: 'Tiệm Bánh Nhịp Điệu',
      tagline: 'Đổi hỗn số sang phân số và nhặt nguyên liệu bắt nhịp băng chuyền',
      topic: 'Hỗn số & Phân số',
      mathSkill: 'Phân số và hỗn số',
      description: 'Đổi các đơn bánh hỗn số (ví dụ 2 1/2 = 5 phần 1/2) và bấm nhặt nguyên liệu đúng nhịp đèn để nhận thêm điểm thưởng nhịp điệu rộn ràng.',
      recommendedGrade: 'Lớp 4 - 5',
      durationMinutes: 5,
      difficulty: 'easy',
      accentColor: colors.violet,
      badgeText: 'Âm nhạc & Bánh',
    },
    component: RhythmBakeryScreen,
  },

  'treasure-dive': {
    metadata: {
      id: 'treasure-dive',
      title: 'Thợ Lặn Kho Báu',
      tagline: 'Đọc biểu đồ cột thống kê để điều khiển tàu ngầm trục vớt kho báu',
      topic: 'Thống kê & Xác suất',
      mathSkill: 'Đọc biểu đồ & xác suất cơ bản',
      description: 'Phân tích biểu đồ tỷ lệ phần trăm kho báu tại các tầng nước (50m, 150m, 300m), quản lý bình oxy và đưa tàu ngầm trở về mặt nước an toàn.',
      recommendedGrade: 'Lớp 4 - 5',
      durationMinutes: 8,
      difficulty: 'medium',
      accentColor: colors.secondary,
      badgeText: 'Thám hiểm đại dương',
    },
    component: TreasureDiveScreen,
  },

  'royal-artillery': {
    metadata: {
      id: 'royal-artillery',
      title: 'Xưởng Pháo Cung Đình',
      tagline: 'Đo góc nhọn, vuông, tù và chỉnh lực bắn thập phân trúng bia cung đình',
      topic: 'Góc & Đo lường',
      mathSkill: 'Đo góc (nhọn/vuông/tù) & lực thập phân',
      description: 'Khai hỏa đại bác trên hoàng thành! Góc nhọn (<90°) bắn sang phải, góc tù (120°) bắn sang trái vào các bia mục tiêu trên thành lũy.',
      recommendedGrade: 'Lớp 4 - 5',
      durationMinutes: 8,
      difficulty: 'hard',
      accentColor: colors.roseDark,
      badgeText: 'Đại bác hoàng gia',
    },
    component: RoyalArtilleryScreen,
  },
};

export const GAME_LIST: GameMetadata[] = Object.values(GAME_REGISTRY).map(
  (entry) => entry.metadata
);
