# Nghiệm thu movement timing — Đua về đích

Workspace `C:\Tro_choi_cho_em`, branch `fix/race-polish`.

Đã sửa nguyên nhân shared value khiến các bước sau kết thúc gần như tức thời. Đã nghiệm thu chuyển động bằng frame và video trên Chrome web, màn hình ngang 800×360. **Chưa đo phiên bản sau sửa trên Android thật/Expo Go**; người dùng đã chọn tự kiểm tra thiết bị. Bundle Android biên dịch thành công không thay thế kiểm thử thiết bị.

## 1. Root cause và đối chiếu video

Đã đọc [README tham chiếu](references/race/movement-timing/README_THAM_CHIEU.txt), giải mã toàn bộ 1.632 frame của [video Expo Go gốc](references/race/movement-timing/video_expo_go_movement_54s.mp4): 54,4 giây, 30 fps, 1600×720. Xem toàn bộ diễn biến qua contact sheet và xem từng frame ở các lượt 1, 2, 4, 6 ô. Camera cũng chuyển động nên dùng vị trí nhân vật tương đối với ô đường đua để phân biệt chuyển động quân và chuyển động camera.

Trong code cũ của `AnimatedToken.tsx`, JS thực hiện:

```ts
progress.value = 0;
progress.value = withTiming(1, { duration: duration * (1 - progress.value) });
```

Trên native, setter từ JS xếp việc cập nhật vào UI; getter ngay sau đó vẫn có thể đọc giá trị UI cũ. Sau bước trước, giá trị đó bằng 1, vì vậy phép tính duration cho bước kế tiếp thành `280 × (1 - 1) = 0`. Điều này được đối chiếu với `mutables.ts` và cơ chế batching `scheduleOnUI` trong dependencies cài tại workspace, đồng thời tái hiện bằng test có setter JS bất đồng bộ. [Tài liệu shared values của Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/) mô tả sự khác biệt cập nhật trên JS và UI.

Bước đầu có thời lượng đầy đủ vì render trạng thái idle/question đã reset progress về 0 trong khi câu hỏi đang hiển thị. Các bước tiếp theo khởi động ngay từ callback của bước trước, lúc UI progress vừa đạt 1, nên lộ lỗi đọc giá trị cũ.

Reducer vốn chỉ tiến một destination sau mỗi `MOTION_DONE`; controller không chia duration chung cho N bước và không có timer giả hoàn tất movement. Callback hoàn tất quá nhanh là hậu quả của duration bằng 0. Camera vốn theo tọa độ render của token, không đi trước tới tile cuối. Sprite cũ giữ một walk pose trong cả bước và đổi pose theo số bước còn lại; đã bổ sung chu kỳ hai pose trong từng bước.

## 2. File thay đổi

| File | Thay đổi |
|---|---|
| [AnimatedToken.tsx](../src/games/race-to-finish/components/AnimatedToken.tsx) | Gọi worklet UI, key riêng mỗi bước, chặn callback cũ/trùng, cleanup. |
| [tokenMotion.ts](../src/games/race-to-finish/logic/tokenMotion.ts) — mới | Reset/tính thời gian/chạy animation nguyên tử trên UI; giữ progress khi Pause. |
| [TokenSprite.tsx](../src/games/race-to-finish/components/TokenSprite.tsx) | Atlas chuyển walk_1/walk_2 theo cùng progress; giữ bounds, chân và ảnh cũ. |
| [RaceToFinishScreen.tsx](../src/games/race-to-finish/screens/RaceToFinishScreen.tsx) | Camera/token cùng nhận trạng thái Pause của game, vẫn cho intro chạy. |
| [raceReducer.ts](../src/games/race-to-finish/state/raceReducer.ts) | Phase `shortcut_pause`, event `SHORTCUT_READY`, idle ở cửa vào, pose đi lùi. |
| [RaceController.ts](../src/games/race-to-finish/state/RaceController.ts) | Lên lịch nhịp nghỉ bằng scheduler có Pause/resume hiện tại. |
| [turnTiming.ts](../src/games/race-to-finish/state/turnTiming.ts), [types/index.ts](../src/games/race-to-finish/types/index.ts) | Hằng 450 ms và kiểu phase mới. |
| [movementTiming.test.js](../src/games/race-to-finish/tests/movementTiming.test.js) — mới | Mô phỏng boundary JS/UI native; kiểm tra N bước, pause, callback trễ, unmount, thưởng/phạt và shortcut. |
| [raceFlow.test.ts](../src/games/race-to-finish/tests/raceFlow.test.ts), [controller.test.ts](../src/games/race-to-finish/tests/controller.test.ts) | Kiểm tra phase idle trước shortcut và scheduler. |
| [race-movement-e2e.mjs](../scripts/race-movement-e2e.mjs) — mới | Đọc frame render thật qua CDP, kiểm tra vị trí/gait/pose/timing, quay video. |
| [race-five-fixes-e2e.mjs](../scripts/race-five-fixes-e2e.mjs) | Bấm nút Pause ngay để ngắt recenter ngắn; tránh thời gian chờ hình học của driver touch làm test bỏ lỡ. |
| [race-movement-video.py](../scripts/race-movement-video.py) — mới | Xuất MP4/contact sheet từ screencast có timestamp, giữ tốc độ 1×. |
| Tài liệu này | Số đo, bằng chứng và hướng dẫn kiểm tra thiết bị. |

Đã rà soát `GameCamera`, `useRaceGame`, route engine, placement và graph shortcut. Chúng không cần thay đổi thuật toán. Không đổi board, HUD, ảnh, luật toán, xác suất thưởng/phạt, các game khác hay workspace `_anti`. Không commit/push/reset Git.

## 3. Timing trước và sau

**Trước: số đo từ video Android gốc**, độ phân giải thời gian 33,3 ms/frame. Các bước nhảy ở frame kế tiếp được ghi là ≤33 ms, không coi đây là duration cấu hình.

| Xúc xắc | Khoảng video | Thời gian chuyển động từng bước, ms |
|---|---|---|
| 1 — thỏ máy | 27,167–27,467 s | ≈300 |
| 4 — người chơi | 51,500–52,100 s | ≈300; ≤33; ≤33; ≤33 |
| 6 — người chơi | 16,700–17,567 s | ≈300; ≤33; ≤33; ≤33; ≤33; ≤33 |

Khoảng giữa các bước còn gồm chờ callback/render; không cộng chúng vào thời gian nhân vật thực sự đi. Duration cũ trong code là 280 ms; video thấy khoảng 300 ms do sampling/frame scheduling. Vì vậy baseline mới là **300 ms cho mỗi ô**, lấy từ bước một ô được đánh giá tốt, không tăng tùy tiện lên 600 ms.

**Sau: số đo trực tiếp trên web**, từ frame đầu của action đang di chuyển tới frame action tiếp theo. Đây là khoảng hoàn tất bước, gồm thời gian animation UI **và** bàn giao callback/render JS; không phải số đo native và không phải chỉ thời gian nội suy 300 ms.

| Xúc xắc | Khoảng hoàn tất từng bước trên web, ms | Tổng tuyến chính, ms |
|---|---|---:|
| 1 | 399,9 | 399,9 |
| 2 | 416,8; 399,9 | 816,7 |
| 3 | 400,0; 400,2; 399,9 | 1200,1 |
| 4 | 416,8; 416,6; 400,0; 433,5 | 1666,9 |
| 5 | 417,1; 383,0; 400,1; 383,3; 400,0 | 1983,5 |
| 6 | 450,1; 399,9; 416,7; 416,6; 416,8; 416,7 | 2516,8 |

Mọi bước trong lượt 1–6 có 16–19 tọa độ render phân biệt và cả hai walk pose, không chỉ kiểm tra vị trí cuối. Shortcut ở lượt 4 có 73 tọa độ phân biệt, 75 frame quan sát, khoảng hoàn tất 1383,5 ms. Nhịp idle ở cửa vào quan sát được 483,3 ms, trong đó budget scheduler là 450 ms.

Clock animation trong test mô phỏng native là 300 ms cho **từng** bước: tổng 300 / 1200 / 1800 ms với xúc xắc 1 / 4 / 6, chưa cộng callback bàn giao. Khi Pause tại 113 ms, Resume còn 187 ms; bước sau vẫn nhận đầy đủ 300 ms. **Duration thực tế sau sửa trên Android chưa có số đo.**

Dữ liệu gốc: [result.json](../artifacts/race-movement-timing/result.json), [frame lượt 4](../artifacts/race-movement-timing/dice-4-samples.json), [frame lượt 6](../artifacts/race-movement-timing/dice-6-samples.json).

## 4. Điều phối từng bước

Mỗi action di chuyển dùng key `step:<actionId>`. Worklet chạy trên UI: hủy animation cũ, chụp tọa độ đang render, đặt from/to, reset progress về 0 và khởi động clock 300 ms. Tất cả thao tác đọc/ghi này cùng thread; không đọc progress vừa reset từ JS.

Chỉ callback `finished=true` đúng generation mới gửi về JS. JS kiểm tra mounted, action hiện tại, generation, Pause và action đã hoàn tất trước khi gửi `MOTION_DONE`. Reducer chỉ bắt đầu bước kế tiếp sau event này. Bước cuối hoàn tất mới đánh giá ô đích. Không chia tổng duration theo dice hoặc remaining; một lượt sáu ô cần sáu clock độc lập.

Logical tile là destination của **bước đang diễn ra**, theo kiến trúc hiện tại; vị trí hiển thị được nội suy. Controller không đặt cả lượt tại tile cuối trước animation.

## 5. Nhịp nghỉ và đường tắt

Sau khi bước cuối của một lượt xúc xắc hợp lệ hoàn tất ở fork, `LAND` tiêu thụ eligibility đúng một lần, giữ tile/history cửa vào, đặt pose idle và chuyển sang `shortcut_pause`. Scheduler giữ 450 ms; sau đó `SHORTCUT_READY` bắt đầu traversal 1200 ms. Hoàn tất animation mới kết thúc lượt.

Graph hiện tại có hai shortcut, mỗi shortcut là một cạnh từ cửa vào tới cửa ra, không có waypoint trung gian. Giữ nội suy liên tục theo cạnh đã có và đường mũi tên trắng, không thêm đường đi hoặc tile. Chỉ lượt xúc xắc đúng mới tạo eligibility. Đi ngang, trả lời sai/hết giờ, thưởng/phạt tới fork đều không kích hoạt. Không thêm modal chọn đường.

## 6. Camera và sprite

Vị trí, gait nhún và atlas pose cùng đọc progress UI. Mỗi ô chuyển walk_1 → walk_2; shortcut lặp bốn chu kỳ. Cả đi tiến và đi lùi có hoạt ảnh đi bộ. Atlas/bounds và điểm chân cũ được giữ; không sửa bitmap. Khi bật reduced motion, giảm chuyển động trang trí của gait/pose nhưng vẫn giữ thời gian đường đi để người chơi quan sát.

Camera tracking đọc tọa độ nội suy của token qua `useAnimatedReaction`. `GameCamera` tiếp tục follow điểm này bằng smoothing hiện có, giữ intro, pan thủ công, focus và recenter. Không tạo clock camera chạy trước destination. Kiểm tra web xác nhận pan giữ vị trí, bấm Tung recenter trước khi roll, Pause ngắt recenter và bot chuyển động giành lại follow đúng lúc.

## 7. Pause/resume và cleanup

Pause hủy timing tại UI nhưng giữ key, from/to, progress và duration gốc. Resume cùng key khởi động phần còn lại `duration × (1 - progress)` trên UI, giữ tiến độ gait/pose. Không dựa vào thời gian đã trôi ngoài đời và không tăng tốc các bước sau.

Clock nhịp nghỉ shortcut lưu thời gian còn lại trong scheduler của controller. Resume tiếp tục budget này, không lên lịch 450 ms mới. Action ID/generation chặn callback cũ hoặc callback đã xếp hàng trước Pause. Có test riêng trường hợp UI vừa hoàn tất nhưng callback JS còn chờ: Pause không cho advance; Resume nhận completion đúng một lần và bước sau vẫn 300 ms.

Unmount hủy animation UI, vô hiệu hóa generation; callback JS trễ bị chặn bởi mounted/sequence. Disconnect hủy timer controller. Video Pause kiểm tra vị trí, atlas, gait, camera và snapshot state đứng yên cả ở giữa bước, cửa vào và giữa shortcut. Sau Resume, đủ bốn bước và đúng một shortcut, history `tile_0,tile_1,tile_2,tile_3,tile_4,tile_8_mid`. Thời gian idle hoạt động lấy mẫu là 433,1 ms sau khi trừ Pause; sai số sampling khoảng một frame.

## 8. Kiểm thử và kết quả

| Kiểm thử | Kết quả |
|---|---|
| `npm run test:race -- --silent` | 10 suites, 153 tests PASS; gồm người/bot 1–6, tiến/lùi thưởng phạt, callback trễ, Pause, shortcut, timer 30 giây và luật shortcut. |
| `npm run typecheck` | PASS. |
| `npm run lint -- -- --format json --output-file artifacts/race-movement-timing/lint.json` | 0 errors; 64 warning có sẵn, không warning trong code movement mới. |
| `node scripts/race-movement-e2e.mjs` | PASS 570 checks về số bước, timing, tọa độ liên tục, gait, cả hai pose và shortcut. |
| `node scripts/race-movement-e2e.mjs --pause-only` | PASS 30 checks; Pause/Resume qua ba giai đoạn, không nhân đôi shortcut. |
| `node scripts/race-five-fixes-e2e.mjs` | PASS 32 checks; pan/recenter, Pause, feedback fade và follow bot. |
| `node scripts/race-round-2-e2e.mjs` | PASS 3538 checks; một ván thật qua UI, một người + ba bot, 13 câu người chơi, 409 mẫu gait, thưởng/phạt và màn thắng/thoát. |
| `node scripts/race-e2e.mjs --acceptance-only` | PASS 43 checks; toán đúng/sai/hết 30 giây, reel thưởng/phạt. |
| `npx expo export --platform android --output-dir artifacts/race-movement-timing/android-bundle` | PASS; bundle Hermes Android, 1895 modules. **Chỉ là compile, chưa chạy trên thiết bị.** |
| `git diff --check`, rà soát hướng import theo `docs/ARCHITECTURE.md` | PASS; game chỉ dùng module riêng và shared, không thêm phụ thuộc game khác. |
| Android Expo Go thật sau sửa | Chờ người dùng tự kiểm tra; chưa có video/số đo native sau sửa. |

Một lần test recenter ban đầu bỏ lỡ cửa sổ 400 ms vì helper CDP touch chờ button ổn định. Đã sửa driver dùng click ngay vào nút Pause công khai, rồi test PASS. Kịch bản Pause mới cũng dùng click nút UI đúng frame để tránh polling ngoài tiến trình bỏ lỡ bước 300 ms. Không ép callback animation hay gửi event di chuyển giả vào app trong các kiểm thử web.

## 9. Video và ảnh nghiệm thu

Video là **Chrome web**, tốc độ **1×**, dùng timestamp screencast để giữ nguyên các khoảng thời gian; không nội suy tạo frame hoặc tua chậm để làm chuyển động đẹp hơn. MP4 chứa frame lặp khi screencast không gửi frame mới. Bộ lấy mẫu RAF riêng kiểm tra từng bước; không coi số JPEG của screencast là số frame animation đầy đủ.

- [Lượt 1 ô](../artifacts/race-movement-timing/dice-1-web-1x.mp4).
- [Lượt 4 ô → idle ở cửa vào → shortcut](../artifacts/race-movement-timing/dice-4-web-1x.mp4).
- [Lượt 6 ô](../artifacts/race-movement-timing/dice-6-web-1x.mp4).
- [Pause/resume giữa bước, tại cửa vào và giữa shortcut](../artifacts/race-movement-timing/pause-resume-web-1x.mp4).
- [Contact sheet lượt 4](../artifacts/race-movement-timing/dice-4-contact-1.jpg), [đoạn cửa ra](../artifacts/race-movement-timing/dice-4-contact-2.jpg), [Pause](../artifacts/race-movement-timing/pause-resume-contact-2.jpg).
- [Kết quả Pause](../artifacts/race-movement-timing/pause-result.json), [camera](../artifacts/race-five-fixes/result.json), [ván đầy đủ](../artifacts/race-round-2/web/result.json).

Đã kiểm tra ảnh contact sheet toàn bộ các clip và dữ liệu frame về chu kỳ pose, vị trí liên tục, nhịp idle và Pause. Artifacts nằm trong thư mục Git ignore, có sẵn trên máy để xem lại. Muốn quay lại: chạy Metro web ở port 8090 rồi chạy hai lệnh `race-movement-e2e.mjs` ở trên; `python scripts/race-movement-video.py` xuất MP4 nếu máy có OpenCV và Pillow. Không cần chúng trong runtime game.

## 10. Kiểm tra lại trên Expo Go

Metro Expo Go đang phục vụ LAN: `exp://192.168.2.2:8090`. Điện thoại và máy tính cần cùng mạng. Nếu phải khởi động lại, trong workspace chạy `npm start -- --lan --go` rồi dùng địa chỉ/QR Metro mới.

1. Reload Expo Go và bắt đầu **ván mới** để kiểm tra phiên bản sau sửa, không tiếp tục state giữ lại bởi Fast Refresh.
2. Dùng landscape, thử người chơi và bot. Với kết quả 1–6, đếm từng lần đi ô; bước 2–6 phải có đầy đủ nhịp đi giống bước đầu.
3. Từ xuất phát, lượt 4 đúng phải đi bốn ô, đứng tại cửa vào khoảng 0,45 giây rồi đi shortcut khoảng 1,2 giây. Lượt 5/6 đi ngang cửa vào phải tiếp tục tuyến chính.
4. Pause giữa bước, ở nhịp nghỉ và giữa shortcut; chờ vài giây rồi Resume. Quân, pose và camera phải tiếp tục từ chỗ dừng, còn đủ bước và chỉ qua shortcut một lần.
5. Pan lúc chờ rồi bấm Tung để recenter. Kiểm tra câu toán 30 giây, trả lời sai/hết giờ, thưởng tiến 1/2, phạt lùi 1/2 và chơi tới màn thắng.

Để chốt nghiệm thu native, cần đối chiếu trực tiếp nhịp từng ô trên điện thoại; các số đo và video web ở trên không được xem là số đo Android.
