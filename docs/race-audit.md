# Audit trước khi sửa — 10/10/2026

Entry thực tế: package.json → expo-router/entry → src/app/_layout.tsx. App.tsx/index.ts root là template không dùng; đã chuyển vào docs/archive/expo-template để giữ lại.

Một Expo Router, registry 10 game. Các game dùng chung component, storage, audio, math core. Không game khác import logic riêng của race. Bản đồ có tile_0..tile_49; đường tắt tile_4→tile_11 và tile_16→tile_30. Giữ nguyên graph và các assets gốc.

Trước khi sửa: 10 file modified và 6 file untracked; đã sao lưu source cùng git diff vào C:/Users/khatr/AppData/Local/Temp/race-before-fix-g4thcuht. Không reset/commit/push. Baseline chạy thật: 4 suites / 47 tests PASS, TypeScript PASS. Chưa có lint script.

## Nguyên nhân thực tế

1. stepAlongPath tạo timer trong setPlayers updater. handleLandedTile giữ players cũ; advanceTurn(players, ...) ghi mảng cũ đè vị trí mới. Bonus/penalty cũng ghi toàn bộ mảng từ closure. Updater có side effect dễ chạy lại.
2. GameBoardView group token theo ô; offset cố định ±10 px với sprite 34–52 px nên che nhau. Không có nội suy di chuyển. Token cần key ổn định theo player, độc lập nhóm ô.
3. MysteryRollModal animate spinAnim nhưng không gắn giá trị vào transform của cardsRow. Bot dùng setTimeout thiếu cleanup và không có sự kiện hoàn tất quay trong state machine.
4. Pause boolean chỉ chặn nút roll/bot effect, timer di chuyển vẫn chạy. Guard dựa vào state render cũ có thể nhận nhiều action trong một frame.
5. Tung xúc xắc đi thẳng vào moving sau 700 ms, chưa có gate câu hỏi hay answer bag của bot.
6. Bonus advance luôn chọn main; finished xảy ra trước animation cuối. Các snapshot cũ còn ghi đè pose sau hiệu ứng.
7. Setup và victory vẫn mô tả bàn 21 ô, victory coi position ≥21 là đã về đích; graph thực tế có 50 điểm.

## Quy trình

A audit/baseline → B reducer/controller và token → C toán/bot → D reel native animation → E module từng game, shared và tài nguyên → F automated tests, lint, typecheck, bundle và UI.

Skill mobile-app-ui-design không có trong catalog/skills cài đặt của phiên này. Dùng phong cách và ảnh hiện có.

## Phân loại root

- Cấu hình, package/lock, AGENTS, README, LICENSE giữ tại root.
- Runtime assets race chuyển cùng module; app icon vẫn ở assets/.
- Screenshot cũ chuyển docs/screenshots/legacy/ và ignore vì phần lớn là ảnh debug/trùng lặp; ảnh nghiệm thu mới giữ trong docs/screenshots/.
- scratch_nodes.json và dom_dump.html chuyển docs/debug/ (ignore), không xóa.
- .chrome-cdp*, .chrome-tmp, .expo, dist, node_modules giữ trên máy và ignore.
- Tài liệu thiết kế/tích hợp/test cũ chuyển docs/. Các script kiểm tra cũ giữ nguyên để tham khảo.
