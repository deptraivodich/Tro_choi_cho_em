# Sửa 5 lỗi Đua về đích trên Expo Go

Workspace `C:\Tro_choi_cho_em`, branch `fix/race-polish`. Đây là bản sửa tiếp sau nghiệm thu mobile ngày 12/10/2026. Không commit/push, không sửa workspace `_anti`.

## Nguyên nhân và cách sửa

1. **Vệt chân trên đầu chim cánh cụt nằm trong PNG.** Ảnh native `docs/references/race/mobile-landscape/Screenshot 2026-10-12 175346.png` khớp với mẩu chân màu nâu tại y=14–26 trong các PNG chim cánh cụt 200×200. Nó là phần hàng trước bị lẫn khi tách sprite sheet, không phải một instance cáo tồn tại ở vị trí cũ. Kiểm tra alpha còn tìm thấy mẩu ảnh tương tự trong thỏ, rùa và frame `fox_walk_2`. `spriteBounds.ts` lưu bounds của phần nhân vật chính cho cả 24 pose; `TokenSprite.tsx` cắt bằng container native `overflow: hidden`, `collapsable={false}`. Image giữ nguyên kích thước, tọa độ và điểm đặt chân; không sửa PNG nhân vật. Mỗi người chơi vẫn có đúng một AnimatedToken và một Image thân. Vòng chọn dùng chung progress/tọa độ nhưng ở dưới tất cả sprite; token đang đến lượt ở trước, token khác sắp theo chiều cao bàn chân.

2. **Feedback đúng và movement trước đây cùng đổi state trong khi native Modal còn fade.** `ANSWER_FEEDBACK_DONE` giờ chỉ chuyển sang `closing_answer`, giữ câu hỏi, vị trí, history và motion=null. MathQuestionModal fade toàn bộ card/backdrop; chỉ callback animation hoàn tất mới gửi `ANSWER_FEEDBACK_DISMISSED`, rồi reducer mới mở bước đi đầu tiên. 1.100ms là thời gian đọc feedback, không phải thời gian đoán modal đã đóng. Phase đóng không có timer tự mở movement. Pause hủy/freeze fade và resume phần còn lại; actionId, mounted guard và reducer loại callback cũ/trùng. Các overlay game nằm trong cây React của màn hình; không có Android Dialog bên ngoài tiếp tục animation dismiss sau callback. BackHandler và navigation guard vẫn mở Pause, không cho bỏ câu hỏi hay phần thưởng.

3. **Hàng bốn avatar được vẽ sẵn trong board, không phải roster React bị sai.** Tạo `map_landscape_roster.png` loại hàng avatar cố định và nút Pause vẽ sẵn, phục hồi nền rừng tự nhiên. Giữ `map_landscape.png` và `map_landscape_clean.png` để phục hồi. Chỉ ghép hai vùng header từ kết quả imagegen; ảnh cuối vẫn 1024×576 và giữ nguyên toàn bộ đường đua/phong cảnh/bục từ y=90 trở xuống. HUD render `players.map()`; hai/ba/bốn người cho đúng hai/ba/bốn avatar, không placeholder. Người hiện tại được đánh dấu viền vàng và nhãn tên.

4. **Camera trước đây follow vô điều kiện mỗi frame.** GameCamera dùng các mode `intro`, `focusCurrentPlayer`, `manualPan`, `followMovement`, `transitionToPlayer`, `recenterForRoll`. Pan gesture của Gesture Handler/Reanimated chạy trên UI thread, chuyển pixel kéo sang world-space theo scale, rồi clamp. Khi đã manualPan, idle renders và đổi lượt không kéo camera trở lại. Gesture không nhận input trong intro, Pause, modal hay movement. Camera chỉ thay đổi transform, không đổi vị trí logic/history.

5. **Nhấn Tung lấy lại focus trước khi đổ.** Nút tạo một request có actionId và nonce; camera chuyển mượt về tọa độ sprite hiện tại, callback focus hoàn tất mới gọi controller.roll. Chặn nhấn trùng và callback cũ. Pause trong recenter giữ request và tiến trình; resume tiếp tục. Khi có movement thật, kể cả bot/shortcut/thưởng/phạt, camera chuyển sang followMovement. Khi không manualPan, camera vẫn chuyển mượt khi đổi lượt.

6. **Viền xanh là safe area đang thu nhỏ cả canvas.** Root đo toàn bộ viewport và để board/nền rừng phủ phía dưới safe area. SafeAreaView chỉ bao setup và HUD; HUD absolute-fill nằm trong một View flex bên trong padding để thực sự tránh notch/gesture bar. Đặt HUD absolute trực tiếp dưới SafeAreaView sẽ bỏ qua padding, nên cách đó đã được sửa sau kiểm tra inset giả lập. Camera vẫn giữ tỉ lệ ảnh và clamp world bounds; không scale méo, không đổi tọa độ đường đua. Status bar vẫn ẩn theo route. System navigation bar của Android/Expo Go có thể còn hiện; chưa có thiết bị để nghiệm thu edge-to-edge thật.

Camera đóng băng khi câu hỏi/feedback còn mounted, không tự follow trong lúc fade; chỉ tiếp tục khi feedback đã đóng. Image thân được keyed theo character/pose để native không giữ texture frame trước trong khi vùng clip của pose mới đã cập nhật; outer AnimatedToken giữ nguyên instance/progress.

## Các file thuộc bản sửa này

- `components/AnimatedToken.tsx`, `TokenSprite.tsx`, `GameCamera.tsx`, `RaceHUD.tsx`, `MathQuestionModal.tsx`.
- `screens/RaceToFinishScreen.tsx`, `hooks/useRaceGame.ts`, `state/raceReducer.ts`, `types/index.ts`.
- `assets/index.ts`, `spriteBounds.ts`, `map_landscape_roster.png`.
- `tests/controller.test.ts`, `raceFlow.test.ts`, `mobilePolish.test.tsx`.
- `jest.config.js`, `__mocks__/racePresentation.js`, `scripts/race-five-fixes-e2e.mjs`, tài liệu này.

Các file khác đang dirty trong Git gồm thay đổi từ các nhiệm vụ trước; không reset hay ghi đè chúng. RaceController giữ scheduler/bot/luật hiện tại; phase đóng mới chờ callback UI giống gate animation movement/reel đã có.

## Công cụ chỉnh ảnh

Dùng built-in `image_gen` theo [imagegen skill](C:/Users/khatr/.codex/skills/.system/imagegen/SKILL.md). Prompt: remove ONLY four circular animal portraits in the top header x365..646/y0..80 and painted pause x945..1018/y0..80; naturally reconstruct forest; preserve title, every track tile, white shortcut arrow, coordinates, platforms, trophy, scenery and original dimensions/style. Kết quả AI được resize về kích thước gốc, rồi ghép/feather bằng Jimp chỉ trong hai vùng header x365..655/y0..86 và x940..1024/y0..86. Không dùng ảnh AI toàn phần thay board, không phủ hình chữ nhật màu trơn. Asset cuối nằm trong workspace ở `src/games/race-to-finish/assets/map_landscape_roster.png`.

Pan sử dụng dependency đã có, [Gesture Handler được Expo SDK 57 đóng gói trong Expo Go](https://docs.expo.dev/versions/v57.0.0/sdk/gesture-handler/); không thêm native module hay đổi framework.

## Kiểm thử trên điện thoại

Metro: `npm run start`, port 8090. Điện thoại và máy tính cùng Wi-Fi; mở Expo Go bằng QR terminal/`artifacts/race-mobile/expo-go-qr.svg` hoặc `exp://192.168.2.2:8090`. Reload hẳn bundle trước khi kiểm tra; tránh nghiệm thu giữa lúc Fast Refresh đang cập nhật source.

- Chọn 2 người: trên gameplay chỉ có hai avatar; xem đầu chim cánh cụt ở idle/walk/penalty/victory, không có mẩu chân. Kiểm tra lại ván 3 và 4 người.
- Vuốt ở giữa map lúc chờ Tung: xem vùng xa và chờ vài giây; camera không snap-back. Nhấn Tung: camera về nhân vật trước, rồi mới có dice overlay/câu hỏi.
- Trả lời đúng: thấy feedback, card và nền tối fade hết, rồi token/camera mới chạy. Pause trong feedback/recenter/movement, Tiếp tục phải tiếp đúng; không tung hai lần.
- Sai hoặc hết 30 giây: đứng yên, chờ Đã hiểu. Thử Back Android trong câu hỏi/thưởng: phải mở Pause, không bỏ luật. Pause chỉ có Tiếp tục/Thoát.
- Đi đúng cửa shortcut và đi ngang; thưởng/phạt đến cửa không kích hoạt. Bot vẫn 4 đúng/1 sai mỗi chu kỳ năm câu; camera theo lúc bot chạy.
- Hai token cùng ô và các ô gần nhau không dính sprite/ring. Chơi tới thắng rồi thoát; không có callback/timer cũ ở sảnh.
- Xem cả cạnh notch và gesture bar ở landscape; map phủ viewport, Pause/Tung/setup buttons vẫn bấm được. Thoát khôi phục orientation của ứng dụng chính.

**Chưa nghiệm thu native Android từ môi trường này:** không có thiết bị USB/emulator/Android SDK khả dụng và người dùng đã chọn tự kiểm tra bằng Expo Go. Export Android/Hermes và CDP touch là kiểm tra khác với chạy native; chưa kết luận FPS, Back thật, notch hay bàn phím Android đã PASS.

## Kết quả tự động

Các lệnh đã thực sự chạy trong lần sửa này:

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | 0 lỗi; 64 cảnh báo tồn tại sẵn |
| `npm test -- --runInBand --silent --json --outputFile artifacts/race-five-fixes/jest-result.json` | 12 suites, 154/154 tests PASS |
| `node scripts/race-five-fixes-e2e.mjs --safe-area` | 37 kiểm tra PASS: pan giữ vị trí qua đổi lượt; recenter trước roll; Pause giữa recenter/fade; feedback/camera đóng băng trước movement; map full bleed với inset trái 28, phải 18, dưới 14; bot movement lấy lại follow |
| `node scripts/race-mobile-e2e.mjs` | 30 kiểm tra PASS: intro, dice, toán, Pause/resume, shortcut, bot, reel/thưởng, movement, exit |
| `node scripts/race-e2e.mjs --presentation-only` | 24 kiểm tra PASS trên 16:9, 19.5:9, 20:9 |
| `node scripts/race-e2e.mjs --shortcut-only` | 218 kiểm tra PASS: hai cửa vào, đúng điểm dừng, đi ngang, effect không kích hoạt, history lùi |
| `node scripts/race-e2e.mjs --acceptance-only` | 43 kiểm tra PASS; chờ hết 30 giây thực tế, Đã hiểu, thưởng/phạt tự động |
| `node scripts/race-e2e.mjs --reduced-motion` | Ván hoàn chỉnh tới thắng và về sảnh; 2.367 kiểm tra PASS, 15 câu người chơi, 9 reel, 14 câu bot; hai chu kỳ bot đầy đủ đều đúng 4/5 |
| `npx expo export --platform android --output-dir artifacts/race-five-fixes/android-export` | PASS; bundle Hermes 4,3 MB, đủ asset mới; đây là bundle check, không phải chạy Android |
| `git diff --check` | PASS; chỉ có nhắc LF/CRLF từ Git |

SSR dùng mock presentation, không chứng minh gesture/animation native. Test pixel đọc PNG thật và xác nhận phần nhân vật chính nguyên vẹn, mẩu lẫn bị loại khỏi vùng clip; test board xác nhận title và toàn bộ track từ y=90 xuống không đổi pixel. CDP dùng input touch trên bản web thật; kết quả JSON đều ghi rõ không phải native Android. Camera được kiểm tra cả khi pan sau movement rồi đổi sang lượt bot: giữ manual cho tới khi bot thực sự bắt đầu di chuyển.

Ảnh trước native: `docs/references/race/mobile-landscape/Screenshot 2026-10-12 175346.png`. Ảnh sau web: `artifacts/race-five-fixes/safe-area/two-players-clean-tokens.png`, `manual-pan.png`, `feedback-closing-paused.png`, `shortcut-complete.png`. Không có ảnh chụp sau sửa trên điện thoại thật từ môi trường này.

Log/kết quả ở `artifacts/race-five-fixes/`, `artifacts/race-mobile/` và các thư mục regression `artifacts/race-{reference-ui,shortcut-ui,acceptance-ui,e2e-reduced}/`. Metro vẫn chạy LAN port 8090 để người dùng nghiệm thu bằng Expo Go.
