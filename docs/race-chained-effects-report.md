# Thưởng/phạt liên tiếp — Đua về đích

Workspace `C:\Tro_choi_cho_em`, branch `fix/race-polish`.

Đã xác minh hai chiều thưởng → phạt và phạt → thưởng bằng engine tests và thao tác UI thật trên **Chrome web, landscape 800×360**. Đã kiểm tra chống lặp, chờ animation, Pause/resume và chỉ một vòng quay tại một thời điểm. **Chưa kiểm thử phiên bản này trên Android thật/Expo Go**; export Android chỉ xác minh biên dịch.

## 1. Nguyên nhân

Đã đọc [README](references/race/chained-tile-effects/README_THAM_CHIEU.txt) và xem [ảnh PNG](references/race/chained-tile-effects/01_anh_loi_thuong_phat_lien_tiep.png). Ảnh cho thấy trạng thái tại thời điểm phát hiện; diễn biến chuỗi được đối chiếu với mô tả, reducer/controller và các kịch bản kiểm thử.

Trong code trước sửa, `APPLY` tạo movement thưởng/phạt với `resolveTile: false`. Khi animation cuối gửi `MOTION_DONE`, reducer thấy flag này và gọi thẳng `endTurn`. Vì thế controller không bao giờ vào `evaluating_tile` để mở vòng quay ở ô mới. Đây là nguyên nhân chung cho cả tiến và lùi; modal và xác suất không gây ra lỗi.

## 2. Những file sửa trong nhiệm vụ này

| File | Nội dung |
|---|---|
| [raceReducer.ts](../src/games/race-to-finish/state/raceReducer.ts) | Phân biệt nguyên nhân di chuyển, đánh giá ô sau bước cuối, lưu context chuỗi, kết thúc đúng lúc. |
| [RaceController.ts](../src/games/race-to-finish/state/RaceController.ts) | Dùng scheduler hiện tại xử lý landing tiếp theo; không rút RNG cho ô đã xử lý hoặc vượt giới hạn. |
| [tileEffectChain.ts](../src/games/race-to-finish/state/tileEffectChain.ts) — mới | Context chuỗi và điều kiện mỗi ô một lần, tối đa 8 hiệu ứng. |
| [chainedEffects.test.ts](../src/games/race-to-finish/tests/chainedEffects.test.ts) — mới | 21 trường hợp engine/controller, gồm các topology và bảo vệ vòng lặp. |
| [movementTiming.test.js](../src/games/race-to-finish/tests/movementTiming.test.js) | Tích hợp chuỗi với `AnimatedToken` thật trong mô phỏng boundary native; giữ clock 300 ms và Resume phần còn lại. |
| [raceFlow.test.ts](../src/games/race-to-finish/tests/raceFlow.test.ts), [controller.test.ts](../src/games/race-to-finish/tests/controller.test.ts) | Thay các giả định cũ “effect movement kết thúc lượt ngay” bằng đánh giá ô sau animation. |
| [race-chain-e2e.mjs](../scripts/race-chain-e2e.mjs) — mới | Kiểm thử UI, đọc frame, kiểm tra modal/Pause/timing, quay hai clip. |
| [race-chain-find-seeds.cjs](../scripts/race-chain-find-seeds.cjs) — mới | Tìm seed kịch bản từ PRNG, generator và reducer thật; không đổi pool. |
| [race-round-2-e2e.mjs](../scripts/race-round-2-e2e.mjs) | Cập nhật bộ quan sát sang trường `motion.cause`. |
| [race-movement-video.py](../scripts/race-movement-video.py) | Cho phép chọn thư mục và tên clip khi xuất video; giữ cách gọi cũ. |
| Tài liệu này | Báo cáo và bằng chứng nghiệm thu. |

Các thay đổi animation đã có từ nhiệm vụ trước vẫn được giữ. Nhiệm vụ này không sửa `AnimatedToken`, `TokenSprite`, `GameCamera`, `useRaceGame`, screen, modal, assets, board hoặc `gameEngine`/pool xác suất. Không thay đổi workspace `_anti`; không reset/commit/push Git.

## 3. Kiến trúc chuỗi

`Movement.cause` thay flag boolean nhập nhằng bằng `dice | bonus | penalty | shortcut`. Khi `remaining > 0`, `MOTION_DONE` chỉ bắt đầu bước kế tiếp. Chỉ sau animation cuối, chuyển động xúc xắc/thưởng/phạt/về xuất phát mới vào `evaluating_tile`.

Controller dùng scheduler sẵn có để gửi `LAND`. Reducer quyết định: ô thường thì kết thúc; ô thưởng/phạt hợp lệ thì tạo đúng một `mysteryRollState`; ô đã kích hoạt hoặc chạm giới hạn thì kết thúc. Vòng quay gửi `SPIN_DONE`, controller chờ thời gian công bố cũ rồi `APPLY`. Hiệu ứng có di chuyển lại chờ animation trước khi đánh giá ô tiếp theo. Không thêm timer rời rạc hay `useEffect` điều phối chuỗi.

`effectChain` lưu:

- `id`, `turnId`, `playerIndex`: định danh và chủ sở hữu chuỗi.
- `currentTileId`: ô đang phát sinh hiệu ứng.
- `triggeredTileIds`: các ô đã kích hoạt trong chuỗi, độc lập với history bị rút ngắn khi đi lùi.
- `effectCount`: số hiệu ứng đã được kích hoạt, tính cả hiệu ứng đang xử lý.
- `effectActionId`: action mở vòng quay hiện tại, cũng là ID của mystery.

Mọi event tiếp tục dùng `actionId` và kiểm tra phase hiện tại. Callback cũ, `APPLY` trùng, `NEXT`/`ROLL` giữa chuỗi đều bị bỏ qua. Context tồn tại qua vòng quay, công bố kết quả, chuyển động và Pause; chỉ xóa khi chuỗi kết thúc, thắng game hoặc bắt đầu phiên mới sau khi hủy phiên cũ.

## 4. Hai chiều và các ô trung gian

Kịch bản trên board thật đã nghiệm thu:

| Kịch bản | Diễn biến đã quan sát |
|---|---|
| Seed 20, xúc xắc 5 | `tile_4_bonus`: tiến 1 → hoàn tất animation tới `tile_5` → vòng quay phạt lùi 1 → hoàn tất animation về `tile_4_bonus` → kết thúc chuỗi vì ô thưởng này đã xử lý. |
| Seed 286, xúc xắc 6 | `tile_5`: lùi 1 → hoàn tất animation tới `tile_4_bonus` → vòng quay thưởng nhận khiên → cấp khiên một lần rồi kết thúc lượt. |

Thưởng → thưởng, phạt → phạt và chuỗi ba ô khác nhau dùng cùng luồng. Với tiến/lùi 2 ô, `LAND` bị từ chối khi còn motion; ô trung gian không được ghi vào danh sách kích hoạt. Chỉ ô cuối được xét sau callback animation cuối.

Một số topology yêu cầu không có trên artwork hiện tại, như hai ô thưởng liền nhau. Regression tests giả lập **loại ô trong fixture cô lập**, giữ route/ID/coordinate; không sửa board sản phẩm để tạo tình huống test.

## 5. Chống vòng lặp và giữ luật cũ

Đánh dấu ô vào `triggeredTileIds` ngay khi chấp nhận `LAND` hợp lệ, trước khi mở vòng quay. Quay lại ô cũ vẫn hoàn tất animation và history nhưng không mở lại hiệu ứng. Mỗi chuỗi cho phép tối đa 8 hiệu ứng; hiệu ứng thứ 8 vẫn áp dụng đủ, nhân vật vẫn tới đích di chuyển của nó, rồi không kích hoạt hiệu ứng thứ 9. Controller cũng kiểm tra điều kiện này trước RNG.

Chỉ movement `cause: dice` tạo `diceLanding`; chỉ landing này và đáp án đúng mới đủ điều kiện shortcut. Thưởng/phạt tới cửa vào kết thúc chuỗi tại đó. Shortcut vẫn nghỉ 450 ms và đi 1.200 ms, không có modal chọn đường.

Khiên, sao hóa giải và mất lượt giữ nguyên nhánh `APPLY` cũ. Phạt bị hóa giải kết thúc tại chỗ, không có chuyển động phạt. Cờ mất lượt được tiêu thụ đúng một lần khi tới lượt tương ứng. Pool và trọng số không sửa; `reset_start` vẫn bị loại sau 10 ô đầu và bị reducer từ chối nếu event không hợp lệ. Về xuất phát hoàn tất animation rồi đánh giá ô start là điểm kết thúc bình thường.

## 6. Animation, camera và Pause

Mỗi bước tiếp tục dùng worklet 300 ms của bản sửa trước. Reducer chỉ gửi destination của bước hiện tại; camera vẫn theo tọa độ token đang render. Trong các chuyển động effect quay được trên web, mỗi bước có 19–20 tọa độ phân biệt và cả hai walk pose. Khoảng hoàn tất action đo được khoảng 372–465 ms gồm bàn giao callback/render và thao tác Pause; duration nội suy vẫn 300 ms, không được coi số đo web là số đo native.

`mysteryRollState` được xóa trước khi bắt đầu effect movement. Vòng quay mới chỉ được tạo sau event hoàn tất bước cuối. E2E kiểm tra từng frame không có reel khi tọa độ token đang thay đổi và không có hơn một modal thưởng/phạt.

Pause dùng cơ chế hiện tại: reducer chặn event, controller giữ phần delay còn lại, token giữ progress và generation. Test native boundary Pause tại 113 ms của bước thưởng, Resume còn 187 ms; bước phạt kế tiếp nhận đủ 300 ms. E2E Pause lúc công bố thưởng và giữa bước đi, kiểm tra state/context, token, gait, camera và reel đứng yên. Disconnect hủy timer landing; callback của phiên cũ không tác động tới phiên mới.

## 7. Kết quả kiểm thử

| Lệnh | Kết quả |
|---|---|
| `npm test -- --runInBand --silent` | **15 suites / 210 tests PASS**, gồm toàn bộ tests hiện có, architecture/shared và regression mới. |
| `npm run typecheck` | PASS. |
| `npm run lint -- -- --format json --output-file artifacts/race-chained-effects/lint.json` | PASS: 0 errors, 64 warnings có sẵn; không warning mới trong chain code/tests. |
| `node scripts/race-chain-find-seeds.cjs` | Tìm seed 20 và 286 bằng engine thật. |
| `node scripts/race-chain-e2e.mjs` | **106 checks PASS** trên Chrome web: hai chiều, vòng lặp, Pause, animation, context, turn, một modal, vật phẩm. |
| `npx expo export --platform android --output-dir artifacts/race-chained-effects/android-bundle` | PASS: bundle Hermes, 1896 modules. Đây là compile, không phải chạy Android thật. |
| `git diff --check` | PASS. |

Regression mới bao phủ đủ 16 nhóm yêu cầu: tiến/lùi 1–2 tới ô đặc biệt; cùng/khác loại; chuỗi ba ô; quay lại ô cũ; bỏ qua ô trung gian; fork không kích hoạt do effect; khiên/sao; mất lượt; Pause; người/bot; chỉ chuyển lượt sau khi chuỗi xong; một modal. Ngoài ra có giới hạn 8, callback trùng/cũ, không rút RNG lần hai, reset_start, disconnect và restart.

Hai test cũ ban đầu thất bại vì mặc định effect kết thúc lượt ngay; đã cập nhật để đợi đánh giá ô và kiểm tra hành vi mới. Các test animation 1–6, full-game controller cho bot, shortcut, câu toán 30 giây và pool cũ đều PASS trong lần chạy toàn bộ.

Video **web 1×**, dùng timestamp gốc, không tua chậm:

- [Thưởng → phạt → ô thưởng cũ, có Pause/resume](../artifacts/race-chained-effects/bonus-penalty-cycle-web-1x.mp4) — 16,52 giây.
- [Phạt → thưởng → nhận khiên](../artifacts/race-chained-effects/penalty-bonus-web-1x.mp4) — 14,10 giây.
- [Kết quả E2E](../artifacts/race-chained-effects/result.json), [frame/transition kịch bản 1](../artifacts/race-chained-effects/bonus-penalty-cycle-samples.json), [kịch bản 2](../artifacts/race-chained-effects/penalty-bonus-samples.json).
- [Ảnh chuyển từ thưởng sang phạt](../artifacts/race-chained-effects/bonus-penalty-cycle-contact-3.jpg), [kết thúc chuỗi nhận khiên](../artifacts/race-chained-effects/penalty-bonus-contact-3.jpg).

## 8. Kiểm tra lại Expo Go

Metro đang chạy LAN tại `exp://192.168.2.2:8090`. Điện thoại và máy tính cùng mạng; Reload rồi bắt đầu ván mới để không dùng state cũ của Fast Refresh.

1. Trên tuyến chính, dừng tại ô thưởng ngay sau cửa vào shortcut đầu tiên. Khi quay được tiến 1, chờ nhân vật tới ô phạt kế bên: vòng quay phạt phải tự mở trong cùng lượt.
2. Ở ô phạt đó, khi quay được lùi 1, phải quay thưởng ở ô phía sau nếu ô thưởng chưa được kích hoạt trong chuỗi hiện tại.
3. Nếu đi thưởng → phạt → trở lại chính ô thưởng vừa xử lý, nhân vật vẫn về đúng ô nhưng không quay thưởng lần nữa; lượt kết thúc hợp lệ.
4. Pause lúc công bố kết quả và giữa bước đi; Resume phải tiếp tục đúng chỗ, không cấp đồ hoặc quay lại hiệu ứng đã áp dụng.
5. Thử tiến/lùi 2: chỉ xét ô cuối. Thưởng/phạt dừng tại cửa shortcut phải đứng ở đó; lượt xúc xắc hợp lệ vẫn có nhịp nghỉ và tự đi shortcut như cũ.

Seed chỉ được đặt trong script E2E trên web để tái hiện; bản Expo Go giữ RNG và xác suất bình thường. Chưa có clip hoặc xác nhận thiết bị Android thật sau bản sửa này.
