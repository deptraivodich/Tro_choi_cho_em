# Nghiệm thu Đua về đích trên màn hình ngang

> Bản sửa tiếp 5 lỗi Expo Go: xem [race-five-mobile-fixes.md](race-five-mobile-fixes.md). Camera hiện cho kéo tay, board phủ safe area và overlay game nằm trong cây React; mô tả native Modal/follow vô điều kiện dưới đây là bản nghiệm thu trước.

Workspace: `C:\Tro_choi_cho_em`; branch: `fix/race-polish`. Không sửa workspace `_anti`, không reset/merge/commit/push. Những thay đổi Git có sẵn được giữ lại.

1. **Nguyên nhân lỗi Expo Go.** Game chưa đặt orientation theo route. Layout cũ xếp GameHeader, banner, board trong hai ScrollView và dashboard xúc xắc thành một cột; nó dành khoảng 160dp cho phần điều khiển ngay cả trên điện thoại thấp. Setup dùng native Modal với `maxHeight` nhưng thiếu chiều cao/flex xác định cho card chứa ScrollView, dẫn đến khoảng trống và footer bị cắt. Camera cũ cuộn tới ô logic đã cập nhật trước animation, không theo sprite đang di chuyển. Native modal câu hỏi/thưởng có callback Back rỗng, còn route cha xử lý Back bằng cách thoát ngay.

2. **Landscape.** Route `src/app/games/[gameId].tsx` đặt `Stack.Screen` với `orientation: 'landscape'` riêng cho `race-to-finish`; game khác dùng `default`. Giữ nguyên `app.json` và dependencies. Đây là phương án theo screen được [Expo SDK 57 khuyến nghị](https://docs.expo.dev/versions/v57.0.0/sdk/screen-orientation/), sử dụng native stack/screens hiện có, không xoay View giả và không khóa toàn ứng dụng. Ẩn status bar trong race, giữ header native ẩn, dùng SafeAreaView và kích thước đo từ vùng chơi thực tế. Màn hình setup hai cột có nội dung cuộn và footer cố định; cả hai nút cao ít nhất 48dp. Tải sẵn board, sáu mặt xúc xắc và các pose cần cho gameplay trước khi cho xuất phát.

3. **Toàn cảnh → zoom → follow.** Ván mới zoom out nhẹ trong 400ms, giữ toàn cảnh 1.800ms, rồi zoom vào nhân vật trong 900ms. Reduced motion giữ thời gian xem toàn cảnh và rút ngắn phần chuyển động. Engine tạm dừng trong phần giới thiệu nên bot và nút tung không chạy trước camera. Sau đó camera dùng một `useFrameCallback` của Reanimated trên UI thread, theo tọa độ sprite đang được vẽ; đổi lượt chuyển mượt tới người chơi tiếp theo, kể cả bot. Đi đường tắt và tiến/lùi do thưởng/phạt dùng cùng cơ chế. Không dùng timer rời rạc cho camera. Pause đóng băng tiến trình intro/follow; resume tiếp tục, không phát lại intro.

4. **GameCamera và tọa độ.** `cameraGeometry.ts` chứa fitToBoard, clampToBounds, cameraTranslation và easing. `GameCamera.tsx` quản lý intro/reset theo session và follow mỗi frame. `CameraTracking.tsx` chia sẻ vị trí hiển thị từ AnimatedToken. Graph giữ tọa độ gốc 1024×576; vùng board chơi giữ nguyên crop 80% chiều cao để bỏ dashboard đã vẽ trong ảnh. World bổ sung nền rừng hiện có ở phần cần thiết để thích nghi 16:9, 19.5:9, 20:9; một transform áp dụng đồng bộ cho ảnh board, các correction/mũi tên, icon và token. Camera luôn clamp ở các mép và không render scale nhỏ hơn mức fit khi viewport thay đổi. Engine, danh sách điểm, shortcut, tokenPlacement và pathHistory không bị camera sửa.

5. **Xúc xắc/HUD.** Xóa TurnDashboard và thay bằng RaceHUD: tên/ảnh người đang tới lượt, vật phẩm, trạng thái ngắn, nút tung nhỏ và Pause. Chỉ một DiceOverlay xuất hiện khi rolling; dùng đúng sáu sprite có sẵn, perspective/rotate/scale/bounce tạo chiều sâu. Hoạt họa đồng bộ với thời gian còn lại của scheduler 750ms, hiển thị kết quả trong phần cuối trước khi mở câu hỏi. Không đổi lần lấy số 1–6, cách chấm toán hoặc giới hạn 30 giây. Khi Pause, cả scheduler lẫn tiến trình dice dừng.

6. **Pause và Back.** Menu chỉ có TIẾP TỤC và THOÁT. Một native Modal host chứa các panel câu hỏi/thưởng/handover/victory và Pause; RaceModal render panel bên trong host nên không tạo một cửa sổ native thứ hai. Câu hỏi và input vẫn mounted khi Pause. BackHandler xử lý Back lúc đang chơi; `Modal.onRequestClose` xử lý Back khi câu hỏi/thưởng đang mở; cả hai mở Pause. usePreventRemove chặn việc rời route ngoài flow; nút THOÁT gỡ chặn trước khi gọi onExit. Timer toán, bot, feedback và áp dụng thưởng/phạt do một scheduler sở hữu. Token dùng progress Reanimated, cancelAnimation và phần thời gian còn lại khi resume; reel giữ vị trí/elapsed hiện có. AppState background và mất focus đưa ván vào Pause, foreground không tự tiếp tục. Callback có action/session guard và cleanup khi unmount. Thời gian chơi được lưu loại trừ Pause và intro.

7. **Thoát/khôi phục orientation.** THOÁT tạm dừng engine trước, rồi dùng callback onExit hiện có để back hoặc replace về sảnh. Controller disconnect hủy timer; token/camera/reel hủy animation/listener khi unmount. Landscape và status bar thuộc screen race nên stack trở về chính sách `default` của ứng dụng khi race bị pop. Không thêm route, đổi GameId, registry, index.ts hoặc contract `{onExit}`. Việc orientation thực tế trở về đúng trên Android chưa được nghiệm thu bằng thiết bị; cần kiểm tra theo checklist bên dưới.

8. **Các file thay đổi trong đợt mobile.**

   - Route: `src/app/games/[gameId].tsx`.
   - Screen: `src/games/race-to-finish/screens/RaceToFinishScreen.tsx`.
   - Thêm: `components/GameCamera.tsx`, `CameraTracking.tsx`, `DiceOverlay.tsx`, `RaceHUD.tsx`, `RaceModal.tsx`, `logic/cameraGeometry.ts` trong module race.
   - Sửa: `components/AnimatedToken.tsx`, `GameBoardView.tsx`, `SetupModal.tsx`, `MathQuestionModal.tsx`, `MysteryRollModal.tsx`, `TurnHandoverModal.tsx`, `VictoryModal.tsx`.
   - Xóa: `components/TurnDashboard.tsx`.
   - Thời gian/presentation read API: `state/RaceController.ts`, `state/turnTiming.ts`, `hooks/useRaceGame.ts`; thêm kiểm tra vào `tests/controller.test.ts`.
   - Kiểm thử: `tests/cameraGeometry.test.ts`, `scripts/race-mobile-e2e.mjs`, `scripts/race-e2e.mjs`, `scripts/lib/cdp.mjs`, `jest.config.js`, `__mocks__/racePresentation.js`.
   - Báo cáo này. `src/app/_layout.tsx` có trạng thái dirty từ trước nhưng không có thay đổi nội dung do đợt này.
   - Các thay đổi shortcut/ảnh board từ yêu cầu trước vẫn giữ nguyên, được liệt kê riêng ở [race-automatic-shortcuts.md](race-automatic-shortcuts.md). ForkChoiceModal không được khôi phục. Ảnh dùng vẫn là `map_landscape_clean.png`; ảnh gốc vẫn giữ. Nếu chọn bốn người, bốn token thật sẽ đứng ở xuất phát; chọn hai người chỉ có hai token thật, không có nhóm con vật được vẽ sẵn trong ảnh.

9. **Kiểm thử đã chạy.**

   - `npm run typecheck`: PASS.
   - `npm test -- --runInBand`: 11 suites, 125 tests PASS; bao gồm architecture, toán lớp 5, bot 4/5, timeout/acknowledge, thưởng/phạt/khiên, history và shortcut tự động. Jest dùng mock presentation cho SSR; không coi mock đó là bằng chứng animation native.
   - `npm run lint`: 0 error, 64 warning còn lại trong project.
   - `npm run export -- --platform all --max-workers 2 --output-dir artifacts/race-mobile/export`: Android/iOS Hermes và web bundle PASS; đây là kiểm tra build, không phải chạy APK trên thiết bị.
   - Web/CDP: ba viewport ngang 640×360, 780×360, 800×360 PASS; camera phủ viewport, nút trong màn hình, mọi correction board còn nguyên.
   - `node scripts/race-mobile-e2e.mjs`: 30 kiểm tra PASS, gồm footer, intro, pause dice/camera/countdown/token/shortcut/reel/result/reward, camera chuyển sang bot, resume chính xác và cleanup.
   - `node scripts/race-e2e.mjs --shortcut-only`: 216 kiểm tra PASS; đúng cửa vào tự đi, đi ngang không kích hoạt, thưởng/phạt tới cửa vào không kích hoạt, hai shortcut và lịch sử lùi được giữ.
   - `node scripts/race-e2e.mjs --acceptance-only`: 43 kiểm tra PASS, có chờ đồng hồ 30 giây thực tế, sai/hết giờ đứng yên và chờ Đã hiểu, thưởng/phạt tự áp dụng.
   - `node scripts/race-e2e.mjs`: 3.107 kiểm tra PASS trong một ván hoàn chỉnh; 14 câu người chơi, 9 reel, 3 mẫu chuyển động, 12 câu bot với hai chu kỳ đầy đủ đúng 4/5; thắng và quay về sảnh, không runtime exception.
   - Một lượt full-game trước đó bị gián đoạn bởi Fast Refresh khi source đang sửa; lượt chạy lại với source ổn định đã PASS. Các tinh chỉnh cuối tải sẵn thêm sprite/dice và dùng thời gian frame thực cho timeline intro/dice; kiểm thử readiness/pause được chạy lại sau các tinh chỉnh này.
   - Log/kết quả: `artifacts/race-mobile/{jest-final.txt,lint-final.txt,export-log.txt,presentation-result.json}` và `artifacts/race-{e2e,shortcut-ui,acceptance-ui,reference-ui}/result.json`.

10. **Native Android và tài liệu hình ảnh.** Không có điện thoại USB/emulator/Android SDK sử dụng được trong môi trường này; người dùng chọn tự kiểm tra bằng Expo Go. Chưa chạy kiểm thử native Android và chưa đo FPS, notch, gesture bar, bàn phím hay Back thật. Không đánh đồng CDP mobile với native. Không thêm dependency/native module nên không phát sinh yêu cầu development build từ thay đổi này. Nếu Expo Go trên thiết bị không xử lý đúng orientation, cần thu log và nghiệm thu bằng development build; hiện chưa có bằng chứng phải đổi công nghệ.

    Video tham chiếu đã được giải mã đủ 690 frame/23 giây; xem 87 khung lấy mẫu xuyên suốt và cả hai ảnh lỗi. Phân tích: 0–2,4s toàn cảnh/zoom tới start; 2,7–8s dice nổi và kết quả; 8,8–12s chuyển lượt/dice; 12,8–16s token đi và camera follow; 16,3–18,4s chuyển về người kế; 18,9–23s Pause tối nền. Chỉ lấy cách vận hành, không sao chép assets và không lấy nút restart trong video.

    Ảnh trước: `docs/references/race/mobile-landscape/loi_mobile_man_hinh_bat_dau.jpg`, `loi_mobile_gameplay_doc.jpg`. Ảnh sau (web): `artifacts/race-mobile/setup-800.png`, `overview-800.png`, `follow-800.png`, `dice-800.jpg`, `question-800.png`, `pause-800.png`, `shortcut-800.png`; ảnh 16:9/19.5:9/20:9 ở `artifacts/race-reference-ui/landscape-{640,780,800}.png`. Contact sheets video ở `artifacts/race-mobile/reference/contact-{1,2,3,4}.jpg`. Clip bố cục web: `artifacts/race-mobile/web-preview.mp4`, không dùng clip này để kết luận FPS native.

11. **Cách kiểm tra trên Android thật.**

    Metro đang chạy `npm run start` ở port 8090. Máy và điện thoại dùng cùng Wi-Fi; mở Expo Go, quét [QR đã chuẩn bị](../artifacts/race-mobile/expo-go-qr.svg) hoặc QR của terminal, hoặc mở `exp://192.168.2.2:8090`. QR đã kiểm tra decode đúng URL. Reload trước khi nghiệm thu. Khi server đã dừng, mở PowerShell:

    ```powershell
    cd C:\Tro_choi_cho_em
    npm run start
    ```

    - Từ sảnh vào race: máy xoay ngang; thử xoay cả hai phía ngang, bật/tắt khóa tự xoay của Android. Nút Về sảnh/Bắt đầu thấy đủ; sửa tên bằng bàn phím rồi vẫn thoát được. Chọn 2 và 4 người để kiểm tra token thật.
    - Bắt đầu: thấy toàn đường đua, giữ khoảng 1,8s rồi zoom mượt vào start; không màn hình đen, không méo ảnh. Camera theo người/bot, lối tắt, tiến thưởng và lùi phạt, không hở mép map. Kiểm tra notch/gesture bar và nút Pause.
    - Tung: chỉ một xúc xắc nổi, thấy rõ mặt chốt, mở toán sau đó. Sai/hết 30s phải đứng yên và chờ Đã hiểu. Đúng mới đi số bước. Chỉ dừng đúng cửa vào bằng xúc xắc mới tự đi shortcut; không có lựa chọn tuyến.
    - Pause ở intro, dice, toán, token, shortcut và reel: chờ ít nhất 10s, bấm TIẾP TỤC; thời gian/vị trí/lượt tiếp tục chính xác, không quay lại từ đầu. Menu chỉ có TIẾP TỤC/THOÁT.
    - Bấm Back vật lý/gesture cả khi đang toán và thưởng/phạt: mở Pause, không bỏ qua luật. Home rồi trở lại: vẫn Pause, không mất lượt. THOÁT quay về sảnh, hướng/status bar trở lại bình thường; vào game khác để xác nhận không bị khóa ngang.
    - Chơi trọn ván có bot, thử hai người đứng cùng ô, thưởng/phạt/khiên/sao và về đích. Nếu có lỗi native, ghi mẫu máy/Android/Expo Go, bước tái hiện và video màn hình; đây là phần nghiệm thu còn cần thiết.

    Không tạo APK hoặc chạy EAS build khi chưa có môi trường native cần thiết; stack vẫn React Native/Expo, không dùng Unity/C#.
