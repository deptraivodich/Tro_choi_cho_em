# Nghiệm thu Siêu Xe Vượt Địa Hình — 14/10/2026

Đã triển khai gameplay vào module hiện hữu `src/games/terrain-racing`, giữ GameId và public entry `TerrainRacingScreen({ onExit })`. Bản web tương tác đã hoàn thành đủ 5 chặng, hai nhánh thua, pause/resume và cảnh cuối. Chưa nghiệm thu native trên điện thoại thật; export Hermes Android/iOS không thay thế kiểm thử thiết bị.

## 1. Kiến trúc trước khi sửa và audit

Branch đầu vào: `fix/race-polish`. `git status --short` ban đầu sạch. Module cũ là một screen khoảng 585 dòng: xe SVG chạy ngang bằng interval 30ms, tọa độ được đặt lại mỗi lượt, gọi generator shared có 10 chặng, dùng timer shared và sound manager chỉ tổng hợp tone trên web. Tất cả đáp án chạy cùng quỹ đạo rồi so kết quả; không có cảnh sát hoặc camera thế giới.

| Tính năng | Trước sửa | Kết quả triển khai |
|---|---|---|
| Registry, route, onExit, storage | Có | Tái sử dụng contract |
| Câu hỏi v = s/t | Có nhưng generator khác đặc tả | Thay bằng 5 đề handoff, dữ liệu độc lập |
| Sprite xe vàng, cảnh sát, rãnh | Thiếu, dùng xe SVG | Dùng PNG và crop theo manifest |
| Chase, nứt, sạt lở, bụi/đá | Thiếu | State và hiệu ứng theo clock engine |
| World/camera | Thiếu | Port world model và Hermite |
| Qua chặng | Reset, nút chặng tiếp theo | Tự nối tọa độ/vận tốc qua bốn ranh giới |
| Đúng, sai thấp, sai cao | Chỉ feedback sau cùng một animation | Ba kết quả và quỹ đạo/kết thúc riêng |
| Chặng cuối | Thiếu | Cảnh sát đáp rồi lật; xe vàng thoát rồi thắng |
| Pause | Interval xe vẫn độc lập với timer | Đóng băng toàn bộ simulation và âm thanh |
| Audio native | Thiếu | 9 WAV, loop, mute, pause, disposal |
| Mobile portrait, safe area | Track ngang nhỏ | Portrait riêng cho terrain-racing, HUD, panel responsive |

Generator shared cũ vẫn tồn tại để giữ API các module khác. Game Siêu Xe mới không sử dụng generator 10 chặng đó.

## 2. Tài nguyên và logic tái sử dụng từ ZIP

Đường dẫn chỉ định ban đầu chưa tồn tại. Đã tìm `C:\Users\khatr\Downloads\Sieu_Xe_Bo_Hoat_Anh_2D.zip` và giải nén vào `docs/references/supercar-handoff/Sieu_Xe_DEV_HANDOFF`. Đã đọc README, DEV_HANDOFF, DEV_BRIEF, ba JSON cấu hình, checklist và hai file verification. Toàn bộ SHA-256 trong inventory khớp.

Đã xem 10 mockup và trích khung hình mỗi 0,5 giây phủ cả ba video. Video đủ 5 chặng có 4335 frames, 60 FPS, 72,25 giây; hai video thua dài 13 giây. Đã chạy thực tế cả `index.html` lẫn HTML độc lập bằng Chrome: 5 chặng, hai nhánh thua và pause đều đạt. Runtime JS trong HTML nhúng khớp `game.js` sau khi loại phần ASSETS base64.

Tái sử dụng `herm`, `bell`, easing, stage bases, camera anchor 430, quỹ đạo hai xe, thời lượng trạng thái, kích thước sprite, alpha/pivot, đáp án xoay vị trí từ prototype. Browser DOM/Canvas và API nhảy mốc `renderAt` không được dùng trong gameplay React Native.

Giữ nguyên bốn ảnh gốc và chín WAV trong module. Crop lossless sáu frame theo source rectangles: player 627×627, police 724×724, pivot (0,5; 0,5). Không nạp atlas dự phòng vào renderer. Road tile 540×936 bake dải hòa trộn 24px của prototype; renderer chỉ dịch tile theo camera. Gap vẫn là PNG alpha độc lập. Bản crop không đổi phong cách, màu xe hoặc chi tiết.

## 3. Renderer/animation đã chọn

React Native View/Image và Reanimated 4.5 hiện có. Một `useFrameCallback` chạy simulation trên UI thread native, một derived world snapshot dùng chung cho tất cả animated styles; React chỉ cập nhật UI khi đổi phase/pause/session. Không thêm Skia, WebView hoặc player MP4.

Thêm `expo-audio ~57.0.5` bằng `expo install`, đúng bundled version của SDK 57, được hỗ trợ Android/iOS/web và Expo Go: https://docs.expo.dev/versions/v57.0.0/sdk/audio/. Plugin cấu hình playback, tắt quyền microphone, recording và background audio. Không thay renderer hoặc kiến trúc các game khác.

## 4. File thêm/sửa/xóa

- Sửa `src/games/terrain-racing/screens/TerrainRacingScreen.tsx`: thay screen cũ bằng composition HUD/scene/panels/hook.
- Thêm `animation/math.ts`; `engine/simulation.ts`, `engine/world.ts`; `data/questions.ts`; `types/index.ts`.
- Thêm `components/GameHUD.tsx`, `GamePanels.tsx`, `SpriteCar.tsx`, `WorldEffects.tsx`, `WorldScene.tsx`.
- Thêm `audio/GameAudio.ts`, `hooks/useSupercar.ts`, `tests/simulation.test.ts`, `tests/audio.test.ts`.
- Thêm `assets/index.ts`, bốn PNG gốc, sáu crop PNG, road-tile.png, ba JSON và chín WAV.
- Sửa `src/app/games/[gameId].tsx` chỉ để terrain-racing dùng portrait, ẩn status bar, tắt swipe pop và để module xử lý Android Back. Nhánh race-to-finish giữ nguyên hành vi landscape.
- Sửa `package.json`, `package-lock.json`, `app.json` để thêm expo-audio; `jest.config.js` để map WAV và adapter native I/O; thêm `__mocks__/supercarExpo.js`.
- Thêm sáu script `scripts/supercar-{assets.py,reference.mjs,serve.mjs,e2e.mjs,performance.mjs,videos.py}` và báo cáo này.
- Sửa `.gitignore` để bỏ qua bản bàn giao gốc lớn. Runtime assets vẫn là source của module; `artifacts/` giữ đầu ra kiểm thử trên máy.
- Không xóa file khỏi cây cuối cùng; screen cũ được viết lại cùng đường dẫn. Không thay đổi registry, shared implementation, game Đua về đích hoặc các module khác. Không sửa thư mục anti, không reset/commit/merge/push.

## 5. Game engine

`Simulation` chứa session, revision, stage, phase, elapsed, clock, speed, target, outcome, pause và số chặng hoàn thành. `advanceSimulation` là hàm thuần/worklet. Giới hạn delta 50ms; không cộng dồn thời gian app ở background. Phase question đứng chờ đầu vào vô hạn, không có deadline hoặc timer 30 giây.

Từ question, `chooseSpeed` chỉ nhận phase/session hợp lệ. Hook khóa ngay lần tap đầu ở JS, engine kiểm tra lại nguyên tử trên UI thread. Callback đổi phase có session/revision; callback cũ sau replay/exit bị loại. Chặng tăng chỉ sau khi hết transition. Result được lưu đúng một lần cho mỗi phiên qua profileManager shared.

## 6. Camera và chuyển chặng

Xe và gap ở world space. `screenY = 430 + C - objectWorldY`; renderer dùng cùng snapshot C cho nền, lane marks, gap, xe và hiệu ứng. Stage base tăng 1460,5 ở ranh giới đầu và 1554 ở các ranh giới sau, khớp tọa độ cuối transition. Hermite nối vận tốc đầu/cuối; không đặt lại xe hoặc camera. Gap cũ được giữ world position và ra khỏi viewport theo camera.

UI dành chỗ cho grid đáp án thật trên điện thoại thấp. Sprite giữ aspect ratio và pivot; các vật thể dùng cùng phép chiếu tại mỗi kích thước màn hình. Landscape của game Đua về đích không bị áp sang Siêu Xe.

## 7. Hai xe không chồng nhau

Khoảng truy đuổi gốc 170 world units. Cảnh sát chỉ tăng tốc khi xe vàng đã đáp và chạy tiếp; transition dùng quỹ đạo police riêng, không snap về vị trí bám xe. Tests so vùng vẽ cả ô sprite có padding, scale, jump và rotation; khoảng cách nhỏ nhất trên nhánh đúng được kiểm tra lớn hơn 28 design pixels. CDP cũng kiểm tra bounding boxes của hai sprite trong lượt chơi đầy đủ.

## 8. Ba nhánh kết quả

- Đúng: tăng tốc, nhảy theo bell curve, bóng ở ground plane, đáp an toàn, chạy tiếp; cảnh sát tăng tốc và vượt theo. Không panel thành công/nút next.
- Thấp: tầm nhảy ngắn đến tâm gap; body hạ xuống, thu nhỏ, xoay nhẹ rồi mất alpha, bụi/impact; settle xong mới hiện ĐÃ THUA.
- Cao: vượt sang bờ bên kia, mất kiểm soát và hòa trộn upright → side → overturned; body bounce, rotation, dust/skid/impact; settle xong mới hiện ĐÃ THUA. Hoàn thiện frame lật đến 2 thay vì chỉ side như prototype.

Màn thua có vận tốc đã chọn, lý do, đáp án đúng, công thức, phép thế số và CHƠI LẠI. Replay trở về chặng 1 trong một session mới.

## 9. Chặng 5

`policeJump → policeRoll → escape → victory`. Police P phải ở sau bờ xa (gap +89), jump trở về 0, tư thế police riêng đến frame 2. Hero tiếp tục forward; camera Hermite hãm về đứng yên cho xe vàng chạy khỏi mép trên. Engine chỉ nhận victory khi animation escape hoàn tất, police đã lật trên bờ xa và padded bounds toàn bộ hero nằm ngoài viewport. CDP đã xác minh cả DOM bounds hero ở trên màn hình trước bảng thắng.

## 10. Audio, UI và lifecycle

Chín WAV nối vào engine/siren loops, accelerate, landslide, jump, impact, answer selection, victory và loss. Mặc định mute; engine/siren ở volume 0,14/0,10, effects/UI cao hơn. Player thuộc riêng phiên game. Pause lưu các player đang chạy rồi resume tại vị trí cũ. Mute, replay và dispose hủy pending seek callbacks; exit release toàn bộ player một lần.

HUD SIÊU XE, Chặng n/5, sound và pause có touch target tối thiểu 48dp. Modal là View/Text/Pressable thật, có grid 4 đáp án, scroll fallback và safe area. Pause có TIẾP TỤC/THOÁT VỀ SẢNH; replay chỉ nằm ở kết quả. Android Back mở pause; mất navigation focus hoặc app vào background đóng băng simulation/audio. Foreground chờ người dùng bấm tiếp tục.

## 11. Kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | Đạt |
| Jest module Siêu Xe | 2 suites, 21 tests đạt |
| `npm test -- --runInBand --silent` | 17 suites, 231 tests đạt |
| Architecture/import/registry và tests Đua về đích | Đạt trong Jest toàn dự án |
| `npm run lint` | 0 errors; 62 warnings của source cũ ngoài Siêu Xe |
| ESLint module Siêu Xe | 0 errors, 0 warnings |
| `expo export --platform all` | Web JS, Android Hermes, iOS Hermes đạt |
| E2E web | Cả 5 chặng, thấp, cao, double tap, replay, pause jump/transition, exit/reenter đạt |
| Điện thoại web 320×568 | 4 nút ≥48px, không tràn màn, panel không che hai xe |
| Pause chase và background trong policeRoll | Đạt; world giữ nguyên, foreground chờ resume, sau đó thắng |
| Sound web | 9 players mặc định silent; pause/exit không để player phát tiếp |
| Profiling web không screencast | 701 samples; median 16,7ms, p95 16,8ms, mean 18,97ms; 12 samples >25ms |
| Thiết bị Android/iOS thật | Chưa kiểm tra; không có adb/SDK/device sẵn trong môi trường |

Profiling trên chỉ đo requestAnimationFrame của Chrome khi game chạy. Median gần 60Hz không phải cam kết 60 FPS native hoặc phép đo GPU/device. Video xuất 30 FPS từ screencast thật, giữ clock 1×; không suy ra hiệu năng native từ FPS của video.

## 12. Ảnh/video nghiệm thu

Trong `artifacts/supercar/acceptance/`:

- `five-stages-web-1x.mp4`: lượt đúng đủ 5 chặng.
- `low-speed-web-1x.mp4`, `high-speed-web-1x.mp4`: hai nhánh thua.
- `pause-resume-web-1x.mp4`: pause giữa jump/transition, exit/reenter.
- `pause-roll-web-1x.mp4`: pause chase và background trong cảnh lật, tiếp tục tới thắng.
- `five-stages-victory-5.png`, `high-speed-result-1.png`, `low-speed-result-1.png`, `small-phone-question-1.png`, `pause-resume-paused.png`, `background-police-roll.png` và contact sheets.
- `*-trace.json`, `e2e-*.json`, `videos.json`, `performance-web.json`: dữ liệu đo/quan sát.

Video ghi hình bản web, không có audio track. Kiểm tra player trạng thái/cleanup thực hiện riêng; video không chứng nhận âm thanh hoặc gameplay native. Bản gốc và contact sheets tham chiếu ở `artifacts/supercar/reference/`.

## 13. Chạy

```powershell
cd C:\Tro_choi_cho_em
npm.cmd start -- --go --lan
```

Mở Expo Go hỗ trợ SDK 57, cùng Wi-Fi với máy tính; mở URL Expo LAN hiện hành. IP có thể đổi theo mạng, hãy dùng URL trong log/QR mới. Bản chạy cuối được khởi động ở port 8090; QR nằm trong `artifacts/supercar/expo-go-qr.png`.

Web export nghiệm thu:

```powershell
node scripts/supercar-serve.mjs
# http://127.0.0.1:8093/games/terrain-racing
node scripts/supercar-e2e.mjs
node scripts/supercar-e2e.mjs pause-roll
python scripts/supercar-videos.py
```

Không cần development build riêng cho dependency đã chọn khi Expo Go khớp SDK. Nếu app chính dùng development build hiện có, cần build lại để chứa expo-audio mới. Chưa tạo/sign APK/IPA.

## 14. Chưa hoàn tất trên thiết bị

Cần người có điện thoại xác minh Expo Go SDK 57, Android Back, orientation lock, safe areas/notch, âm thanh nghe thật, background/foreground và đo FPS/memory native. iOS native chưa được chạy. Toàn bộ bằng chứng ảnh/video trong lượt này là Chrome web; không gọi mobile emulation là native testing.

Nguồn câu hỏi hiện là năm đề chuẩn handoff. Ranh giới dữ liệu đã tách riêng để thay bằng nguồn ứng dụng, nhưng không tự kết nối một nguồn đề chưa được cung cấp.
