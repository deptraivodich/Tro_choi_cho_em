# Trò chơi rèn luyện cho em

> **Ứng dụng game toán học 2D độc lập dành cho học sinh tiểu học**  
> Dự án sandbox thử nghiệm độc lập trước khi tích hợp vào Student Mobile của MathVisionKid.

---

## 1. Giới thiệu tổng quan

**“Trò chơi rèn luyện cho em”** là ứng dụng game giáo dục toán học chạy hoàn toàn offline trên nền tảng **React Native / Expo** (hỗ trợ cả **Web** và **Android** qua Expo Go).

Ứng dụng sở hữu sảnh đón tiếp sinh động cùng **đúng 10 trò chơi toán học 2D** với đồ họa vector SVG tươi sáng, âm thanh tương tác trực tiếp (Web Audio API Synthesizer) và cơ chế tính toán - gameplay riêng biệt:

1. **Thủ thành năng lượng** (`energy-defense`): Cộng trừ số thập phân & phân số (nạp năng lượng trụ laser, phòng thủ quái vật).
2. **Giải cứu hành tinh** (`planet-rescue`): Rút gọn & quy đồng phân số (vượt 5-7 phòng dungeon, đấu trùm không gian).
3. **Siêu xe vượt địa hình** (`terrain-racing`): Toán chuyển động $v = s / t$ (tinh chỉnh động cơ, bay qua khe núi qua 10 chặng).
4. **Đua về đích** (`race-to-finish`): Nhận biết chẵn/lẻ, đếm bước tiến lùi & suy luận chiến thuật (đua xúc xắc 21 ô zíc zắc trong rừng phiêu lưu, khiên phép & sao giải trừ).
5. **Lãnh chúa đảo khối** (`block-island`): Diện tích & chu vi lưới ô vuông (loại bỏ cạnh trong, công thức tam giác & hình thang, thăm đảo máy).
6. **Mật mã cửa hầm** (`vault-code`): Giá trị hàng, số thập phân & dấu hiệu chia hết (thử thách 3 mật mã/ngày x 5 lượt đoán & chế độ luyện tập).
7. **Thương nhân chợ nổi** (`floating-market`): Đổi đơn vị khối lượng (tấn, tạ, yến, kg, g) & bài toán lời/lỗ kinh doanh ghe xuồng.
8. **Tiệm bánh nhịp điệu** (`rhythm-bakery`): Phân số & hỗn số ($2 \frac{1}{2} = 5 \times \frac{1}{2}$), băng chuyền bánh canh nhịp, tách biệt điểm toán và điểm nhịp.
9. **Thợ lặn truy tìm kho báu** (`treasure-dive`): Đọc biểu đồ cột & xác suất thống kê thực tế theo độ sâu, quản lý dưỡng khí oxy.
10. **Xưởng đúc pháo cung đình** (`royal-artillery`): Đo góc và lực bắn, phân biệt góc nhọn ($<90^\circ$, bắn sang phải) và góc tù ($>90^\circ$, 120° bắn sang trái qua thành lũy).

---

## 2. Yêu cầu môi trường & Công cụ

- **Node.js**: Phiên bản 18.x hoặc 20.x LTS.
- **npm**: Đi kèm với Node.js.
- **Trình duyệt Web**: Chrome, Edge, Safari hoặc Firefox (cho chế độ Web).
- **Thiết bị chạy Expo Go / Android Emulator** (nếu muốn kiểm tra trên di động).
- **Cổng kết nối**: Mặc định dev server chạy trên **cổng 8090** (được cấu hình riêng nhằm tránh xung đột với cổng 8081/8082 của MathVisionKid).

---

## 3. Cài đặt và Khởi chạy

### Bước 1: Di chuyển vào thư mục dự án
```bash
cd Tro_choi_cho_em
```

### Bước 2: Cài đặt thư viện phụ thuộc
Dự án đã có sẵn file khóa `package-lock.json` đảm bảo tính nhất quán tuyệt đối về phiên bản:
```bash
npm install
```

### Bước 3: Các lệnh thực thi (NPM Scripts)

| Lệnh | Mục đích | Cổng / Ghi chú |
| :--- | :--- | :--- |
| `npm run web` | Khởi chạy ứng dụng trên nền tảng **Web** | Mặc định mở tại `http://localhost:8090` |
| `npm run start` | Khởi chạy Metro Bundler cho Expo | Cổng 8090, quét mã QR qua Expo Go |
| `npm run lan` | Khởi chạy Metro Bundler chế độ mạng LAN | Cho phép điện thoại cùng Wi-Fi kết nối |
| `npm test` | Chạy toàn bộ **Jest Test Suite** (32 bài kiểm thử, bao gồm 15.000 mẫu sinh) | Kiểm tra toán học, storage, bộ sinh bài 500 mẫu/level |
| `npm run typecheck` | Kiểm tra lỗi TypeScript chế độ nghiêm ngặt (`strict: true`) | Đảm bảo 0 lỗi kiểu dữ liệu |
| `npm run export` | Đóng gói bundle tĩnh đa nền tảng | Xuất file ra thư mục `dist/` |

---

## 4. Kiến trúc hệ thống độc lập

Cấu trúc dự án được phân chia ranh giới rõ ràng, sẵn sàng trích xuất thành module để tích hợp:

```text
Tro_choi_cho_em/
├── src/
│   ├── app/                                # Điều phối Navigation (Expo Router)
│   │   ├── _layout.tsx                     # Layout bọc ứng dụng (Stack)
│   │   ├── index.tsx                       # Màn hình sảnh đón tiếp
│   │   └── games/[gameId].tsx              # Màn hình chạy game theo ID
│   └── features/training-games/            # MODULE ĐỘC LẬP HOÀN CHỈNH
│       ├── TrainingGamesHome.tsx           # Sảnh 10 thẻ game, danh mục, bật/tắt âm
│       ├── registry.ts                     # Danh bạ 10 trò chơi (metadata, component)
│       ├── types.ts                        # Kiểu dữ liệu, GameSessionResult, Profile
│       ├── components/                     # Header, Modal, Timer, FractionView, SVG Icons
│       ├── core/                           # Nhân tính toán & quản lý trạng thái
│       │   ├── audioController.ts          # Bộ phát âm thanh Web Audio API
│       │   ├── game-loop/useGameTimer.ts   # Vòng lặp timer delta-time & tạm dừng
│       │   ├── math/                       # Phân số, số thập phân, hình học, góc, bộ sinh
│       │   └── storage/                    # Adapter lưu trữ local, quota, tiến độ
│       └── games/                          # Mã nguồn và bàn chơi 2D của 10 game
│           ├── energy-defense/
│           ├── planet-rescue/
│           ├── terrain-racing/
│           ├── race-to-finish/
│           ├── block-island/
│           ├── vault-code/
│           ├── floating-market/
│           ├── rhythm-bakery/
│           ├── treasure-dive/
│           └── royal-artillery/
```

### Nguyên tắc bảo mật & phân lập:
- **Sandbox Offline**: Lưu trữ cục bộ thông qua `@react-native-async-storage/async-storage` với tiền tố độc lập `tro_choi_cho_em_v1_*`.
- **Không xâm lấn**: Không truy cập hay ghi đè `localStorage`, database, token hay API endpoint của MathVisionKid.
- **Tiến độ lưu theo Profile**: Hỗ trợ `schemaVersion: 1` và `profileId: "local_sandbox_student"`.
- **Độc lập kết quả**: `GameSessionResult` lưu lại thời gian chơi thực, số lượt đúng/sai, độ chính xác toán và kỹ năng rèn luyện mà không tự ý quy đổi thành điểm học tập chính thức của hệ thống trường lớp.

---

## 5. Nguồn gốc tài nguyên và Giấy phép

1. **Đồ họa**:
   - 100% hình minh họa và biểu tượng trò chơi được dựng bằng **Vector SVG** thuần (`react-native-svg`), không dùng emoji đơn thuần làm đồ họa chính.
   - Toàn bộ vector assets được tự thiết kế (Original Vector Artwork) phục vụ cho dự án giáo dục trẻ em, không sao chép nhân vật hoặc đồ họa từ bất kỳ trò chơi thương mại nào.
2. **Âm thanh**:
   - Sử dụng bộ phát tín hiệu âm thanh kỹ thuật số tương thích cao (`Web Audio API Oscillator Synthesizer`): tiếng bíp, tiếng tinh xảo nạp năng lượng, tiếng hoàn thành màn chơi, tiếng nhịp gõ trống.
   - Không chứa bất kỳ file nhạc số nén MP3/WAV bản quyền nào.
   - Âm thanh chỉ phát sau khi người dùng tương tác và có thể bật/tắt bất kỳ lúc nào qua nút loa trên màn hình.
3. **Mã nguồn**: Phát hành theo giấy phép **MIT License**.
