# Rà soát lint trước commit — 10/10/2026

Đã chạy lại lint và đọc code tại từng vị trí có warning Hooks/compiler. Chưa sửa gameplay của những game khác. Đây là phân tích từ code, không thay thế kiểm tra runtime đầy đủ của từng game.

## Tổng hợp

65 warnings: 50 `@typescript-eslint/no-unused-vars`, 4 `react-hooks/exhaustive-deps`, 1 `react-hooks/immutability`, 10 `react-hooks/purity`. Không có `rules-of-hooks` warning/error. Module race chỉ có 2 warning unused; không có warning Hooks/state/animation.

| Vị trí | Số warning | Đánh giá và hướng xử lý riêng |
| --- | ---: | --- |
| `src/games/energy-defense/screens/EnergyDefenseScreen.tsx:171,198,205` | 3 | Ưu tiên cao. Interval giữ `finishGame` từ render cũ, có thể lưu elapsed/score/correctCount cũ. `finishGame` được gọi trong state updater; updater có side effect và thiếu guard hoàn tất một lần. Khai báo hàm ở phía dưới không có nghĩa chắc chắn gây ReferenceError vì effect chạy sau render, nhưng compiler báo readiness và hai dependencies thiếu có liên hệ với stale closure thật. Nên sửa điều phối kết thúc, snapshot/ref hợp lệ, idempotence và test kết thúc game riêng; không chỉ thêm dependency để interval bị khởi động lại liên tục. |
| `src/games/floating-market/screens/FloatingMarketScreen.tsx:90` | 1 | Ưu tiên vừa. Danh sách đáp án `.sort(() => Math.random() - 0.5)` ngay trong render: state/timer rerender sẽ đổi thứ tự đáp án; sort comparator ngẫu nhiên cũng không trộn đều. Nên sinh/trộn theo câu hỏi với RNG riêng, giữ đến khi đổi câu. Chưa thay đổi game này. |
| `src/games/block-island/screens/BlockIslandScreen.tsx:85` | 1 | Effect tải storage dùng `blocks` làm fallback ban đầu với deps `[]`. Tải một lần có thể là chủ ý; thêm `blocks` trực tiếp dễ tạo vòng tải lại. Cần giữ fallback ổn định và chặn callback sau unmount/ghi đè thao tác khi tải chưa xong. Chưa kết luận warning tự nó là bug runtime. |
| `src/games/space-pets/screens/SpacePetsScreen.tsx:114` | 1 | Tương tự effect tải pet một lần. Callback async chưa có guard unmount/phiên tải, có khả năng ghi đè tương tác mới. Game này chưa đăng ký vào registry. |
| Floating Market `172,176`; Planet Rescue `180,184`; Rhythm Bakery `153,157`; Royal Artillery `197,201` | 8 | `Date.now()` nằm trong các hàm kết thúc, gọi từ event/timer, không phải biểu thức chạy ngay mỗi render. Chưa có bằng chứng 8 warning này tự gây gameplay lỗi. Cần review compiler compatibility và closure/idempotence khi xử lý từng game; không tự di chuyển timestamp sang render hoặc xóa rules để che warning. |
| `src/games/treasure-dive/screens/TreasureDiveScreen.tsx:87` | 1 | `Math.random()` nằm trong handler tìm kho báu, không gọi trực tiếp ở render. Không chứng minh rerender làm đổi kết quả đã nhận; RNG chưa inject nên khó test/mô phỏng. Có thể chuẩn hóa RNG khi phát triển game đó. |
| Unused imports/variables ở các module, shared, lobby và tests | 50 | Phần lớn là code thừa, không chứng minh lỗi gameplay. Một số `isPaused` không được đọc cần review theo cơ chế pause của từng game; không thể kết luận game không pause chỉ dựa trên warning vì vẫn dùng pause/resume và modal. Không tự xóa các state/feature ngoài phạm vi. |

Hai warning race: `SetupModal.tsx:169` biến `meta`; `tests/race_to_finish.test.ts:17` helper `createMockPlayer`. Giữ nguyên trong lần preflight để không thay đổi code gameplay/test đang được duyệt chỉ nhằm giảm số warning.

## Lint scripts Node

Lệnh `npm run lint` của Expo quét source/config mặc định; chạy ESLint `.` còn quét scripts và phát hiện 19 lỗi `no-undef` cho `Buffer`. Các script thực sự chạy trong Node. Đã bổ sung khai báo `Buffer: readonly` chỉ cho `scripts/**/*.{js,mjs,cjs}` trong `eslint.config.js`, không sửa script cũ, không tắt `no-undef`, không giảm mức rule của race. Lint toàn repository sau chỉnh cấu hình: 0 errors, 65 warnings.

Các compiler diagnostics của game legacy vẫn có mức warning theo cấu hình đã có, race và game mới giữ checks mặc định. Cần xử lý Energy Defense riêng trước khi coi tất cả game đã đạt cùng mức độ ổn định với race.

Log/JSON máy đọc ở `artifacts/git-review/` được ignore, không đưa vào commit.
