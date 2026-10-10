# Báo cáo sửa Đua về đích — 10/10/2026

Đã sửa trực tiếp code, giữ bàn 50 điểm, hai đường tắt và assets gốc. Giữ các thay đổi chưa commit của người dùng; snapshot trước task được ghi trong [audit](race-audit.md). Không commit, push hoặc reset Git.

## 1. Nguyên nhân và sửa lỗi

| Lỗi | Nguyên nhân tìm được trong code cũ | Cách sửa |
| --- | --- | --- |
| Quân biến mất/reset sau đổi lượt | Callback giữ mảng players cũ; advanceTurn ghi lại cả mảng đó. Timer nằm trong state updater có side effect. | Reducer transition thuần, controller duy nhất, event có actionId; không ghi lại snapshot cũ. |
| Quân chồng nhau | Group render theo ô; offset cố định ±10 px nhỏ hơn sprite. | Flat list key player.id, placement theo kích thước thực và hướng đường. |
| Modal đứng yên | Animated.Value chạy nhưng không gắn transform vào dải thẻ. | Render track Animated.View với translateX, native driver, easing tăng/giảm tốc. |
| Pause/tung nhiều lần/callback trùng | Pause không dừng timer; guard dựa trên render cũ. | Một scheduler lưu thời gian còn lại; guard đồng bộ phase/actionId; cleanup timer/animation. |
| Luật hiển thị sai | UI còn mô tả bàn 21 ô và kiểm tra position ≥21. | Kiểm tra finish tile của graph, phần trăm tiến độ; bỏ mô tả cũ và số ô trên UI. |
| Nội dung bị cắt trên điện thoại nhỏ | ScrollView ngang không có viewport width rõ ràng; content bị căn giữa. | Viewport 100%, content bám trái, cuộn dọc và camera theo quân. |

## 2. Các file thay đổi

[Danh sách đầy đủ](changed-files.md). Phần mới chủ yếu nằm trong `src/games/race-to-finish/`: reducer/controller, hook điều phối, generator/chấm toán, answer bag, placement, reel plan, AnimatedToken, MathQuestionModal, MysteryRollModal và tests. Các game khác được chuyển module và cập nhật imports; GameArt về Energy Defense vì chỉ game đó sử dụng. Shared UI chỉ thêm co tiêu đề, accessibility/testID; timer giữ API cũ. Package/config thêm lint, test UI và sửa Jest preset khớp RN.

## 3. Vị trí và lượt chơi

Logical tile/path history nằm trong state. Mỗi bước cập nhật target rồi renderer nội suy; animation hoàn tất gửi MOTION_DONE có id. Không callback animation nào ghi vị trí. Key token cố định theo player.id; rerender, modal và đổi lượt không khởi tạo lại quân. Khi pause, timer và animation dừng; tiếp tục chạy từ giá trị đang hiển thị. Event trùng/cũ/sai phase bị bỏ qua. Victory chỉ sau animation cuối.

Flow: ready_to_roll → rolling → showing_question → evaluating_answer → moving (chỉ đúng) → chọn nhánh nếu đến điểm rẽ → evaluating_tile → rolling_mystery/mystery_result nếu cần → áp dụng → turn_end → lượt tiếp theo. Sai đi thẳng tới kết thúc lượt và giữ nguyên vị trí. Phase finished chặn gameplay.

## 4. Nhiều quân cùng ô

Hai quân đối xứng theo hướng đường; 3–4 quân quanh tâm. Khoảng cách dùng kích thước sprite và khoảng cách ô lân cận, giới hạn trong board. Tile/path logic không thay đổi. Khi một quân rời ô, quân còn lại nội suy về tâm trong 180 ms. Bố trí được kiểm tra ở nhiều kích thước, ô cong, điểm rẽ và đích.

## 5. Thưởng/phạt

Pool/result/slot dừng được khóa trước animation. Track lặp danh sách, quay thật 2.6 giây với native transform; dừng chính xác item đã chọn, highlight và hiện ảnh/tên/mô tả. Nút tiếp tục chỉ hoạt động sau SPIN_DONE. Máy xem kết quả 1.4 giây rồi xử lý. Reduced-motion dùng 180 ms. Cleanup chặn callback bị hủy, pause giữ quãng đã chạy.

Reset chỉ nằm trong pool của ô phạt thuộc 10 điểm đầu; custom pool muộn cũng bị lọc. Khiên tự tiêu thụ chặn phạt; ngôi sao cho phép giữ lại hoặc hóa giải. Tiến/lùi theo graph/history, vẫn chọn nhánh ở điểm rẽ. Di chuyển do thưởng/phạt không kích hoạt chuỗi hiệu ứng mới, tránh vòng lặp.

## 6. Toán lớp 5

Xúc xắc 1–6 được lưu trước khi mở câu hỏi. Chưa trả lời đúng thì không di chuyển; chỉ nhận một đáp án, không đóng modal để bỏ qua. Đúng có feedback rồi đi đúng số bước; sai hiện đáp án/giải thích rồi đổi lượt.

14 template trung bình, 8 vận dụng; số liệu và thứ tự thay đổi theo generator, hạn chế prompt trùng trong ván. Bao gồm số tự nhiên/thập phân/phân số, so sánh, đổi đơn vị, hình học, phần trăm và lời văn. Difficulty theo thứ tự tile trong graph chính, ngưỡng 2/3 nên đường tắt không làm sai mức độ. Đáp án hữu tỉ chính xác, chấp nhận dấu phẩy/dấu chấm và phân số tương đương; không chấm bằng sai số float. Đề có đơn vị hướng dẫn nhập rõ ràng.

## 7. Bot

Mỗi bot có bag riêng: 4 đúng + 1 sai, Fisher–Yates shuffle; mỗi câu hỏi tiêu thụ một phần tử. Mỗi chu kỳ đầy đủ đúng chính xác 4/5. RNG được inject, không rải Math.random trong component. Bot nhập đáp án hợp lệ hoặc đáp án khác được kiểm tra, suy nghĩ 1.4 giây, chịu cùng reducer/toán/thưởng/phạt với người chơi.

## 8. Kiến trúc

```text
src/
  app/                       # một Expo Router
  screens/TrainingGamesHome.tsx
  games/
    index.ts, registry.ts
    race-to-finish/
      screens/, components/, hooks/, state/, logic/
      data/, assets/, types/, tests/, index.ts
    <10 module game khác>/   # gồm space-pets chưa đăng ký
  shared/
    components/, hooks/, math/, audio/, storage/, theme/, types/, tests/
docs/                        # audit, kiến trúc, screenshot, báo cáo
scripts/                     # công cụ kiểm tra
```

Chi tiết thêm game và phát triển branch/worktree độc lập: [ARCHITECTURE.md](ARCHITECTURE.md). Không có import chéo giữa game. Cache/build/dependency giữ trên máy và ignore; screenshot/debug cũ được chuyển, không xóa dữ liệu.

## 9. Kiểm tra đã chạy

- Baseline trước sửa: 4 suites / 47 tests PASS; TypeScript PASS.
- Sau sửa: toàn bộ Jest **9 suites / 85 tests PASS**. Có kiểm tra phép toán độc lập trên 2.400 câu sinh, 100 chu kỳ bot, reducer/controller qua nhiều lượt và game kết thúc, phase/stale events, pause/restart/cleanup, đường tắt, khiên/ngôi sao/mất lượt/reset, không loop, placement, reel plan, import/assets/registry/storage.
- `npm run typecheck`: PASS.
- `npm run lint -- --no-cache`: exit 0, **0 errors / 65 warnings** (legacy).
- `npm run export -- --platform all`: xuất được web JS và Android/iOS Hermes bundles.
- Chrome headless dùng **touch thực**, viewport 320×568 và 390×844: vào sảnh/setup, hai quân cùng ô, math gate, sai đứng yên, đúng di chuyển, pause/resume, exit cleanup; chơi với máy tới tile_49, modal victory và trở về sảnh. Đọc store để quan sát, không inject gameplay state.
- Quan sát transform qua nhiều frame để xác nhận quân và reel thực sự chuyển động; đo item trúng nằm giữa viewport và khớp tên kết quả; bot UI có chu kỳ 4/5.
- Chạy riêng OS reduced-motion và chơi đến đích; kiểm tra reel rút ngắn dưới 400 ms.
- UI navigation mở/thoát thành công cả 9 game khác, không runtime exception. Các game khác giữ gameplay body; tests cũ vẫn pass.
- `git diff --check`: PASS (Git chỉ nhắc LF/CRLF theo môi trường Windows).

Lần chạy cuối trên bản export cuối: **152 checks PASS** ở chế độ thường (gồm 320×568 và ván bot 390×844), **45 checks PASS** ở OS reduced-motion (390×844). Ván thường quan sát 10 câu của người, 4 lần quay và 8 câu bot; ván reduced-motion quan sát 9 câu của người, 2 lần quay và 9 câu bot. Mỗi chu kỳ bot đầy đủ quan sát được đều có đúng 4 đáp án đúng. Navigation của **9/9 game khác PASS**. Counts thay đổi theo ván ngẫu nhiên; không dùng chúng như số check cố định.

Ảnh nghiệm thu: [hai quân ở xuất phát](screenshots/race-small-board.png), [modal toán trên màn hình nhỏ](screenshots/race-small-question.png), [vòng quay thật](screenshots/race-spinning.png), [thẻ trúng ở chế độ giảm chuyển động](screenshots/race-reduced-result.png), [về đích](screenshots/race-victory.png). Đã xem trực tiếp các ảnh này để kiểm tra layout. Các JSON/log đầy đủ nằm trong `artifacts/race-e2e/`, `artifacts/race-e2e-reduced/`, `artifacts/navigation-e2e/` và được ignore.

## 10. Giới hạn còn lại

Chưa kiểm tra trên thiết bị Android/iOS thật hoặc simulator native: bundle thành công không thay thế kiểm tra runtime native. Các game khác đã kiểm tra navigation và tests hiện có, chưa chơi toàn bộ từng game đến kết thúc. Lint còn warning từ code cũ (unused variables, dependencies hooks và compiler diagnostics); một số style shadow/pointerEvents gây cảnh báo deprecation trên web. Không có lỗi gameplay tái hiện trong các lượt kiểm tra đã chạy, nhưng không tuyên bố mọi thiết bị đều đã được kiểm thử.

## 11. Lệnh chạy và kiểm tra

PowerShell, Node ≥22.13:

```powershell
cd C:\Tro_choi_cho_em
npm ci
npm run web
# Hoặc npm run android / npm run ios trên môi trường phù hợp
npm run typecheck
npm run lint -- --no-cache
npm test -- --runInBand
npm run test:race
npm run export -- --platform all
```

Kiểm tra UI trên bản export, mở terminal riêng cho server:

```powershell
node scripts/serve-web.mjs
```

Terminal kiểm tra (Chrome đã cài; có thể đặt CHROME_PATH nếu cần):

```powershell
$env:GAME_URL='http://127.0.0.1:8091'
npm run test:ui
npm run test:ui -- --reduced-motion
node scripts/navigation-e2e.mjs
```

Không chạy export đồng thời với UI trên dist vì export thay lại thư mục đang được server phục vụ.
