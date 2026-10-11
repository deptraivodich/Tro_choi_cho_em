# Đua về đích — sửa tiếp theo ảnh nghiệm thu ngày 11/10/2026

## Audit tài liệu mới

Đã mở trực tiếp toàn bộ bốn PNG đang có tại `docs/references/race`:

- `anh_1.png`: phía bên phải đường tắt thứ hai; quà xanh tại `tile_29`, ô xanh ngay trước là `tile_28`.
- `Screenshot 2026-10-11 213831.png`: đoạn `tile_11 → tile_12 → tile_13 → tile_14`; `tile_13` có hai đầu mũi tên.
- `Screenshot 2026-10-11 213846.png`: đoạn `tile_30 → tile_31 → tile_32 → tile_33`; mũi tên `tile_31` và `tile_32` bị hai đầu. Hướng tiếp theo của `tile_30` phải chéo xuống phải, `tile_31` sang phải.
- `Screenshot 2026-10-11 213856.png`: `tile_40` có mũi tên không rõ một chiều ở đoạn lên phải từ ô phạt `tile_39` tới `tile_41`.

Thư mục tham chiếu hiện chỉ có bốn PNG mới này; README và hai MP4 đã được phân tích ở đợt trước, ghi tại `race-reference-analysis.md`. Không suy luận thêm nội dung video ở đợt này.

## Board và hiển thị

- Giữ tọa độ và tuyến `tile_27 → tile_28 → tile_29 → tile_30`.
- Đổi nội dung thực tế: `tile_28` thành bonus, `tile_29` thành normal. Theo số bước thật, đây là ô thứ 31 và 32; ID lịch sử không phải số bước thực tế.
- `TILE_ARTWORK_SOURCES` trong board data mô tả cả hai cặp đổi hình: cặp `tile_4/tile_4_bonus` từ đợt trước và cặp `tile_28/tile_29` mới. Renderer dùng dữ liệu này; không chỉ đổi hình mà giữ luật cũ.
- Dùng vòng tròn mũi tên một đầu, hướng phải từ `tile_41` của chính map hiện tại; góc xoay được tính bằng vector tới `nextTileIds.main`, với đúng tỉ lệ board. Xoay hình mũi tên hai đầu không thể loại bỏ đầu thứ hai.
- Các ô được phủ lại: `tile_4, tile_8, tile_9, tile_13, tile_16, tile_17, tile_18, tile_20, tile_21, tile_29, tile_30, tile_31, tile_32, tile_34, tile_35, tile_40, tile_45, tile_47`.
- Giữ ảnh gốc, nền rừng, nhân vật, kích thước board và một cụm xúc xắc hiện tại.

## Shortcut

Audit reducer hiện tại đã có tách bước trung gian và xử lý ô đích. Đợt này bổ sung bằng chứng dừng hợp lệ `diceLanding`: chỉ tạo sau `MOTION_DONE` cuối cùng của di chuyển xúc xắc, gồm ô đích, người chơi và lượt. Mỗi bước mới, quay lại, di chuyển thưởng/phạt, kết thúc lượt và restart đều xóa bằng chứng này.

`LAND` tại fork và `BRANCH` phải có bằng chứng khớp người chơi/lượt/vị trí, đã giải đúng, không còn animation, không còn bước. `canChooseShortcut` dùng chung để chặn cả modal và highlight khi không hợp lệ. Di chuyển thưởng/phạt không tạo `diceLanding`, kể cả dừng đúng cửa vào.

Hai cửa vào vẫn là `tile_4` và `tile_16`; hai điểm ra vẫn là `tile_8_mid` và `tile_30`. Đổi ô thưởng ở đầu bên phải không biến nó thành cửa vào mới.

## Cân bằng xác suất

| Kết quả | Trước | Sau |
| --- | ---: | ---: |
| Tiến 1 ô | 25% | 32% |
| Tiến 2 ô | 25% | 32% |
| Khiên | 25% | 18% |
| Quyền giải bất lợi | 25% | 18% |
| Phạt lùi 1 ô trong 10 ô đầu | 25% | 24% |
| Phạt lùi 2 ô trong 10 ô đầu | 25% | 23% |
| Mất lượt trong 10 ô đầu | 25% | 23% |
| Về xuất phát trong 10 ô đầu | 25% | 30% |

Ngoài 10 ô đầu, pool phạt giữ nguyên: 33,33% / 33,33% / 33,34%; về xuất phát bằng 0%, kể cả cấu hình tùy chỉnh đưa nhầm vào pool. Reel chỉ hiển thị kết quả đã khóa từ weighted roll; số thẻ vẽ trên reel không quyết định xác suất.

## File sửa trong đợt này

`data/boardConfig.ts`, `components/BoardCorrections.tsx`, `logic/gameEngine.ts`, `state/raceReducer.ts`, `hooks/useRaceGame.ts`, `screens/RaceToFinishScreen.tsx`; các test `boardReference.test.ts`, `raceFlow.test.ts`, `race_to_finish.test.ts`; `scripts/race-e2e.mjs`; tài liệu này.

Các file thuộc game nằm dưới `src/games/race-to-finish/`. Giữ toàn bộ thay đổi chưa commit từ các đợt trước. Không sửa worktree Antigravity, không stage/commit/push; tham chiếu và artifact vẫn được Git bỏ qua.

## Kiểm tra

- Unit/gameplay: 78 test trong 6 suite đạt, gồm 10.000 điểm RNG đều cho mỗi pool để kiểm tra phân bố thực tế, loại reset tại mọi ô từ thứ 11, đổi vị trí thưởng, cả hai shortcut, thưởng/phạt tới hoặc đi ngang entry, callback trùng/cũ, bot, Toán lớp 5 và timer.
- Typecheck đạt. Lint: 0 lỗi, 65 cảnh báo có sẵn trong repository. Ba kiểm tra kiến trúc/import cũng đạt.
- UI: chạy `node scripts/race-e2e.mjs --shortcut-only` để kiểm tra thật bằng các nút giao diện. Seed 1: dừng cửa đầu và đi tắt. Seed 4: đi ngang cửa đầu. Seed 2: thưởng từ `tile_14` tiến đúng `tile_16` không hỏi; lượt tiếp theo đi ngang cửa hai không hỏi; một lượt khác đổ đúng và dừng cửa hai mới chọn đi tắt. Seed 14: phạt lùi về cửa đầu không hỏi. Seed chỉ đặt khi khởi tạo RNG của trình duyệt kiểm thử; không ghi vào game store.
- UI tổng thể: `node scripts/race-e2e.mjs` kiểm tra desktop, màn 320px và một ván người/bot trên màn 390px tới đích. Kết quả: 336 kiểm tra UI đạt; 11 câu hỏi người chơi, 4 lượt quay thưởng/phạt, 3 mẫu animation và 11 câu trả lời bot, mỗi chu kỳ đủ 5 câu có đúng 4 câu trả lời đúng. Kiểm tra shortcut riêng: 211 kiểm tra đạt. Kiểm tra trình bày cuối sau khi dùng mũi tên một đầu từ `tile_41`: 12 kiểm tra đạt. Artifact tại `artifacts/race-reference-ui`, `artifacts/race-shortcut-ui`, `artifacts/race-e2e`.

## Người dùng tự kiểm tra

Mở `http://localhost:8090`, chọn Đua Về Đích và bắt đầu ván mới. Kiểm tra quà xanh nằm trên ô xanh sát đầu bên phải đường tắt thứ hai. Theo tuyến chính: quà → ô xanh → điểm ra đường tắt. Kiểm tra các đoạn trong bốn PNG chỉ còn mũi tên một đầu nối tới ô kế tiếp.

Đổ vượt cửa vào: quân đi tiếp hết bước và không hỏi. Đổ đúng cửa vào, trả lời đúng: quân dừng xong mới chọn tuyến. Nếu thưởng tiến hoặc phạt lùi tới cửa vào: không hỏi. Khiên/quyền vẫn có thể xuất hiện liên tiếp do ngẫu nhiên; xác suất thấp hơn không phải quy tắc cấm lặp.
