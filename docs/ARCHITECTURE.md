# Kiến trúc đa game

Expo Router dùng duy nhất `src/app/`. Không để hooks, registry, assets hay screen implementation trong folder route. Lobby implementation ở `src/screens/`, registry ở `src/games/registry.ts`.

Mỗi game có module `src/games/<game-id>/` và public entry `index.ts`. Các game đang đăng ký: energy-defense, planet-rescue, terrain-racing, race-to-finish, block-island, vault-code, floating-market, rhythm-bakery, treasure-dive, royal-artillery. `space-pets` là source có sẵn chưa đăng ký; giữ lại cùng entry riêng, không tự thêm vào sảnh.

Game đặc thù không import game khác. GameArt của Energy Defense đã chuyển vào components của game đó vì chỉ được game đó sử dụng. GameIcons phục vụ các thẻ của sảnh vẫn là component dùng chung. Shared chứa UI chung, timer, math core, PRNG, audio, storage và kiểu session/profile, giữ contract của các hàm cũ.

## Thêm game

1. Tạo `src/games/<game-id>/screens`, components/logic/assets/tests theo nhu cầu thực tế, xuất screen từ index.ts. Không tạo folder rỗng chỉ để đủ cây thư mục.
2. Screen tiếp tục nhận `{ onExit: () => void }` để navigation chung không phải sửa.
3. Đăng ký metadata và screen trong registry, bổ sung GameId nếu là ID mới. Route `games/[gameId]` tự tải entry đã đăng ký; không tạo router thứ hai.
4. Game mới chỉ dùng shared khi thành phần thực sự dùng chung. Assets require phải là đường dẫn tĩnh trong module của game.

## Hai branch/worktree độc lập

Phân công một game cho mỗi branch/worktree. Agent làm race chỉ chỉnh `src/games/race-to-finish/**`; agent làm game khác chỉnh folder của game đó. Khi thêm game, phần tích hợp registry và GameId là thay đổi nhỏ cần review lúc merge. Mỗi worktree cài dependency riêng bằng npm ci; không dùng chung node_modules đang được thay đổi. Task hiện tại không tự tạo branch/worktree, commit, push hoặc reset Git.

## Đua về đích

- data/boardConfig.ts giữ nguyên 50 điểm và graph đường chính/đường tắt trước khi sửa.
- state/raceReducer.ts là transition thuần, nhận event có actionId. turnId và sessionId tách lượt/phiên; actionId tăng theo mọi transition được nhận. Event cũ hoặc sai phase bị bỏ qua.
- state/RaceController.ts giữ một timer tại mỗi thời điểm; lưu thời gian còn lại khi pause, hủy khi đổi action, restart hoặc disconnect. RNG được inject từ một PRNG; generator và từng bot bag thuộc phiên.
- hooks/useRaceGame.ts dùng useSyncExternalStore, nối storage/audio và public UI actions. Không mảng players từ callback cũ nào có thể ghi lại state.
- components/AnimatedToken.tsx giữ Animated.ValueXY theo player.id. UI chỉ nội suy đến tọa độ target; khi finished=true mới gửi MOTION_DONE cùng id đã bắt đầu.
- logic/tokenPlacement.ts dùng kích thước ô lân cận, sprite và hướng đường để bố trí 2–4 token quanh tâm. Không đổi tile hay history. Token rời ô làm các token còn lại nội suy lại vị trí.
- logic/questions.ts và exactAnswer.ts tạo phép tính lớp 5, lưu đáp án hữu tỉ, chấm dấu phẩy/dấu chấm và phân số tương đương. Templates được trộn không lặp trước khi hết bag, số liệu biến đổi; cả phiên tránh prompt trùng.
- logic/reelPlan.ts khóa pool/result/slot cuối. MysteryRollModal render dải thẻ thật với translateX; dùng Animated timing native driver và easing tăng/giảm tốc, không timer giả lập kết quả. Cleanup chặn callback bị hủy; OS reduced-motion rút ngắn còn 180 ms.
- Camera và viewport là phần hiển thị: cuộn ngang bám vị trí quân; màn hình hẹp có cuộn dọc, camera bám quân trong lúc đi. Không thay đổi graph/gameplay.

## Tài nguyên và root

Runtime assets đi theo module race; icon ứng dụng vẫn ở assets/. Các raw/source artwork vẫn giữ nguyên. Screenshot cũ ở docs/screenshots/legacy và debug dump ở docs/debug đều ignore. Screenshot nghiệm thu mới ở docs/screenshots. Các cache .chrome-*, .expo, dist và node_modules được giữ trên máy, không track. Template Expo root không dùng được giữ trong docs/archive/expo-template và không nằm trong TS include.

## Lint

Đã thêm ESLint theo Expo SDK 57. Rules compiler của race giữ mức error. Các diagnostics purity/immutability của những game cũ được giữ mức warning vì không rewrite gameplay ngoài phạm vi; hooks rules/exhaustive-deps vẫn kiểm tra. Lint có thể exit 0 với các warning cũ, không đồng nghĩa toàn bộ repository không còn warning.

Tài liệu API đã đối chiếu: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [ESLint trong Expo](https://docs.expo.dev/guides/using-eslint/), [Animated](https://reactnative.dev/docs/animated), [AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo).
