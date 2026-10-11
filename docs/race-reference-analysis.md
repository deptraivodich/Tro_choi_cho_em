# Đối chiếu tham chiếu và sửa Đua về đích — 11/10/2026

## Tài liệu đã phân tích trực tiếp

Đã đọc `docs/references/race/README_THAM_CHIEU.txt`, xem đầy đủ bốn PNG và giải mã cả hai MP4 bằng OpenCV/FFmpeg backend có sẵn trên máy. Không dùng nội dung suy đoán thay cho video.

| Video | Kích thước | FPS | Số frame | Thời lượng |
| --- | --- | --- | --- | --- |
| `01_video_mau_tong_quan.mp4` | 1600 × 720 | 30 | 679 | 22,633 giây |
| `02_video_mau_duong_tat.mp4` | 1280 × 576 | 30 | 260 | 8,667 giây |

Trích khung hình mỗi 2 giây cho cả hai video, thêm mỗi 0,25 giây ở video 1 tại 3–5 giây, mỗi 0,5 giây tại 10–17 giây, và mỗi 0,25 giây ở video 2 tại 4,5–8,5 giây. Metadata, ảnh từng frame, contact sheet và script tái tạo nằm trong `artifacts/race-reference/` (đã được Git ignore).

Quan sát từ các khung hình:

- Video 1, 3,75–5 giây: xúc xắc có nhiều mặt, thay đổi hướng và số trong quá trình xoay. 11,5–12,5 giây: xúc xắc lượt xanh chốt số 3 trước khi quân bắt đầu chạy. 14,5–16 giây: quân đi tuần tự qua ba ô, dừng ở ô xanh ngay trước cửa vào; không chạy ngang lối tắt.
- Video 2, 4 giây: kết quả là 4. 4,5–5,75 giây: quân xanh đi từng ô, có số bước còn lại 3 → 2 → 1. 6–6,5 giây: quân đã đến ô vào màu xanh lá. 6,75–7,5 giây: quân di chuyển ngang theo dãy chevron trắng tới ô xanh ở đầu bên kia. 7,75–8,5 giây: quân ở đầu ra, không tiếp tục thêm số bước xúc xắc.
- Video mẫu có board, quân và cách trình bày khác bản hiện tại. Áp dụng thứ tự animation và điều kiện dừng tại cửa vào; giữ board rừng, bộ nhân vật và câu hỏi Toán lớp 5 hiện có. Giữ một xúc xắc hoạt động với đổi mặt, xoay và nhún; không tạo thêm bốn khu xúc xắc như cảnh mở đầu video mẫu.

## Đối chiếu bốn ảnh với source thật

`GameBoardView.tsx` dùng `assets/map_landscape.png` làm ảnh nền 1024 × 576. Mũi tên và khu điều khiển phía dưới là pixel có sẵn trong ảnh, không phải các nút hay icon được render từ dữ liệu. `RaceToFinishScreen.tsx` lại render thêm `TurnDashboard`, tạo ra hai khu xúc xắc đúng như PNG 04.

Các mũi tên cần đảo theo đường chính:

| Ảnh | ID trong code | Hướng đúng đến ô kế tiếp |
| --- | --- | --- |
| Khu A | `tile_8`, `tile_9` | Xuống trái |
| Khu A | `tile_16` | Lên |
| Khu A | `tile_17`, `tile_18` | Lên, hơi trái |
| Rà toàn tuyến | `tile_20` | Lên, hơi phải; thay mũi tên hai đầu bằng mũi tên đơn có sẵn |
| Khu A | `tile_21` | Lên phải |
| Khu B | `tile_31` | Phải |
| Khu B | `tile_34`, `tile_35` | Lên trái |
| Khu B | `tile_45` | Xuống phải |
| Rà toàn tuyến | `tile_47` | Lên phải, về bục đích |

Đã rà toàn bộ 53 vị trí theo thứ tự thực của graph, đối chiếu từng vòng tròn với hướng tới ô kế tiếp. Contact sheet có ID, loại ô và góc tuyến đường nằm tại `artifacts/race-reference/all-tile-arrow-audit.jpg`. `getTileDirection` dùng tọa độ và liên kết `nextTileIds.main` để tính hướng, không suy ra từ số trong ID. Những ô có hướng đúng giữ nguyên.

PNG 03: hộp quà tại (20,7%; 26,2%) nằm cạnh cửa vào lối tắt; ô xanh ngay phía trên tại (24,2%; 21,9%). Hoán đổi hình vẽ và loại ô: cửa vào trở thành ô rẽ thông thường, hộp quà lên ô phía trên. Trước sửa, tâm hộp quà này còn bị thiếu hoàn toàn trong graph.

Đối chiếu graph với ảnh nền cũng phát hiện:

- Ba vòng tròn xanh khác chưa có node: (32%; 38,4%), (44,8%; 35,3%), (83,8%; 42,1%). Bổ sung `tile_8_mid`, `tile_20_mid`, `tile_44_mid` để không nhảy qua ô vẽ sẵn.
- Đầu ra đường tắt đầu tiên thực tế là vòng tròn tại (32%; 38,4%), không phải `tile_11` ở đáy khúc cua. Đổi liên kết từ `tile_4 → tile_11` thành `tile_4 → tile_8_mid`.
- `tile_33`/`tile_34` bị đảo tọa độ và loại ô so với đường đi: phải đi qua ô đỏ phía dưới rồi mới lên ô xanh phía trên.
- `tile_48` cũ ở (90,8%; 62,5%) là đá/cây, không có vòng tròn trên board. Bỏ node giả; ô cuối `tile_47` đi trực tiếp tới bục đích `tile_49`.

Ảnh board và nhân vật không sửa hay tạo lại. Graph khớp 53 vị trí thật gồm xuất phát và đích; IDs cũ giữ ổn định, `order` tính theo đường chính thật. Quy tắc phạt “về xuất phát” vẫn chỉ áp dụng trong 10 ô đầu tính từ xuất phát; độ khó câu hỏi vẫn dựa trên tiến độ 2/3 đường chính.

## Thay đổi thực hiện

- `data/boardConfig.ts`: tâm cửa vào, ô thưởng mới, các node bị thiếu, thứ tự đoạn cuối, đầu ra lối tắt, số ô bỏ qua và thứ tự thực tế.
- `components/BoardCorrections.tsx`: dùng các vùng tròn của chính ảnh nền thông qua view cắt và xoay, sửa 12 mũi tên và hoán đổi hai ô. Không thay đổi file PNG gốc.
- `components/GameBoardView.tsx`: giữ vùng board có thể chơi; cắt riêng 20% dưới chứa khu xúc xắc vẽ sẵn. Các quân và highlight dùng tọa độ của ảnh gốc.
- `components/TurnDashboard.tsx`: một khu điều khiển, xúc xắc đổi mặt/xoay/nhún và nút cùng hàng trên cả điện thoại lẫn desktop. Tên lượt và vật phẩm nằm trong hàng nhỏ phía trên; kết quả nằm dưới nút. Giữ log, khóa nút theo phase/bot/pause và nút tối thiểu 48px.
- `components/AnimatedToken.tsx`: giữ bước thông thường 280ms; chạy ngang lối tắt trong 800ms để nhìn thấy hành trình như video 2. Chế độ giảm chuyển động vẫn dùng 70ms; controller luôn chờ callback animation hoàn tất mới kết thúc lượt.
- `screens/RaceToFinishScreen.tsx`, `components/ForkChoiceModal.tsx`: cập nhật chiều cao viewport và hướng dẫn. Bỏ giãn cách `space-between` và `flex: 1` gây khoảng trống giữa board và panel; panel tối đa 640px, nằm sát board. Modal lựa chọn chỉ xuất hiện khi quân đã dừng; chọn đường chính để ở lại, chọn đường tắt để chạy đến đầu ra.
- `state/raceReducer.ts`: bỏ lựa chọn trong `nextStep`. `MOTION_DONE` cuối cùng của lượt xúc xắc chuyển sang `evaluating_tile`; chỉ `LAND` tại cửa vào mới mở lựa chọn. Thưởng/phạt kết thúc trực tiếp sau animation, không đi vào phase này. Vì vậy đi ngang, tiến thêm do thưởng tới đúng cửa vào và lùi về cửa vào đều không mở lựa chọn. Lối tắt không tiêu thụ thêm bước xúc xắc. Giữ cơ chế không quay thưởng/phạt liên hoàn tại điểm tới do hiệu ứng. Giữ quyền chọn đường chính/đường tắt hiện có; lấy điều kiện dừng và animation ngang từ video 2.
- `types/index.ts`: làm rõ thứ tự thực tế độc lập ID lịch sử.
- Các test trong module và `scripts/race-e2e.mjs`: thêm hồi quy cho dừng đúng/đi ngang cả hai cửa vào, chọn đường chính, bot, bonus, lùi, pause, callback trùng, cấu trúc board và UI xúc xắc.
- `.gitignore`: loại `docs/references/race/` khỏi các file có thể stage thông thường. Không stage/commit/push media, không chạy commit hoặc push.

## Kiểm chứng

Kết quả và ảnh browser nằm trong `artifacts/race-e2e/` và `artifacts/race-reference-ui/`. Đã kiểm tra UI ở desktop 1440 × 1000, điện thoại 320 × 568 và 390 × 844. Đây là runtime web trong Chrome, không phải kiểm tra trên thiết bị Android/iOS thật.

- Bộ test game: 6 suites / 63 tests đạt; kiểm tra toán với 2.400 câu, 100 chu kỳ trả lời bot, graph, thưởng/phạt, inventory, pause, restart, animation completion và đường tắt. Bổ sung kiểm tra direction theo các đoạn cua, `LAND`/`BRANCH` sai phase không kích hoạt và thưởng dừng đúng entry không mở lựa chọn.
- Gameplay browser: đi từ sảnh qua setup đến chiến thắng, kiểm tra câu sai đứng yên, câu đúng mới đi, bot 4/5, chuyển lượt multiplayer, pause khi đi, reel khớp kết quả và quay về sảnh; không có runtime exception.
- Kiểm tra presentation sau sửa: đủ 12 mũi tên và hai ô hoán đổi; chỉ một khu xúc xắc; panel cao dưới 150px ở desktop, dưới 155px ở điện thoại 320px; sát board, xúc xắc và nút 48px cùng hàng. Animation và mặt chốt khớp số dùng trong câu hỏi.
- Browser shortcut: 70 checks đạt (`artifacts/race-shortcut-ui/`), seed các lượt đổ 4 và 6 qua RNG bình thường. Đổ 4 dừng đúng cửa vào rồi lựa chọn/chạy ngang; đổ 6 quan sát cả animation trung gian tại cửa vào, không có state hay prompt đường tắt, dừng ô phạt theo đường chính. Test chỉ quan sát store; hành động qua UI, không sửa vị trí hay phase để ép kết quả.
- Browser gameplay cuối: 118 checks đạt (`artifacts/race-e2e/result.json`), gồm 12 câu của người chơi, 4 lần quay thưởng/phạt, 3 lần lấy mẫu chuyển động và 12 câu của bot; mỗi chu kỳ đủ 5 câu của bot có đúng 4 câu trả lời đúng. Đã kiểm tra desktop 1440 × 1000, mobile 320 × 568 và 390 × 844, pause/resume, handover, chiến thắng và quay về sảnh; không có runtime exception.
- TypeScript đạt. Lint không có lỗi, còn 65 warning đã tồn tại ở các phần khác.

Chỉ làm việc trong `C:/Tro_choi_cho_em` trên branch `fix/race-polish`. Không sửa worktree `C:/Tro_choi_cho_em_anti`, không ghi đè thay đổi sẵn có ở `src/app/_layout.tsx`.

## Danh sách file thay đổi

Các đường dẫn dưới đây tính từ project root. Không có thay đổi file asset gốc.

| Nhóm | File |
| --- | --- |
| Dữ liệu/logic | `src/games/race-to-finish/data/boardConfig.ts`, `src/games/race-to-finish/state/raceReducer.ts`, `src/games/race-to-finish/types/index.ts` |
| Hiển thị | `src/games/race-to-finish/components/BoardCorrections.tsx` (mới), `GameBoardView.tsx`, `AnimatedToken.tsx`, `TurnDashboard.tsx`, `ForkChoiceModal.tsx` trong cùng thư mục components |
| Màn hình | `src/games/race-to-finish/screens/RaceToFinishScreen.tsx` |
| Kiểm thử | `src/games/race-to-finish/tests/boardReference.test.ts` (mới), `controller.test.ts`, `questions.test.ts`, `raceFlow.test.ts`, `race_to_finish.test.ts` trong cùng thư mục tests; `scripts/race-e2e.mjs` |
| Tài liệu/bảo vệ media | `.gitignore`, `docs/ARCHITECTURE.md`, `docs/race-reference-analysis.md` (mới) |

## Tự kiểm tra

Mở `http://localhost:8090`, vào **Đua Về Đích**, chọn **Chơi cùng bạn** để dễ theo dõi hai lượt.

1. Ở lượt đầu từ xuất phát: đổ 4 và trả lời toán đúng → quân đi đủ bốn ô, dừng cửa vào rồi mới hiện lựa chọn. Chọn đường tắt → chạy ngang tới ô xanh đầu ra. Chọn đường chính → ở lại cửa vào, lượt sau đi theo đường chính.
2. Đổ 5 hoặc 6 từ xuất phát, trả lời đúng → đi ngang cửa vào, không có lựa chọn. Dừng ô thưởng phía trên nếu là 5; dừng ô phạt tiếp theo nếu là 6.
3. Theo dõi cửa vào thứ hai: chỉ dừng chính xác bằng lượt xúc xắc mới mở lựa chọn; thưởng tiến thêm hoặc phạt lùi tới cửa vào đều không mở.
4. Kiểm tra một cụm xúc xắc sát board, tên lượt đầy đủ, nút đổ và số chốt. Thu cửa sổ về 320px để kiểm tra nút và xúc xắc vẫn cùng hàng; board cuộn ngang theo quân.

Kiểm tra tự động: `npm run test:race`, `npm run test:ui` và `node scripts/race-e2e.mjs --shortcut-only`. Script shortcut dùng seed tạo kết quả 4/6 để kiểm tra lặp lại mà không sửa game store. Server Expo đang giữ chạy ở cổng 8090.
