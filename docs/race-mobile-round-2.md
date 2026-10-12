# Nghiệm thu sửa 5 lỗi mobile — vòng 2

Workspace `C:\Tro_choi_cho_em`, branch `fix/race-polish`. Không commit/push; không sửa workspace `_anti`. Báo cáo này bổ sung và thay thế phần crop sprite trong `race-five-mobile-fixes.md`.

## Đối chiếu tài liệu thực tế

Đã đọc `docs/references/race/mobile-round-2/README_THAM_CHIEU.txt`, xem hai PNG và giải mã toàn bộ 954 frame của video 30 fps, dài 31,8 giây. Trích 64 khung xuyên suốt video mỗi 0,5 giây và 28 khung chi tiết chuyển động mỗi 0,1 giây. Contact sheet nằm tại `artifacts/race-round-2/reference/`.

- 0–3,2s: rùa và thỏ ở xuất phát; HUD/roster đã phản ánh việc đổi nhân vật.
- 3,3–4,3s: tung xúc xắc; 4,4–17,3s: câu hỏi và nhập đáp án bằng bàn phím Android.
- 17,4–18,4s: feedback đúng; 18,5–19,7s: rùa di chuyển, camera theo, sprite chủ yếu đổi pose theo từng ô.
- 19,8–23,8s: vòng thưởng; 24–24,6s: tiến thêm do thưởng.
- 24,7–26,6s: chuyển sang thỏ máy nhưng nhãn vẫn “Cánh Cụt Máy”; camera chuyển sang thỏ, rồi tung xúc xắc.
- 26,7–29,3s: toán/feedback của bot; 29,4–30,3s: thỏ đi; 30,4–31,8s: vòng thưởng tiếp theo.

Ảnh 1 xác nhận thỏ máy mang tên cánh cụt. Ảnh 2 xác nhận phần đáy thỏ bị cắt, chân thỏ nằm trên avatar rùa, khung camera gần. Không coi video này là bằng chứng về một animation walk hoàn chỉnh đã tồn tại: source hiện tại chỉ chuyển pose theo ô và dịch vị trí, thiếu nhịp chuyển động bên trong một bước.

## Nguyên nhân và cách sửa

1. **Tên bot gắn với slot chọn, nhân vật lại có thể hoán đổi.** `SetupModal` lưu tên mặc định trong mảng cố định và chỉ đổi `playerChars` khi chọn avatar. HUD và controller thực tế đã dùng đúng participant id; chúng hiển thị sai vì `Player.name` sai ngay lúc bắt đầu ván. `defaultSetupName()` nay suy ra tên từ character đang chọn. Tên tự nhập vẫn thuộc participant và được giữ khi đổi nhân vật; tên trống khi bắt đầu dùng mặc định đúng. Cả hai slot bị hoán đổi đều cập nhật tên tự động. Không đổi id/turn index/camera binding.

2. **PNG thỏ đã mất chân trước khi render.** Crop 200×200 cũ cắt chân ở ranh giới hàng atlas. Bounds “phần chính” của lần sửa trước chỉ loại mẩu lẫn, không thể khôi phục pixel đã bị mất khỏi PNG. `TokenSprite` nay lấy source rectangle trực tiếp từ atlas gốc `raw/model_nv.png` 1024×682, đủ 24 pose của bốn nhân vật. Thỏ có canvas chuẩn 214 để đủ chiều cao cả tai và chân, các nhân vật còn lại dùng 200; mọi pose neo đáy tại 85% token size, trùng tâm vòng chọn và hệ placement hiện có. Không vẽ lại nhân vật, không sửa bitmap gốc. Image dùng cùng source atlas giữa các pose, đổi bounds/offset đồng bộ; không đổi bitmap bất đồng bộ mỗi bước.

3. **Avatar dùng PNG riêng nhưng chưa áp dụng crop sạch.** Trong `turtle_avatar.png` 128×128, chân thỏ là mảng riêng x=48..101, y=2..18; mặt rùa bắt đầu y=28. Avatar thỏ và cánh cụt cũng còn mẩu ở mép trên. `AVATAR_BOUNDS` và `CharacterAvatar` loại mẩu lẫn, giữ ảnh/màu/tỉ lệ chân dung nguyên gốc. Dùng chung component ở HUD, setup, handover, PlayerBanner và bảng kết quả. Bounds portrait riêng với bounds full-body; chiến thắng cũng dùng sprite atlas đầy đủ.

4. **Zoom hơi gần do mục tiêu gameplay `height / 285`.** Đổi sang `height / 315`: giảm độ phóng khoảng 9,5% trên landscape phone, tương đương khung nhìn rộng hơn khoảng 10,5%. Intro zoom-in, follow, chuyển lượt và recenter đều lấy cùng `bounds.zoom`; vẫn có floor fit, cap và clamp cũ. Pan thủ công và fullscreen/safe area giữ nguyên.

5. **Chuyển động chỉ dịch ảnh tĩnh giữa hai ô.** Thêm `tokenGait()` vào layer thân của `AnimatedToken`: nhún khoảng 10,5% token size, nghiêng tối đa 3,5°, co giãn nhẹ; một nhịp mỗi bước, ba nhịp cho shortcut dài. Pose walk_1/walk_2 theo bước từ engine được giữ, nay đủ chân. Progress của gait chính là progress di chuyển nên Pause freezes và resume tiếp tục đúng phần còn lại; không có timer/loop/callback hoàn tất thứ hai. Vòng chọn và camera theo điểm mặt đất, tránh camera triệt tiêu nhịp nhún. Kết thúc bước/idle trở về transform trung tính. Áp dụng chung cho bot, người, tiến thưởng, lùi phạt và shortcut; tôn trọng reduced motion của hệ điều hành.

Engine/reducer/question timer và luật thưởng/phạt không thay đổi trong vòng sửa này. Không phục hồi modal chọn đường tắt.

## Các file sửa trong vòng này

- `assets/index.ts`, `assets/spriteBounds.ts`.
- `components/AnimatedToken.tsx`, `TokenSprite.tsx`, `CharacterAvatar.tsx`, `RaceHUD.tsx`, `SetupModal.tsx`, `PlayerBanner.tsx`, `TurnHandoverModal.tsx`, `VictoryModal.tsx`.
- `logic/playerIdentity.ts`, `logic/tokenGait.ts`, `logic/cameraGeometry.ts`.
- `screens/RaceToFinishScreen.tsx`: preload atlas và portrait trước khi bắt đầu; giảm số request pose cũ.
- `tests/mobilePolish.test.tsx`, `tests/mobileRound2.test.tsx`, `scripts/race-round-2-e2e.mjs`, báo cáo này.

Các file đang dirty từ các vòng trước được giữ nguyên; danh sách `git status` tổng thể còn bao gồm chúng.

## Kiểm thử đã chạy

| Kiểm tra | Kết quả |
|---|---|
| TypeScript | PASS |
| Lint | 0 errors; 64 warnings cũ của dự án |
| Toàn bộ Jest, gồm architecture/import, toán, bot theo chu kỳ riêng từng id, shortcut/history, controller/pause và presentation | 166 tests / 13 suites PASS |
| Pixel thật: 24 vùng sprite phải chứa toàn bộ nhân vật gốc, không lấy pixel nhân vật khác; chân thỏ phía dưới y=512 còn nguyên | PASS |
| Pixel thật: cả 4 portrait giữ phần chính và loại các mẩu từ hàng khác | PASS |
| `race-round-2-e2e.mjs`: thao tác touch thực tế trên web, đổi roster thành rùa/thỏ/cáo/cánh cụt, giữ tên tự nhập, chơi đủ ván 4 người/bot đến chiến thắng | 3.460 checks PASS; 13 câu người, 36 câu bot; 361 mẫu gait |
| Gait quan sát trên web | Có human/bot forward, shortcut, advance reward và retreat penalty; Pause giữa shortcut freezes engine/gait/camera, resume hoàn tất ván |
| `race-five-fixes-e2e.mjs --safe-area` | 39 checks PASS: 2 người/2 token, pan không snap-back, recenter trước tung, fade feedback rồi mới move, pause và shortcut/history; safe area giả lập |
| `race-mobile-e2e.mjs` | 30 checks PASS: intro, dice, clock pause, shortcut, camera bot, reel, tiến thêm và cleanup |
| `race-e2e.mjs --acceptance-only` | 43 checks PASS: sai/hết 30s đứng yên chờ Đã hiểu, thưởng/phạt tự động và pause |
| `race-e2e.mjs --presentation-only` | 24 checks PASS trên viewport 16:9, 19,5:9 và 20:9 |
| `expo export --platform android` | PASS: 1.894 modules, 80 assets, Hermes bundle 4,3MB tại `artifacts/race-round-2/android-export` |

Kết quả JSON và ảnh nằm tại `artifacts/race-round-2/`, cùng các thư mục artifact của bộ regression tương ứng. TypeScript/SSR/export không phải chạy Android. CDP là Chrome với touch và viewport landscape, không phải native.

**Chưa kiểm thử trực tiếp native Android:** môi trường không có điện thoại USB/emulator khả dụng, người dùng chọn tự kiểm tra Expo Go. Chưa xác nhận trên thiết bị thật clipping Fabric, FPS, Back vật lý, notch, system bars và bàn phím. Không kết luận native PASS từ kết quả web/export.

## Kiểm tra lại bằng Expo Go

Metro chạy qua `npm run start` tại cổng 8090; URL LAN hiện tại `exp://192.168.2.2:8090`. Điện thoại và máy tính dùng cùng Wi-Fi. Reload ứng dụng, thoát ván cũ rồi vào game và bắt đầu ván mới để roster/name được tạo lại; nếu Metro đã dừng, chạy `npm run start` trong workspace này.

1. Chọn 2 người: rùa cho Em, thỏ cho Máy 1. Tên mặc định phải đổi sang Thỏ Tím Máy. Thử 3/4 người, hoán đổi nhân vật, nhập tên riêng; tên riêng phải giữ nguyên. Qua nhiều lượt: nhãn, viền portrait, token active và camera phải cùng người.
2. Xem thỏ ở idle/walk/penalty và rùa trên HUD: đủ chân thỏ, không có mẩu chân trên avatar rùa. Đặt hai token chung/gần ô để kiểm tra không ghost/lẫn hình.
3. Kéo xem map rồi nhấn Tung: pan giữ vị trí đến khi recenter; khung zoom thoáng hơn. Gần mép không có vùng ngoài map, nút không khuất.
4. Trả lời đúng: feedback biến mất hoàn toàn rồi mới di chuyển; nhìn rõ nhún/nghiêng/đổi pose. Thử bot, đường tắt, thưởng tiến và phạt lùi. Pause giữa bước/shortcut, chờ vài giây rồi resume: không mất gait/không nhân callback. Khi bật giảm chuyển động trong Android, gait sẽ được giảm theo cài đặt đó.
5. Sai và hết 30 giây vẫn đứng yên, chờ Đã hiểu. Back trong câu hỏi/thưởng mở Pause; menu chỉ Tiếp tục/Thoát. Thoát về sảnh khôi phục orientation như trước.

Ảnh trước là hai PNG native người dùng cung cấp. Ảnh sau là **web**, chưa có ảnh Android sau sửa:

- `artifacts/race-round-2/web/rabbit-bot-full-feet.png`: đúng tên thỏ máy và chân đầy đủ.
- `artifacts/race-round-2/web/wider-camera-clean-avatars.png`: roster sạch và zoom rộng hơn.
- `artifacts/race-round-2/web/shortcut-gait-paused.png`: menu Pause giữa shortcut.
- `artifacts/race-round-2/web/four-player-victory.png`: hoàn tất ván bốn người.
- `artifacts/race-round-2/sprite-audit.png` và `.html`: đối chiếu đủ 24 pose lấy từ atlas gốc.
- `artifacts/race-round-2/web-gait-preview.mp4`: clip web 15 giây, thỏ của người chơi đi sau feedback, qua shortcut rồi sang bot. Đây là screencast web đã ghép theo timestamp, không phải video native hay phép đo FPS trên Android.

Tham khảo API đã đối chiếu trước khi sửa: [Expo SDK 57 Reanimated](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/) và [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle/). Không thêm dependency native.
