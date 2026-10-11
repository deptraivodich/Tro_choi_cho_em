# Sửa sau nghiệm thu — Đua về đích

## Audit và nguyên nhân

- Câu hỏi được tạo trong `src/games/race-to-finish/logic/questions.ts`, hiển thị nguyên chuỗi bằng `components/MathQuestionModal.tsx`.
- Đối chiếu source tại thời điểm nghiệm thu: biểu thức vẫn chứa `÷`; bài toán hộp vở dùng “Đã tặng”; hình học dùng “Hình chữ nhật … Tính diện tích.” Không tìm thấy “cặp nhật”, “tích cực” hay “(60 6)” trong generator. Biểu thức báo lỗi được kiểm thử độc lập và cho đúng chuỗi `(((65 − 6) × 10) + (60 ÷ 6))`.
- HTML mà Expo phục vụ có `<html lang="en">`, trong khi nội dung game là tiếng Việt. Những thay đổi chữ trong mô tả nghiệm thu phù hợp với việc dịch tự động sửa nội dung. Đây là suy luận từ source và HTML, chưa xác nhận trực tiếp cấu hình dịch của trình duyệt người dùng. Đã thêm bảo vệ `lang="vi"`, `translate="no"`, class `notranslate` và meta tương ứng trong thời gian game được mở, bao gồm cả các modal portal. Khi rời game, hook khôi phục các thuộc tính cũ. Không thay HTML hoặc cấu hình chung của game khác.
- Thuộc tính `translate="no"` yêu cầu hệ thống dịch giữ nguyên nội dung: [tài liệu HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/translate).
- Controller cũ tự gửi `ANSWER_FEEDBACK_DONE` sau 2.800ms khi trả lời sai, nên người chơi không kịp đọc.
- Modal thưởng/phạt cũ yêu cầu người chơi gọi `APPLY` qua nút dù kết quả đã được chốt trước khi quay; controller chỉ tự áp dụng cho bot.

## Câu hỏi và timer

- `formatCalculation` duyệt cây phép tính, giữ ngoặc, dấu `+`, `−`, `×`, `÷` và dạng phân số có `/`; từ chối toán tử rỗng/không hợp lệ. Không đổi cách tính đáp án chính xác.
- Bài toán cho đi đổi thành “Đã tặng đi … quyển vở. Còn lại bao nhiêu quyển vở?” và cách giải nêu rõ trừ số đã tặng đi. Bài toán tiền thừa dùng “Đưa … đồng cho người bán” để rõ đây là số tiền đưa, trước khi nhận lại tiền thừa. Các template hình chữ nhật, tam giác, hình thang được kiểm tra câu chữ và công thức; hình chữ nhật giữ câu đúng “Hình chữ nhật dài … cm, rộng … cm. Tính diện tích/chu vi.”
- Một deadline 30.000ms được controller lập khi `DICE_DONE` bắt đầu câu hỏi. Scheduler hiện có chịu trách nhiệm timeout; modal chỉ dùng interval 100ms để đọc thời gian còn lại và vẽ thanh đếm ngược/số giây.
- Pause giữ thời gian còn lại; resume chạy tiếp. Disconnect hủy scheduler và đóng băng đồng hồ. Trả lời, restart hoặc rời câu hỏi hủy timeout; interval UI được dọn khi trả lời, pause hoặc unmount. Câu mới reset 30 giây.
- Nếu callback timeout bị trì hoãn do JS bận/tab nền, controller vẫn kiểm tra deadline trước khi chấp nhận đáp án; đáp án gửi sau hạn được tính hết giờ.
- Sai bình thường: **“Không đúng, sau đây là đáp án và cách giải.”** Hết giờ: **“Đã hết thời gian, sau đây là đáp án và cách giải.”** Bên dưới có “Đã trả lời”, “Đáp án”, “Cách giải” và nút **Đã hiểu**.
- Với người chơi, sai/hết giờ không có timer tự đóng; chỉ sự kiện `ACKNOWLEDGE_ANSWER` từ nút Đã hiểu mới kết thúc lượt. Đúng vẫn phản hồi 1.100ms rồi đi như trước. Bot vẫn trả lời tự động, giữ túi 4 đúng/1 sai, và tự hoàn tất phản hồi để không chặn gameplay vì không có người bấm thay bot.
- Sau khi chấm, ẩn phần nhập đáp án đã khóa. Nút Đã hiểu nằm cố định ở đáy card, ngoài vùng cuộn, để luôn nhìn thấy ở điện thoại 320px; câu hỏi và phần giải thích vẫn cuộn được khi dài.

## Thưởng/phạt

- Bỏ **Nhận thưởng**, **Áp dụng hình phạt**, **Chấp nhận phạt**, **Tiêu thụ khiên & tiếp tục**.
- Sau animation dừng, hiện kết quả 1.400ms rồi controller tự áp dụng đúng một lần. Pause đóng băng cả thời gian xem kết quả; không tự áp dụng khi đang pause.
- Khi có Ngôi sao và không có Khiên, giữ quyền quyết định dùng sao: hiện duy nhất nút **Dùng ngôi sao hóa giải**, cho 5 giây để chọn. Nếu không chọn, tự áp dụng phạt và giữ sao; nếu chọn, tiêu thụ sao, hủy timer áp dụng phạt và kết thúc lượt. Bot giữ chiến lược dùng sao hiện có. Khiên vẫn tự chặn phạt và được tiêu thụ một lần.
- Tiêu đề hiển thị đúng **Ô Thưởng Bí Ẩn** và **Ô Phạt Bí Ẩn**, căn giữa, bỏ bóng chữ tiêu đề gây cảm giác chữ chồng nhau. Các màu, assets, animation vòng quay giữ nguyên.

## File sửa trong lần nghiệm thu này

Tất cả đường dẫn tính từ root `C:/Tro_choi_cho_em`:

- `src/games/race-to-finish/logic/questions.ts`
- `src/games/race-to-finish/state/raceReducer.ts`
- `src/games/race-to-finish/state/RaceController.ts`
- `src/games/race-to-finish/state/turnTiming.ts` (mới)
- `src/games/race-to-finish/hooks/useRaceGame.ts`
- `src/games/race-to-finish/hooks/useVietnameseGameText.ts` (mới)
- `src/games/race-to-finish/components/MathQuestionModal.tsx`
- `src/games/race-to-finish/components/MysteryRollModal.tsx`
- `src/games/race-to-finish/screens/RaceToFinishScreen.tsx`
- `src/games/race-to-finish/tests/controller.test.ts`
- `src/games/race-to-finish/tests/questions.test.ts`
- `src/games/race-to-finish/tests/raceFlow.test.ts`
- `src/games/race-to-finish/tests/animation.test.tsx`
- `scripts/race-e2e.mjs`
- `docs/race-acceptance-fixes.md` (mới)

Các thay đổi board/mũi tên/shortcut ở lần trước vẫn giữ nguyên. Không sửa assets hoặc worktree Antigravity. Không stage, commit hoặc push.

## Tự nghiệm thu

Mở `http://localhost:8090`, tải lại trang và vào Đua Về Đích:

1. Chọn Chơi cùng bạn, đổ xúc xắc. Kiểm tra thanh 30 giây giảm dần, biểu thức có đủ toán tử và phân số rõ dấu `/`.
2. Trả lời sai, chờ hơn 3 giây: modal vẫn mở; đọc đáp án/cách giải rồi bấm Đã hiểu để chuyển lượt.
3. Câu kế tiếp bắt đầu lại 30 giây. Không trả lời: sau 30 giây hiện đúng thông báo hết giờ; chờ thêm vẫn không đóng cho tới khi bấm Đã hiểu.
4. Dừng ô thưởng/phạt, chờ quay xong: kết quả hiện rõ rồi tự áp dụng. Không có nút nhận/áp dụng. Nếu có Ngôi sao, thử dùng trong 5 giây hoặc để thời gian qua để giữ sao và nhận phạt.
5. Chơi với bot; kiểm tra trả lời/di chuyển/thưởng/phạt tự chạy. Dừng đúng cửa vào shortcut vẫn được chọn, đi ngang không hỏi.

Chạy lại tự động: `npm run test:race`, `npm run test:ui`, `node scripts/race-e2e.mjs --acceptance-only`, `node scripts/race-e2e.mjs --shortcut-only`.

## Kiểm chứng

- Unit: 6 suites / 70 tests đạt, gồm kiểm tra độc lập 2.400 câu toán, timeout đúng 30 giây, pause/disconnect/resume, đáp án sát hạn/sau hạn, phản hồi sai vô thời hạn, reset câu, bot, tự áp dụng thưởng/phạt và lựa chọn sao.
- TypeScript đạt; lint 0 lỗi, 65 warning sẵn có ở các phần khác.
- Các script UI kiểm tra Chrome web và lưu ảnh/kết quả trong `artifacts/race-acceptance-ui/`, `artifacts/race-e2e/`, `artifacts/race-shortcut-ui/`; không thay game store để ép vị trí/phase.
- Gameplay đầy đủ: 192 kiểm tra UI đạt, gồm 11 câu người chơi, 3 vòng quay, 3 lần lấy mẫu chuyển động, 11 câu bot; các chu kỳ đủ 5 câu của bot vẫn có 4 câu đúng. Kiểm tra riêng shortcut: 60 checks đạt, gồm dừng chính xác bằng đổ 4 và đi ngang bằng đổ 6.
- Nghiệm thu UI cuối: 42 checks đạt. Đã chờ hết 30 giây thật, chờ thêm ở phản hồi sai/hết giờ, kiểm tra reset thời gian, nút Đã hiểu nhìn thấy ở 320px, nội dung DOM khớp generator, tiêu đề hai modal và tự áp dụng thưởng/phạt. Ảnh `wrong-answer.png`, `timeout.png`, `bonus-result.png`, `penalty-result.png` nằm trong `artifacts/race-acceptance-ui/`.
- Đây là kiểm tra runtime web trong Chrome; chưa kiểm tra trên thiết bị Android/iOS thật.
