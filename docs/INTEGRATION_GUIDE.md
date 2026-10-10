> Cấu trúc mới theo [ARCHITECTURE.md](ARCHITECTURE.md). Phần hướng dẫn tích hợp dưới đây giữ các public contract, nhưng root module hiện là src/games và src/shared.

# HƯỚNG DẪN TÍCH HỢP VÀO MATHVISIONKID (STUDENT MOBILE)

> **Tài liệu hướng dẫn kỹ thuật**: Chỉ mô tả quy trình tích hợp trong tương lai, **chưa thực hiện sửa đổi** bất kỳ file hay cấu hình nào của dự án `MathVisionKid`.

---

## 1. Mục tiêu kiến trúc

Phân hệ game trong `Tro_choi_cho_em` được thiết kế theo nguyên lý **Đóng gói độc lập (Self-Contained Module)**. Toàn bộ logic bàn chơi, thuật toán toán học, tài nguyên SVG và bộ phát âm thanh đều nằm trọn vẹn trong thư mục:
```text
src/features/training-games/
```
Khi ứng dụng Student Mobile của MathVisionKid sẵn sàng tích hợp, toàn bộ thư mục này có thể được sao chép nguyên vẹn hoặc liên kết như một feature submodule mà không làm xáo trộn cấu trúc hiện tại của host app.

---

## 2. Các điểm vào (Entry Points) xuất khẩu

Module `training-games` cung cấp 2 điểm vào chính:

1. **Sảnh chọn 10 trò chơi (`TrainingGamesHome`)**:
   - Vị trí: `src/screens/TrainingGamesHome.tsx`
   - Props hỗ trợ:
     ```typescript
     interface TrainingGamesHomeProps {
       onSelectGame?: (gameId: GameId) => void; // Cho phép host app tự xử lý điều hướng
       showBackButton?: boolean;               // Ẩn/hiện nút quay về màn hình chính của học sinh
       onBack?: () => void;                    // Callback khi nhấn nút quay về
     }
     ```
2. **Bàn chơi từng trò chơi (`GameRunner` / `registry`)**:
   - Vị trí: `src/games/registry.ts`
   - Cách gọi động thông qua `GAME_REGISTRY[gameId].component`:
     ```tsx
     import { GAME_REGISTRY } from '@/games/registry';

     const GameComponent = GAME_REGISTRY[gameId]?.component;
     if (!GameComponent) return <NotFound />;

     return (
       <GameComponent
         onFinish={(result) => handleGameFinish(result)}
         onExit={() => router.back()}
       />
     );
     ```

---

## 3. Khớp nối định tuyến (Route Mapping) với Expo Router

Trong dự án MathVisionKid (Student Mobile), cấu trúc router thường nằm trong thư mục `apps/student-mobile/app/` hoặc `src/app/`.

### Bước 3.1: Màn hình danh sách trò chơi (Sảnh)
Thay thế màn hình `/games` hiện tại bằng component `TrainingGamesHome`:
```tsx
// Đường dẫn tham chiếu: app/(tabs)/games.tsx hoặc app/games/index.tsx
import React from 'react';
import { useRouter } from 'expo-router';
import { TrainingGamesHome } from '@/screens/TrainingGamesHome';

export default function GamesScreen() {
  const router = useRouter();

  return (
    <TrainingGamesHome
      onSelectGame={(gameId) => {
        router.push(`/games/${gameId}`);
      }}
    />
  );
}
```

### Bước 3.2: Màn hình bàn chơi chi tiết
Tạo route động nhận `gameId` từ tham số URL:
```tsx
// Đường dẫn tham chiếu: app/games/[gameId].tsx
import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
import { GAME_REGISTRY } from '@/games/registry';
import { GameId, GameSessionResult } from '@/shared/types';

export default function GameRunnerScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();

  const gameEntry = GAME_REGISTRY[gameId as GameId];
  if (!gameEntry) {
    return (
      <View style={styles.center}>
        <Text>Không tìm thấy trò chơi: {gameId}</Text>
      </View>
    );
  }

  const GameComponent = gameEntry.component;

  const handleFinish = (result: GameSessionResult) => {
    // Gửi kết quả lên backend MathVisionKid qua Sync Adapter (nếu đã kết nối)
    console.log('Phiên chơi hoàn thành:', result);
  };

  return (
    <GameComponent
      onFinish={handleFinish}
      onExit={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
```

---

## 4. Kiểm tra các thư viện phụ thuộc (Dependencies)

Các phiên bản trong sandbox `Tro_choi_cho_em` đã được căn chỉnh tương thích chính xác với `MathVisionKid` (Expo SDK 57, React 19.2.3, React Native 0.86.3). Khi tích hợp vào Student Mobile, hãy kiểm tra các gói sau trong `package.json` của host app:

1. **`react-native-svg`**: Đã có phiên bản `~15.15.5`. Đảm bảo đã chạy lệnh `npx expo install react-native-svg` nếu chưa có.
2. **`@react-native-async-storage/async-storage`**: Đảm bảo phiên bản `^2.1.0` hoặc tương đương.
3. **`react-native-reanimated` & `react-native-gesture-handler`**: Dự án Student Mobile đã có sẵn các gói này.
4. **Web Audio API**: Bộ âm thanh `audioController.ts` chạy trên nền trình duyệt chuẩn của Web và WebView, không đòi hỏi thêm thư viện native bổ sung.

---

## 5. Chuyển đổi tầng lưu trữ (Storage Adapter Pattern)

Sandbox hiện tại sử dụng `LocalStorageAdapter` lưu dữ liệu offline trên thiết bị học sinh. Khi tích hợp với hệ thống backend MathVisionKid (Spring Boot & PostgreSQL), việc chuyển đổi diễn ra rất mượt mà nhờ tuân thủ giao diện `StorageAdapter`:

```typescript
// Định nghĩa giao diện sẵn có trong: src/shared/storage/storageAdapter.ts
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

### Cách tạo Adapter kết nối Backend Spring Boot (`ApiStorageAdapter`):
```typescript
import { StorageAdapter } from '@/shared/storage/storageAdapter';
import apiClient from '@/services/apiClient'; // API Client sẵn có của MathVisionKid

export class ApiStorageAdapter implements StorageAdapter {
  constructor(private studentToken: string) {}

  async getItem(key: string): Promise<string | null> {
    try {
      const response = await apiClient.get(`/api/v1/student/game-data/${key}`);
      return JSON.stringify(response.data);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await apiClient.post('/api/v1/student/game-data', {
      key,
      payload: JSON.parse(value),
    });
  }

  async removeItem(key: string): Promise<void> {
    await apiClient.delete(`/api/v1/student/game-data/${key}`);
  }
}
```

---

## 6. Định dạng kết quả phiên chơi (`GameSessionResult`)

Mỗi khi học sinh hoàn thành một màn chơi, trò chơi sẽ trả về đối tượng `GameSessionResult` có cấu trúc chuẩn hóa:

```typescript
export interface GameSessionResult {
  gameId: GameId;                 // Mã trò chơi (ví dụ: "energy-defense")
  sessionId: string;              // UUID ngẫu nhiên duy nhất của phiên chơi
  timestamp: number;              // Mốc thời gian hoàn thành (Unix Epoch ms)
  level: 'easy' | 'medium' | 'hard'; // Mức độ khó đã chọn
  durationSeconds: number;        // Thời gian chơi thực tế (không tính thời gian Pause)
  score: number;                  // Điểm số đạt được trong ván chơi
  mathAccuracy: number;           // Tỉ lệ toán học chính xác (từ 0.0 đến 1.0)
  correctCount: number;           // Số lượt ghép / tính toán đúng
  wrongCount: number;             // Số lượt ghép / tính toán sai
  skillsPracticed: string[];      // Danh sách kỹ năng toán học (ví dụ: ["Cộng số thập phân"])
}
```

### Ràng buộc bảo mật & Giáo dục quan trọng:
- **Tính độc lập của dữ liệu**: Kết quả điểm số trong game (`score`) được thiết kế nhằm mục đích động viên, phản hồi tiến độ rèn luyện.
- **Không ghi đè tự động**: Điểm game local **tuyệt đối không được tự động quy đổi** thành điểm số bài tập về nhà chính thức, xếp loại học bạ, hoặc can thiệp vào độ tin cậy nhận diện OCR bài tập của MathVisionKid mà chưa qua sự phê duyệt của giáo viên hoặc thuật toán chấm điểm của backend Spring Boot.
