# Lãnh Chúa Đảo Khối — Round 2.3

Workspace: `C:\Tro_choi_cho_em` · branch `fix/race-polish` · module `src/games/block-island`.

Không commit/push/reset/restore/clean. Không sửa workspace `_anti`. Các thay đổi chưa commit của người dùng được giữ nguyên. Báo cáo này phân biệt kiểm thử web, Android export và thiết bị thật.

1. **Vì sao bản trước chưa trở lại UI Round 2**

   Source kiểm tra đầu lượt vẫn là mô hình Round 2.1: `REGIONS` định nghĩa sáu vùng 6×6, component `Regions` vẽ nhãn/ranh giới, nhiệm vụ có `region` và `stock`, phép đo lọc theo `missionId`. Vì vậy sửa màu hoặc thu nhỏ HUD không thể biến nó thành xây dựng liên hoàn.

   Có ảnh, video và web export trong `artifacts/block-island-lord-round2/`; đã xem trực tiếp `01-mobile-island.png` để đối chiếu. Git history không có snapshot riêng của UI voxel Round 2, và không tìm thấy source/artifacts Round 2.2 trong workspace. Đây là **tái dựng có đối chiếu bố cục Round 2**, không khẳng định khôi phục nguyên file/pixel từ một commit không có sẵn. Giữ bố cục trên–đảo–công cụ, palette màu và tương tác voxel; mở rộng world và thay cơ chế tiến trình theo yêu cầu Round 2.3.

2. **Component và layout đã sửa**

   `ConstructionScreen.tsx` là implementation mới, entry `BlockIslandScreen.tsx` giữ nguyên export/contract. HUD gọn gồm quay lại, chế độ, 1/6–6/6, tên nhiệm vụ, chỉ số cần chấm và pause. Chọn tầng nằm cùng HUD khi cần. `MaterialPalette` có bốn tab và danh sách cuộn ngang. Dưới cùng có Xây, Gỡ, Kéo, Hoàn tác, Làm lại, **Gợi ý xây**, Cách chơi và Kiểm tra.

   Camera và dòng chú thích là lớp nổi nhỏ trong khung đảo; các nút công cụ vẫn nằm ngoài vùng vẽ. Web E2E kiểm tra tâm các ô đang thao tác không bị camera che. Vùng vẽ ở 320×640 là **235 px**, so với 155 px trong bằng chứng Round 2.1, tăng khoảng 52%; ở 390×844 là **439 px**, so với 362 px trước đó. Có kiểm tra riêng chữ 120%: vùng vẽ 223.2 px, không cắt chữ/scroll dọc. Safe area web được mô phỏng 24 px trên, 48 px dưới; chưa thay thế nghiệm thu safe area thật.

3. **Loại bỏ phân khu nhiệm vụ**

   Không còn `REGIONS`, `region`, `stock`, component vẽ sáu lô, nhãn “Khu 1/2”, “Chưa mở”, hoặc camera chuyển lô khi đổi bài. Một vị trí vật lý được nhận diện bằng tầng + x/y + lớp vật thể; `missionId` chỉ ghi nguồn gốc để xác định phần mới/khóa. Phép đo lấy hợp của **toàn bộ ô sàn trong công trình**, gồm các ô đã niêm phong.

4. **Kích thước đảo trước/sau**

   | Thuộc tính | Trước | Round 2.3 |
   |---|---|---|
   | Vùng đặt nền | 6 vùng riêng, mỗi vùng 6×6 | Một grid liên tục 20×20 |
   | Số vị trí mặt đất | 216 vị trí chia lô; mỗi bài chỉ mở 36 | 400 vị trí dùng chung ngay trong ván |
   | Tầng | Tối đa 3, riêng từng công trình | Tối đa 3, xây tiếp trên nền đã khóa |
   | Canvas renderer | 960×740 | 1440×980; camera xem từng phần hoặc toàn đảo |

   Mỗi ô vẫn là 1 m × 1 m. Không phóng to background để giả tăng world. E2E đã đặt thật ở tọa độ (19,19), từ chối ô ngoài grid và đặt 128 ô để kiểm tra kho không có giới hạn số lượng. Đất/cây/đá môi trường không tự thành ô sàn của bài toán.

5. **24 vật liệu thực sự đặt được**

   | Nhóm | Vật liệu |
   |---|---|
   | Đất | Đất cỏ, Đất, Đá, Gạch lát, Sàn gỗ, Cát |
   | Xây dựng | Gạch xây, Tường gạch, Tường gỗ, Cột đá, Cột gỗ, Bậc thang, Mái |
   | Thiên nhiên | Cây xanh, Thông nhỏ, Cây hoa, Bụi cây, Hoa, Đá rêu |
   | Công trình | Hàng rào, Cầu gỗ, Lối đi, Ô hồ, Đèn vườn |

   Mỗi item chọn đúng `material` và có nhánh renderer/placement riêng. Đá có mặt vỡ và vết nứt; gỗ có ván/thớ; gạch có mạch; cây có thân và các dạng tán khác nhau; cầu có mặt đi, lan can và khung đỡ; hàng rào có cọc/thanh, nối tại đầu đoạn. Không chỉ đổi tên/icon hoặc dùng chung một khối Đất cỏ.

   Artwork là SVG gốc tự dựng theo cùng anchor isometric và ánh sáng, không cắt ảnh tham chiếu thành atlas. Đã đọc README/MANIFEST và xem cả tám ảnh; đối chiếu SHA-256 trong [reference-check.json](reference-check.json). Giữ nguyên tên ảnh:

   | File tham chiếu | Cách dùng |
   |---|---|
   | `image(20261022-125053).png` | Ảnh lỗi UI phân khu; không coi là bố cục đích |
   | `image(20261022-125518).png` | Ảnh lỗi kho một loại/số lượng hữu hạn |
   | `image(20261022-125622).png` | Silhouette đá, cột, bậc, vật liệu |
   | `image(20261022-125706).png` | Khối nền, thể tích, vết nứt |
   | `image(20261022-125901).png` | Các biến thể cây/bụi |
   | `image(20261022-130045).png` | Địa hình, vách đá, rừng và nước |
   | `image(20261022-130120).png` | Cầu và chi tiết cảnh quan |
   | `image(20261022-130140).png` | Cây hoa, tầng địa hình và mặt nước |

6. **Phân loại toán học và kết cấu**

   - **9 vật liệu sàn:** sáu vật liệu nhóm Đất, Gạch xây, Lối đi và Cầu gỗ. Mỗi vị trí sàn khác nhau trên một tầng tính 1 m². Đổi vật liệu sàn chưa khóa không tạo thêm ô.
   - **Tường/cột/bậc/mái, cây/hoa/đá rêu/đèn, hàng rào:** đặt trên sàn có sẵn, không cộng S hoặc P. Hàng rào phải nằm trên ô mép sàn khi đặt; hướng được lưu và không bị đổi khi niêm phong. Nếu mở rộng vườn ra ngoài hàng rào cũ, đoạn rào cũ ở lại; game không dùng chiều dài hàng rào thay cho chu vi sàn.
   - **Nước:** chỉ ở tầng đất, không tính S/P. Có thể đặt Cầu gỗ qua ô nước; sàn cầu đi được tính 1 m². Không đổi sàn khóa thành hồ. Hồ có thể nằm ngoài vùng sàn đo hoặc thông ra ngoài; bài hiện tại không chấp nhận một lỗ kín trong mặt sàn.
   - **Tầng trên:** có ô sàn đỡ trực tiếp ở cùng x/y phía dưới, kể cả sàn khóa. Khe tầng 32 đơn vị vẽ, phiến sàn dày 8 đơn vị vẽ; các cột đỡ dẫn xuất trong renderer không phải ô diện tích mới. Cây cao/mái/đèn cần khoảng trống; không đặt xuyên tầng trên. Bộ giải xét những vật thể này trước khi khóa.

   `S đất` chỉ đếm tầng 1. `Tổng S sàn` cộng số ô sàn hợp lệ của từng tầng. `P` chỉ lấy cạnh ngoài tầng 1: `4N − 2E`; cạnh chung giữa khối cũ và mới cũng bị trừ. Mỗi tầng cần liên thông theo cạnh, không có lỗ kín; Thử thách cần ít nhất 4 ô trên mỗi tầng, được giải thích trong trợ giúp và phản hồi cấu trúc.

7. **Kho không giới hạn**

   Đã bỏ số lượng tồn kho và điều kiện hết khối. Palette hiển thị ∞. Mỗi vật liệu bị giới hạn bởi không gian, tầng và quy tắc đặt, không bởi mua/thu thập/tồn kho. Có thể xây quá mục tiêu rồi gỡ để sửa; dùng hết một số lượt bấm không làm hoàn thành bài. Undo giữ tối đa 256 snapshot thao tác gần nhất trong nhiệm vụ để tránh tăng bộ nhớ vô hạn; đây không phải giới hạn vật liệu.

8. **Gợi ý xây hoạt động thế nào**

   Nút trên toolbar gọi bộ lập kế hoạch từ world hiện tại. Ô cần thêm được vẽ thành khối trong suốt ngay trên đảo; ô/vật thể chưa khóa cần gỡ có dấu đỏ. Những khối thật giữ nguyên hình và vật liệu. Có thể đổi góc camera/chọn tầng khi xem. Nhấn lại để ẩn; thao tác này không thêm khối, không chấm điểm và không chuyển nhiệm vụ.

   HUD phản hồi cho biết S/P dự kiến của blueprint. `Blueprint.materials` giữ vật liệu sàn cũ và chọn sàn hợp lệ cho ô mới; ô hồ được gợi ý dùng Cầu gỗ. Phần cần gỡ chỉ có thể là vật thể chưa niêm phong. Blueprint được hủy nếu người chơi đặt sàn ngoài phương án; mở lại sẽ tìm phương án theo bố cục mới.

9. **Chuỗi blueprint và kiểm tra tính đúng**

   Có 18 mốc chuẩn, lồng nhau theo từng chế độ. Generator kiểm tra mục tiêu, bounds, hỗ trợ tầng và quan hệ tập con khi khởi tạo. Không sinh cặp S/P ngẫu nhiên.

   | Bài | Khởi động | Rèn luyện (S/P) | Thử thách (tầng; tổng S; P tầng 1) |
   |---|---|---|---|
   | 1 | S = 16 | 4 / 8 | 2; 8; 8 |
   | 2 | P = 20 | 6 / 10 | 2; 10; 10 |
   | 3 | S = 20 | 8 / 12 | 2; 14; 12 |
   | 4 | P = 24 | 9 / 12 | 3; 19; 12 |
   | 5 | S = 28 | 10 / 14 | 3; 27; 14 |
   | 6 | P = 28 | 12 / 14 | 3; 37; 16 |

   Đơn vị S là m², P là m. Khởi động được cấu hình lại theo ví dụ bắt buộc 16 → P20 → S20; các mục tiêu nhỏ của bản chia lô không thể dùng nguyên vì không được giảm đất đã khóa. Rèn luyện/Thử thách giữ các cặp số trước, nhưng blueprint 8 m² ở Rèn luyện dùng 3×3 thiếu góc để tiếp tục thành 9 m²; không dùng hình 4×2 rồi xóa khối khóa.

   Thử thách có các nghiệm chuẩn 4+4, 6+4, 8+6, 9+6+4, 12+9+6, 16+12+9. Phân bổ từng tầng là nghiệm tham khảo, không phải đáp án duy nhất.

10. **Khi người chơi xây khác mẫu**

    Bộ giải thử biến đổi/đặt lại chuỗi mẫu theo các khối thực tế, rồi tìm có ràng buộc bằng các mẫu mặt bằng và tìm kiếm hữu hạn. Giới hạn 240 nút tìm kiếm và 24.000 lần thử đặt mẫu, có các cận diện tích, bounding box, chu vi và chỗ trống tầng để loại nhánh không khả thi. Mọi phương án trả về được kiểm tra S/P, hỗ trợ và bảo toàn khối bắt buộc.

    Ưu tiên giữ cả khối khóa lẫn phần đang xây. Nếu không tìm được, thử giữ khối khóa và đánh dấu phần mới cần sửa. Không tìm được thì không vẽ đáp án giả; thông báo giới hạn tìm kiếm và cách sửa phần chưa khóa/làm lại nhiệm vụ. Đây không phải bộ giải đầy đủ cho mọi polyomino.

    E2E đã xây vườn 4×4 dịch khỏi vị trí mẫu rồi nhận phần mở rộng từ đúng vườn đó. E2E và unit test chấp nhận công trình Thử thách **9+5** thay cho mẫu 8+6, rồi xây tiếp. Test còn kiểm tra hình 4×2 ở bài Rèn luyện 3: S8/P12 đúng, nhưng không thể giữ nguyên để thành S9/P12. Game chưa niêm phong, không báo sai số đo; Gợi ý chỉ đánh dấu khối mới có thể sửa. Trường hợp mái chưa khóa chắn đường lên tầng 3 cũng được kiểm tra và gợi ý gỡ trước khi khóa.

11. **Duy trì khối niêm phong**

    `CHECK` chỉ niêm phong sau xác nhận, số đo/cấu trúc đúng và có chuỗi xây tiếp được xác minh. Toàn bộ vật liệu mới được khóa; khối cũ được giữ nguyên. Xóa, thay vật liệu, Undo và Làm lại đều bị chặn ở reducer nếu chạm khối khóa. History chỉ chứa phần mới; được xóa khi hoàn thành bài. Session/revision loại callback cũ, double-tap và thao tác từ trước lúc đổi công cụ/tầng/mission.

    Hiệu ứng rơi khối/niêm phong là mỹ thuật; không tự cộng diện tích hoặc thưởng. Chỉ hành động đặt mới tạo animation đặt, không phát lại trên khối khác khi xóa/undo. Chạm tán cây bằng công cụ gỡ chọn đúng vật thể đó. Đổi camera hủy thao tác đặt đang giữ để không dùng lại điểm chạm trước khi camera dịch chuyển.

12. **Xây tiếp từ công trình trước**

    Sau hoàn thành, nút Xây tiếp chuyển từ `celebrating` về `editing`, giữ cùng `blocks`, cùng world và camera. Không đặt lại số đo về 0. Nhiệm vụ 1 Khởi động có 16 ô; nhiệm vụ 2 bắt đầu với S16/P16 của chính vườn đó và nhận thêm phần nối để đạt P20. Sau sáu bài, Thử thách có 37 ô sàn tích lũy, không phải 115 ô của sáu công trình tách rời.

    Ba chế độ có bản lưu độc lập. Ván mới cần xác nhận. V4 dùng khóa lưu riêng `block-island-round23`: không xóa hoặc âm thầm diễn giải lại dữ liệu v3 chia lô thành mục tiêu cộng dồn. Bản lưu cũ vẫn giữ nguyên; hành trình mới bắt đầu sau xác nhận. Reload v4 giữ vật liệu, tầng, khối và niêm phong; history/hint/animation không được phục hồi. Kết quả toàn ván chỉ ghi sau bài 6.

13. **Camera và touch**

    Xoay trái/phải theo bước 90°, pan bằng công cụ Kéo hoặc hai ngón, zoom, căn công trình, xem toàn đảo và chọn tầng. Xoay căn quanh công trình/blueprint đang xem để giữ trong khung. Không tự chuyển góc hoặc chạy sang lô khác khi đổi bài. Tầng cao hơn mờ khi chỉnh phía dưới.

    Grid → world → phép xoay → isometric → camera → viewport được dùng cùng inverse cho touch. Tọa độ chạm dùng giá trị camera đang render của Reanimated. Có kiểm tra các tầng, bốn góc, pan/zoom, góc biên world và tán cây. Depth sort dùng tọa độ đã xoay, tầng và lớp nước/sàn/đồ vật. Không dùng sprite atlas nên không có crop rect từ ảnh tham chiếu; vẫn kiểm tra anchor/occlusion trực tiếp bằng ảnh ở các góc.

    Viewport web đã chạy: 320×640, 360×640, 390×844, 412×915, 768×1024, 1366×768. Không scroll dọc để xây; các ô thao tác không nằm dưới nút camera. Mouse desktop, Enter chọn tầng và mô phỏng reduced motion/chữ 120% đã chạy. Chưa kiểm tra ngón tay thật, pinch/pan, Android Back hoặc camera trên thiết bị Expo Go thật.

14. **Các file sửa/thêm và ranh giới module**

    - `logic/model.ts`, `construction.ts`, `missions.ts`, `materials.ts`, `planner.ts`, `state.ts`: thêm; model v4, toán hợp sàn, 18 mốc tích lũy, 24 vật liệu, bộ giải và reducer. `logic/island.ts` thành facade trong module; `projection.ts` được thay cho world chung và bốn góc.
    - `hooks/useIsland.ts`: save v4 riêng, chọn vật liệu/hint, input/lifecycle và ghi kết quả. `useIslandCamera.ts`: camera do người chơi điều khiển, chọn tầng và animation.
    - `components/MaterialArt.tsx`, `IslandLandscape.tsx`, `MaterialPalette.tsx`, `VoxelWorld.tsx`: thêm. `IslandWorld.tsx`, `VoxelArt.tsx` thành facade; `IslandIntro.tsx` đổi mô tả/demo.
    - `screens/ConstructionScreen.tsx`: thêm. `screens/BlockIslandScreen.tsx`: giữ entry bằng re-export.
    - `tests/island.test.ts`, `lifecycle.test.tsx`, `rendering.test.tsx`: cập nhật; thêm `planner.test.ts`. Các helper/browser/E2E/accessibility/performance/video/static server trong `tests/` được cập nhật cho Round 2.3.
    - Bằng chứng trong `artifacts/block-island-lord-round23/`. Không thêm `PROMPT_CODEX.md`, dependency, engine, route hoặc shared API.

    Bảo vệ 363 file từ đầu lượt, gồm bốn game đã nghiệm thu, shared/registry/router/package/AGENTS; [scope-check.json](scope-check.json) xác nhận không đổi hash. `index.ts` và contract `{ onExit: () => void }` giữ nguyên.

    Skill đã áp dụng: [expo-2d-game-engine](../../.agents/skills/expo-2d-game-engine/SKILL.md), [game-motion-camera](../../.agents/skills/game-motion-camera/SKILL.md), [gameplay-native-qa](../../.agents/skills/gameplay-native-qa/SKILL.md); skill Reanimated đã đọc ở `C:/Users/khatr/.agents/skills/creating-reanimated-animations/SKILL.md`. Đã đối chiếu bản cài Expo 57.0.26, RN 0.86.3, Reanimated 4.5.5, SVG 15.15.5 với [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) và API [useSharedValue](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/), [withTiming](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/).

15. **Kết quả kiểm thử**

    | Kiểm tra | Kết quả |
    |---|---|
    | `npm run typecheck` | PASS |
    | `npm test -- --runInBand --silent` | 41 suite / 483 test PASS |
    | Module + architecture (`--runInBand src/games/block-island/tests src/shared/tests/architecture.test.ts --silent`) | 5 suite / 63 test PASS; chạy lại sau sửa UI/camera |
    | `npm run lint` | PASS, 0 lỗi; 31 warning ngoài module |
    | ESLint module `--max-warnings 0` | PASS, 0 lỗi / 0 warning |
    | `ISLAND_PRODUCTION=1 node src/games/block-island/tests/e2e.mjs` | 18 nhiệm vụ, 24 vật liệu, niêm phong, hint thực tế, bốn góc và sáu viewport PASS |
    | Metro development sau khởi động lại `npm run start` | PASS: v4, đặt gạch thật, hiện blueprint 16 m², không tự xây, không runtime exception; [live-smoke.json](live-smoke.json) |
    | `node src/games/block-island/tests/accessibility.mjs` | Mouse, keyboard tầng, reduced motion, chữ 120% PASS |
    | `node src/games/block-island/tests/video.mjs` | Screencast gameplay thật, 301 frame, nguồn 38.39 s, encode 39.11 s, tốc độ 1×, không âm thanh |
    | Web export / Android export | PASS; bundle web ~3 MB, Hermes Android ~4.8 MB |
    | `git diff --check`, bảo vệ phạm vi, SHA-256 tham chiếu | PASS |
    | Native emulator / Expo Go thật / thiết bị Android-iOS | CHƯA CHẠY BỞI AGENT |

    Hiệu năng production Chrome headless 320×640: mẫu sửa nhiệm vụ 6 với 27 ô khóa + 10 ô mới có RAF median 16.7 ms, p95 16.9 ms; 64 ô p95 16.9 ms; 128 ô nhiều vật liệu p95 33.4 ms. Mẫu toàn đảo sau sáu bài, xoay/zoom có p95 50.2 ms và một long task 51 ms. Đây là số đo web trên máy Windows hiện tại, có chi phí điều khiển/quan sát CDP; không phải bảo đảm FPS Android hoặc input latency. Chi tiết trong [web-production-performance.json](web-production-performance.json). Không dùng thời gian cả vòng CDP làm độ trễ render.

16. **Ảnh/video nghiệm thu**

    | Nội dung | File |
    |---|---|
    | UI mobile, bố cục tái dựng | [01-ui-mobile.png](01-ui-mobile.png) |
    | Toàn đảo lớn, không phân khu | [02-island-overview.png](02-island-overview.png) |
    | Bốn nhóm kho | [Đất](03-materials-earth.png), [Xây dựng](03-materials-building.png), [Thiên nhiên](03-materials-nature.png), [Công trình](03-materials-outdoor.png) |
    | Đặt gạch / đá | [04-brick-placed.png](04-brick-placed.png), [05-stone-placed.png](05-stone-placed.png) |
    | Cây/bụi và hàng rào/cầu | [06-trees-bushes.png](06-trees-bushes.png), [07-fence-bridge.png](07-fence-bridge.png) |
    | Nút hint và blueprint | [08-hint-button.png](08-hint-button.png), [09-blueprint.png](09-blueprint.png) |
    | Bài 2 mở rộng từ khối bài 1 | [10-mission2-extension.png](10-mission2-extension.png) |
    | Blueprint nhiều tầng | [11-multi-floor-blueprint.png](11-multi-floor-blueprint.png) |
    | Cùng công trình ở bốn góc | [0°](12-camera-0.png), [90°](12-camera-90.png), [180°](12-camera-180.png), [270°](12-camera-270.png) |
    | Desktop | [13-desktop-regression.png](13-desktop-regression.png) |
    | Hoàn thành 6 bài Khởi động | [14-easy-six-complete.png](14-easy-six-complete.png) |
    | Hai tầng / đất và tổng sàn / ba tầng | [15-two-floors.png](15-two-floors.png), [16-floor-area-details.png](16-floor-area-details.png), [17-three-floors.png](17-three-floors.png) |
    | Toàn cảnh cuối, mobile nhỏ và chữ 120% | [18-final-island.png](18-final-island.png), [19-small-phone.png](19-small-phone.png), [20-text120-small.png](20-text120-small.png) |
    | Video thật, không slideshow | [island-gameplay-1x.webm](island-gameplay-1x.webm), [metadata](video-metadata.json), [motion](web-motion.json) |
    | Kết quả máy đọc | [E2E](web-e2e.json), [accessibility](web-accessibility.json), [scope](scope-check.json), [verification](verification-latest.json) |

    Các ảnh/video lấy từ tương tác thật qua nút/touch; state React chỉ được đọc để quan sát, không bị sửa để tạo ảnh. Browser dùng profile `block-r23-*` riêng, đóng rồi kiểm tra đường dẫn trước khi xóa; không xóa profile cá nhân.

17. **Giới hạn và nghiệm thu Expo Go**

    - Chưa thao tác trên thiết bị thật: chưa nghiệm thu native FPS, ngón tay, âm thanh nghe được, hệ thống Back/background hoặc navigation bar/safe area thật. Export Android chỉ xác minh đóng gói.
    - Đây là isometric 2D bằng SVG, xoay theo bốn góc, tối đa ba tầng; không phải engine 3D/crafting/sinh tồn. Đảo hữu hạn; kho vô hạn. Renderer ưu tiên hình học cùng phối cảnh và đối tượng tương tác, không dùng ảnh 3–8 làm background.
    - Bộ giải hữu hạn không chứng minh được mọi bố cục có thể mở rộng. Khi chưa xác minh được cả chặng sau, game giữ phần mới chưa khóa và cho sửa bằng hint/reset; không báo sai số đo chỉ vì khác mẫu. Một hình đúng bài hiện tại nhưng khiến bài sau bất khả thi không được niêm phong.
    - Không chuyển đổi tự động các công trình chia lô v3 sang chuỗi mục tiêu mới; dữ liệu cũ giữ riêng. Reload app để nạp Round 2.3 và bắt đầu/tiếp tục hành trình v4.

    Metro được để chạy bằng `npm run start`, cổng 8090. Mở [web](http://localhost:8090/games/block-island). Điện thoại cùng Wi-Fi dùng `exp://192.168.2.2:8090` hoặc [QR](expo-go-qr.png); IP có thể đổi theo mạng.

    Nghiệm thu đề nghị: chọn Khởi động → đặt gạch/đá/cây, kiểm tra cây không tăng S → Gợi ý xây, ẩn/hiện, đặt đủ S16 → kiểm tra và sang bài 2, xác nhận S cũ còn và P đo hợp nhất → thử gỡ/đổi vật liệu khối khóa → xây tiếp P20. Sau đó thử Thử thách, chọn tầng, dựng nền/tường/sàn trên có đỡ, xem đất 4 m² nhưng tổng sàn 8 m²; xoay/pan/zoom, pause/background/Android Back rồi tiếp tục tới nhiệm vụ 6.
