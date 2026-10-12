# Đường tắt tự động và xóa con vật trang trí — 12/10/2026

Workspace: `C:\Tro_choi_cho_em`, branch `fix/race-polish`.

## 1. Nguyên nhân modal vẫn xuất hiện

Bản trước chỉ giới hạn modal vào trường hợp dừng đúng cửa vào. Reducer vẫn tạo `forkChoiceState`, chuyển sang `awaiting_fork_choice`, và chờ event `BRANCH`. Screen vẫn mount `ForkChoiceModal`; bot vẫn có bộ hẹn giờ chọn tuyến. Vì vậy modal vẫn xuất hiện khi đáp án đúng và xúc xắc dừng đúng ô vào.

## 2. Logic đã xóa

- Xóa file `components/ForkChoiceModal.tsx` và import/render của nó.
- Xóa type `ForkChoiceState`, state `forkChoiceState`, phase `awaiting_fork_choice`, event `BRANCH`.
- Xóa `canChooseShortcut`, `handleSelectBranch`, `RaceController.branch`, `decideBotForkChoice` và timer chọn tuyến của bot.
- Xóa `activeForkTileId` và các highlight phục vụ chọn hai tuyến trong `GameBoardView`.
- Cập nhật hướng dẫn và mô tả cửa vào theo luật tự động; không tạo modal thay thế.

## 3. Luồng mới

Tung xúc xắc → câu hỏi Toán lớp 5 → đúng thì đi từng bước trên tuyến chính. Sai/hết 30 giây thì đứng yên, giữ giải thích đến khi người chơi bấm **Đã hiểu**.

Sau callback hoàn tất animation bước cuối cùng, reducer ghi `diceLanding` với ô, người chơi và lượt. `LAND` chỉ tự động đi đường tắt nếu dấu mốc này hợp lệ và ô hiện tại là cửa vào. Dấu mốc bị tiêu thụ trước khi bắt đầu chuyển động `kind: 'shortcut'`.

Hai tuyến giữ nguyên: `tile_4 → tile_8_mid`, `tile_16 → tile_30`. Animation 800 ms (70 ms khi hệ điều hành yêu cầu giảm chuyển động) chạy tới cửa ra theo hướng mũi tên trắng. Vị trí logic là đích của chuyển động; `Animated.ValueXY` giữ vị trí hiển thị đang nội suy. Không chuyển lượt trước callback hoàn tất. Event cũ/trùng và event trong lúc pause không được áp dụng.

Đi ngang cửa vào và di chuyển do thưởng/phạt không tạo dấu mốc dừng xúc xắc tại cửa vào. Lịch sử thêm đúng một cạnh cửa vào → cửa ra; phạt lùi pop đúng lịch sử đã đi, kể cả cạnh đường tắt. Cả người và bot dùng cùng reducer.

## 4–5. Con vật nằm trong asset và cách xóa

Bốn con vật được vẽ trực tiếp trong `assets/map_landscape.png`, không phải component trang trí. Ảnh gốc được giữ nguyên. Bản dùng trong game là `assets/map_landscape_clean.png` và được đăng ký trong `assets/index.ts`.

Dùng skill **imagegen**, công cụ built-in, để xóa bốn con vật và tái tạo vân gỗ/phong cảnh bị che. Chuẩn hóa ảnh tạo ra, ghép riêng vùng phục hồi vào ảnh gốc bằng System.Drawing với mép hòa trộn. Đây là artwork phục hồi được lưu thành ảnh nền mới, không phải lớp che trong React/CSS.

Hai ảnh đều 1024×576. So sánh pixel cho thấy toàn bộ thay đổi nằm trong hình chữ nhật `(25,225)–(118,306)` (cạnh phải/dưới không bao gồm). Mọi pixel ngoài vùng này giữ nguyên, gồm mũi tên trắng, đường đua, cửa vào/ra, hàng rào, cảnh rừng và các avatar phía trên. Git diff xác nhận sprite gameplay, ảnh gốc và `logic/tokenPlacement.ts` không bị sửa. `boardConfig.ts` chỉ đổi mô tả hai cửa vào; không thêm/xóa ô, đổi tọa độ hay kết nối tuyến.

Prompt cuối gửi imagegen:

> Precise object removal edit of this existing game board. Remove ONLY the four small full-body decorative animals standing on the wooden starting platform at far left around image coordinates x=30..114 y=227..303: orange fox, blue penguin, purple bunny, green turtle. Reconstruct the uncovered wooden planks, natural wood grain, platform and tiny background scenery seamlessly in the exact existing painted illustration style. Keep the wooden platform, all fence posts, railings, flowers and surrounding vegetation. Everything outside this small removal area MUST remain identical to input: all 50 path circles, their positions, white shortcut chevrons, race track, trees, top character portrait icons, title, finish platform and trophy, bottom UI panel. Do NOT remove the top portrait icons or bottom fox portrait. Maintain EXACT 1024x576 resolution, 16:9 aspect ratio, alignment, palette and composition. Save the edited board as a new image, not overwriting input.

## 6. File thay đổi

Dưới `src/games/race-to-finish/`:

- `state/raceReducer.ts`, `state/RaceController.ts`.
- `hooks/useRaceGame.ts`, `types/index.ts`, `logic/gameEngine.ts`, `data/boardConfig.ts`.
- `screens/RaceToFinishScreen.tsx`.
- `components/GameBoardView.tsx`, `components/AnimatedToken.tsx`; xóa `components/ForkChoiceModal.tsx`.
- `assets/index.ts`; thêm `assets/map_landscape_clean.png`.
- `tests/raceFlow.test.ts`, `tests/controller.test.ts`, `tests/race_to_finish.test.ts`.

Ngoài module: `scripts/race-e2e.mjs` và báo cáo này. Ảnh/bằng chứng nằm trong `artifacts/` được Git ignore.

## 7. Kết quả thực tế

- `npm test -- --runInBand`: **10 suites, 118 tests PASS**. Bao gồm kiểm tra độc lập 2.400 câu Toán lớp 5, chu kỳ bot 4 đúng/1 sai, lùi theo lịch sử, hai quân cùng ô, pause/resume, kết thúc ván và các regression đường tắt mới.
- `npm run typecheck`: **PASS**.
- `npm run lint`: **0 lỗi, 65 warning hiện có**. Console kiểm thử còn warning cũ về shadow/pointerEvents trên React Native Web.
- `git diff --check`: **PASS**; Git có thông báo chuẩn hóa LF/CRLF.
- `node scripts/race-e2e.mjs --shortcut-only`: **222 kiểm tra UI PASS** — animation thực tế ở cả hai đường tắt, vị trí ra chính xác, đi ngang và thưởng/phạt không kích hoạt.
- `node scripts/race-e2e.mjs --acceptance-only`: **43 kiểm tra UI PASS** — hết 30 giây, Đã hiểu, giải thích đáp án, thưởng/phạt tự động.
- `node scripts/race-e2e.mjs`: **2.959 kiểm tra UI PASS** — desktop 1440×1000, web điện thoại 320×568 và 390×844, hai quân cùng ô, pause/resume, một ván với bot hoàn chỉnh, không modal chọn tuyến và không runtime exception. Ván có 17 câu người chơi, 6 lần quay thưởng/phạt; 15 câu bot đầu chia thành ba chu kỳ, mỗi chu kỳ 4 đúng/1 sai; kết thúc đúng và quay về sảnh.

- `npm run export -- --platform all --output-dir artifacts/race-polish-export`: **PASS web, Android, iOS**; asset `map_landscape_clean.png` có trong danh sách đóng gói, cả ba bundle được xuất thành công.

Kiểm tra điện thoại ở trên là Chrome mô phỏng viewport/touch; không thay thế chạy trên thiết bị Android/iOS thật. Export xác nhận đóng gói bundle và asset native, chưa xác nhận runtime native trên thiết bị.

Bằng chứng máy đọc: `artifacts/race-shortcut-ui/result.json`, `artifacts/race-acceptance-ui/result.json`, `artifacts/race-e2e/result.json`, `artifacts/race-polish/asset-audit.json`.

## 8. Ảnh trước/sau và gameplay

- [Trước — vùng bục xuất phát](../artifacts/race-polish/start-before.png)
- [Sau — vùng bục xuất phát](../artifacts/race-polish/start-after.png)
- [Desktop sau chỉnh](../artifacts/race-e2e/desktop-corrected-board.png)
- [Màn hình 320 px sau chỉnh](../artifacts/race-e2e/small-board.png)
- [Animation đường tắt thứ nhất](../artifacts/race-shortcut-ui/crossing.png)
- [Cửa ra đường tắt thứ hai](../artifacts/race-shortcut-ui/second-exit.png)
- [Kết thúc ván với bot](../artifacts/race-e2e/phone-victory.png)

Hai quân cáo/cánh cụt vẫn có thể đứng ở xuất phát lúc bắt đầu ván: đó là token thật do người chơi điều khiển. Nhóm bốn con vật vẽ cố định đã được xóa khỏi nền.

Không sửa workspace `C:\Tro_choi_cho_em_anti`. Không commit/push. Thay đổi sẵn có ở `src/app/_layout.tsx` được giữ nguyên.
