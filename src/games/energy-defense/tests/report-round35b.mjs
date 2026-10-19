import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const out='artifacts/energy-defense-round35b';
const read=name=>readFile(out+'/'+name,'utf8').then(JSON.parse);
const [web,spawn,asset,video,combat]=await Promise.all([read('web-report.json'),read('spawn-measurements.json'),read('asset-validation.json'),read('video-metadata.json'),read('combat-regression.json')]);
assert.ok(web.checks.every(c=>c.passed));assert.equal(web.checks.length,271);
assert.ok(combat.checks.every(c=>c.passed));assert.equal(combat.checks.length,13);
for(const row of spawn.rows) assert.deepEqual(row.measuredMs,Array.from({length:row.count},(_,i)=>2000+i*row.intervalMs));
const fmt=n=>n.toFixed(3);
const geometry=web.viewports.map(v=>({viewport:v.w+'x'+v.h,doorError:Math.hypot(v.geometry.door.x-v.geometry.pathEnd.x,v.geometry.door.y-v.geometry.pathEnd.y),spawnError:Math.hypot(v.geometry.spawn.x-v.geometry.pathStart.x,v.geometry.spawn.y-v.geometry.pathStart.y)}));
const files=[
  'components/AncientPortal.tsx','components/Battlefield.tsx','components/CombatStage.tsx','components/CreatureSprite.tsx',
  'presentation/route.ts','presentation/enemy.ts','presentation/portal.ts',
  'assets/round35b/source-art/ancient-portal.png','assets/round35b/manifest.json','assets/round35b/PROMPT.md',
  'tests/castle-portal.test.ts','tests/round35b-e2e.mjs','tests/round35b-combat-e2e.mjs','tests/encode-round35b-video.mjs','tests/report-round35b.mjs',
  'tests/run-bounded.mjs','tests/spawn-pacing.test.ts',
];
const report=`# ENERGY DEFENSE — ROUND 3.5B

Workspace: C:\\Tro_choi_cho_em. Hoàn tất phần triển khai và kiểm thử web/export; **chờ nghiệm thu Expo Go trên điện thoại thật**.

## 1. Thành lệch: lỗi anchor và hình học mặt đường

Ảnh tham chiếu 01–06, README_VI.md và MANIFEST.json đã được đọc đúng tên. Ảnh 04 dùng cho cách nối đường vào công trình; ảnh 05 chỉ cho cấu trúc ba trụ, ảnh 06 chỉ cho màn năng lượng. Không lấy thêm artwork bên ngoài thay cho bộ tham chiếu.

Round 3.5 đã ghép endpoint với điểm (207,430) trong PNG thành 512×512. Điểm này ở mép bậc dưới, chưa phải ngưỡng cửa chính. Cửa và bậc thềm còn có trục chéo trong ảnh giả phối cảnh, trong khi đoạn cuối portrait đi thẳng lên. Nét đường rộng 64 giữ nguyên đến cuối và đoạn cua gần cửa tạo mặt đường lòi quanh bậc. Vì vậy khớp một điểm vẫn chưa đủ để công trình nhận đường tự nhiên.

Không có lỗi vận tốc, HP hoặc callback tới căn cứ cần sửa. Ảnh PNG thành gốc không bị biến dạng hoặc repaint.

## 2. Nguồn bóng đen

Bóng lớn là View riêng trong CrystalCitadel: style castleShadow, rộng 157, cao 30, borderRadius 80, rgba(11,45,37,.3), nằm sát đáy bounding box. Nó không phải bóng được vẽ vào PNG hoặc texture bản đồ.

Đã xóa đúng View và style này. Không che bằng màu nền, không xóa pixel của thành, không thêm ellipse thay thế. Giữ shading sát chân đá vốn có trong artwork và hiệu ứng khiên combat hiện hữu; vòng khiên nhạt không phải bóng oval đen.

## 3. Căn cửa và đường

- Ngưỡng cửa trong ảnh gốc: **(207,383)**; tâm bậc thềm: **(185,421)**. Trục tiếp cận lấy từ hiệu hai điểm này; không dùng tâm bounding box hoặc offset đoán từ screenshot.
- Portrait giữ endpoint **(305,530)**, spawn **(65,115)**. Thành vẫn 170×170, cùng tỉ lệ; đặt theo anchor cửa. Vị trí canvas thành mới: left=${fmt(spawn.geometry.castle.left)}, top=${fmt(spawn.geometry.castle.top)}.
- Đoạn tiếp cận cuối lấy theo trục bậc thềm, bo nối vào tuyến và thu hẹp từ đường rộng 64 vào bề rộng cửa đo trên asset (56/512 chiều rộng ảnh). SVG mặt đường là mesh có bề rộng biến thiên, kết thúc tại chính endpoint; không có cap kéo dài hoặc miếng nền che lỗi.
- Desktop dùng cùng cách căn cửa; chỉ chỉnh đoạn tiếp cận từ progress 330 tới 370. Các đoạn trước giữ tọa độ gameplay/presentation cũ.
- Road, enemy feet, lanes và projectile tracking dùng chung routePoint. Các lane hội tụ về chính endpoint. Gameplay tiếp tục dựa trên progress **370**, không thêm điểm biến mất khác.

Chiều dài presentation portrait: 813,994284 → ${fmt(spawn.geometry.portraitRoadLength)}; desktop: 666 → ${fmt(spawn.geometry.desktopRoadLength)}. Đây là thay đổi hình học hiển thị của lối vào; chiều dài logic giữ nguyên 370 và hàm travelled/vận tốc không đổi. Thời gian đi từ spawn tới cửa vẫn scout 28,461538s, slime 37s, golem 52,857143s. Không tăng tốc quái để bù hình học.

Sai lệch đo từ DOM/SVG thật trong production browser (CSS pixels):

| Viewport | Endpoint ↔ anchor cửa | Spawn ↔ lòng portal |
|---|---:|---:|
${geometry.map(g=>`| ${g.viewport} | ${fmt(g.doorError)} | ${fmt(g.spawnError)} |`).join('\n')}

## 4. Cổng cổ ba trụ

Artwork mới được tạo bằng built-in image_gen, dùng thành hiện có làm chuẩn nét vẽ, màu đá và ánh sáng. Có ba trụ đá rõ ràng, cao độ khác nhau, hai dầm đá nối thành tàn tích thống nhất, rêu, vết nứt, hoa văn và cạnh đá có thể tích. Giữ góc nhìn 2D giả phối cảnh, không dùng pixel-art hoặc mô hình 3D Minecraft.

PNG alpha nguyên bản **1254×1254**, ${asset.manifest.sha256}; lưu trong src/games/energy-defense/assets/round35b/source-art/ancient-portal.png. Source không bị repaint, resize hoặc xóa alpha sau khi tạo. Prompt nguyên văn và vai trò từng reference được lưu trong assets/round35b/PROMPT.md. Kích thước runtime 180 đơn vị portrait, 125 desktop; không scale méo ảnh.

Anchor chân vùng thoát chính đo trên ảnh nguồn là **(500,866)**. Đặt anchor này trực tiếp vào routePoint(0), thay vì đặt tâm toàn bộ ba trụ lên đầu đường. Bounding box alpha và các điểm đo được ghi trong manifest.json.

## 5. Màn năng lượng

Hai khoang có bề mặt tím đậm, tím sáng và hồng tím với vân xoáy được vẽ sẵn. Kiểm tra alpha nguồn cho thấy vùng trong ảnh có alpha 251–253, nên bổ sung nền SVG tím mận **opacity=1 dưới PNG**, phủ kín cả hai lòng cổng. Composite trong lòng cổng vì vậy không truyền ảnh nền phía sau; nền xung quanh công trình vẫn trong suốt. Không dùng opacity toàn portal để tạo nhấp nháy.

Phía trên artwork là hai dải năng lượng, một vân xoáy và bốn hạt nhỏ, được clip vào vùng năng lượng. Dải sáng trôi chậm, độ sáng dao động nhẹ, không bloom/neon mạnh. Spawn tạo phản hồi tối đa **420ms** từ bornAt của quái; hiệu ứng không giữ hoặc dời lịch sinh. Reduced motion giữ phần nền/texture và tắt chuyển động/phản hồi sáng theo cài đặt hệ thống.

## 6. Quái bước ra từ cổng

BornAt, số lượng, loại quái và lịch spawn vẫn do DefenseController cũ quyết định. AncientPortal chỉ nhận clock và bornAt mới nhất, không có timer riêng và không phát sự kiện gameplay.

Khung hậu cảnh và màn tím vẽ trước quái. Trụ giữa tiền cảnh dùng cùng PNG với SVG clip, vẽ ở lớp trước. Khi chân quái vượt mặt phẳng vùng mở (progress 12), sprite được xếp ra trước khung để không bị trụ che khi đã đi trên đường. Không dịch sprite từ vị trí khác vào, không fade mất chân, không đổi crop atlas/walk frame/neo chân/shadow; chỉ điều chỉnh z-order theo vị trí.

Video thật cho thấy toàn bộ chặng 1 đi từ portal tới cửa. HP giảm theo chuỗi **100 → ${web.arrivals.map(a=>a.hp).join(' → ')}**, đủ 5 quái, mỗi quái trừ 15 một lần; sang chặng 2 không còn ID quái chặng 1 phía sau thành.

| Lần lọt thành | Game clock (s) | HP còn |
|---:|---:|---:|
${web.arrivals.map((a,i)=>`| ${i+1} | ${fmt(a.clock/1000)} | ${a.hp} |`).join('\n')}

Spawn Thử thách chặng 1 trong video: **${web.liveSpawns.slice(0,5).map(e=>e.bornAt/1000).join(' / ')} giây**, đúng Round 3.5. Các bài đo controller kiểm tra lại đủ 17 chặng chính và các mốc Vô Tận, giữ sàn 1000ms và số quái cũ. [Dữ liệu đo spawn](spawn-measurements.json).

## 7. File sửa/thêm ở Round 3.5B

Tiền tố chung: src/games/energy-defense/

${files.map(f=>'- '+f).join('\n')}

run-bounded.mjs và spawn-pacing.test.ts thêm lựa chọn thư mục artifact theo ENERGY_ARTIFACT_DIR để giữ bằng chứng 3.5B tách biệt. Các working changes Round 3.5, AGENTS.md và tài nguyên tham chiếu đã tồn tại được giữ nguyên. Không dùng thao tác ghi Git.

Không sửa controller/config/path gameplay, toán/chấm điểm, HP/damage, vận tốc, lịch sử, modal, HUD/dock, registry/shared API, source hai game đua xe hoặc worktree Antigravity. Asset thành, pháo, quái và nền rừng giữ nguyên.

## 8. Kết quả kiểm thử

| Nhóm | Kết quả |
|---|---|
| TypeScript | PASS — tsc --noEmit |
| Jest module | PASS — 9 suites, 111/111 |
| Architecture/import checks | PASS — 1 suite, 3/3 |
| ESLint module | PASS — 0 warning/error |
| ESLint toàn repository | PASS — 0 error, 47 warning có sẵn ngoài module |
| Production web export | PASS |
| Android Hermes export | PASS — bundle + asset, chưa phải test thiết bị |
| Web E2E | PASS — 271/271; responsive, chuyển động, layer, portal, lịch spawn, HP và clock |
| Combat regression web | PASS — 13/13; projectile/impact/kill/score trên mobile và desktop, gần cổng và gần thành |
| Asset validation | PASS — alpha nền trong suốt, vùng năng lượng có nền đục runtime; source/hash giữ nguyên |
| git diff --check | PASS |

Web E2E chạy trên Chrome production với DPR=1: 320×640, 360×640, 390×844, 412×915, tablet 768×1024 và desktop 1440×1000. Kiểm tra tỷ lệ PNG với khung portal để chặn lỗi dùng kích thước intrinsic, vị trí qua tuyến, sprite đứng thẳng, shadow theo chân, lớp trụ trước/sau, dải năng lượng thay đổi và pause thực sự giữ nguyên clock/vân sáng.

Bài combat riêng thao tác chọn đáp án và bắn trên UI thật, đo projectile và impact trúng thân quái đứng thẳng sau thay đổi z-order. Sai lệch impact lớn nhất ${fmt(Math.max(...combat.viewports.map(v=>v.maxImpactError)))} CSS px; mỗi lần bắn xử lý đúng một quái, cộng 25 điểm ở chế độ chính và không trừ HP. Bài này dùng fixture câu hỏi/quái riêng, không sửa luật sản phẩm. [Trace combat](combat-regression.json).

Các lệnh dùng bounded runner: timeout 90–240s tùy kiểm tra; xem [logs](logs/). Không cài dependency. Không chạy codex resume hoặc tạo phiên Codex lồng nhau.

Đo frame web trong các fixture stress (giữ tốc độ quái; không sửa luật sản phẩm):

| Quái | Mẫu rAF | Median (ms) | p95 (ms) | Frame >50ms |
|---:|---:|---:|---:|---:|
${web.performance.map(p=>`| ${p.count} | ${p.samples} | ${fmt(p.median)} | ${fmt(p.p95)} | ${p.over50} |`).join('\n')}

Đây là đo browser trên máy hiện tại trong cửa sổ khoảng 2,2s/mức tải, không phải FPS native hoặc benchmark chứng minh chi phí portal bằng 0. Có frame chậm ở tải 10 quái, đã ghi đầy đủ. Không đổi vận tốc hoặc giảm số quái để lấy kết quả đẹp; bốn hạt và số layer portal giữ cố định khi có 3/5/10/25 quái.

## 9. Bằng chứng

- Toàn cảnh: [320×640](images/320x640.png), [360×640](images/360x640.png), [390×844](images/390x844.png), [412×915](images/412x915.png).
- Thành: [cận cảnh không còn oval](images/castle-no-oval.png), [đường nối bậc cửa](images/door-road-junction.png), [quái đang tiếp cận](images/castle-approach.png), [đánh dấu trùng anchor/endpoint](images/door-endpoint-proof.png). Dấu tròn hồng trong ảnh proof chỉ là overlay QA, không nằm trong app.
- Portal: [ba trụ + hai màn tím](images/portal-three-pillars.png), [spawn thật từ lòng cổng](images/portal-spawn-live.png), [toàn cảnh spawn thật](images/spawn-live-fullscreen.png).
- Regression: [tablet](images/768x1024.png), [desktop](images/1440x1000.png), [25 quái](images/stress-25.png), [sau khi cả chặng chạm cửa](images/after-all-castle-arrivals.png).
- [Video web 1×](${video.file}): ${fmt(video.capturedSeconds)}s, ${video.width}×${video.height}, ${video.capturedFrames} frame nguồn; **không audio, chỉ web**. Không nhảy clock hoặc dựng quái cho đoạn video; chỉ seed loại quái để có scout, slime và golem. Encode giữ timestamp gốc, không nội suy hoặc tăng tốc; 30fps của encoder không phải FPS game đo được.
- Dữ liệu máy đọc: [web-report.json](web-report.json), [asset-validation.json](asset-validation.json), [video metadata](video-metadata.json), [spawn measurements](spawn-measurements.json).

## 10. Hạn chế và nghiệm thu Expo Go

**Chưa kiểm thử native trên Android/iOS thật hoặc emulator kết nối.** Android export chỉ xác nhận JavaScript/Hermes và asset đóng gói được; chưa xác minh SVG clipping/layer, performance, thao tác chạm hay AppState trên điện thoại thật. Các kết quả trên không được coi là native PASS.

Expo Go vẫn dùng **exp://192.168.2.2:8090**; reload dự án, vào Energy Defense để xem Round 3.5B. Web preview đã chuyển sang build mới tại **http://localhost:8097/games/energy-defense**. Không cần cài dependency mới.

Trên điện thoại: xem cổng ở đầu đường; quan sát quái sinh từ màn tím, đi qua khung rồi ra đường; pause khi đang có dải sáng hoặc chờ spawn; resume và theo dõi một quái tới cửa thành. Xác nhận không có oval, đường không lòi qua bậc, mỗi quái chỉ trừ 15 HP một lần, không còn sprite sau thành. Kiểm tra thêm 25 quái trong Vô Tận khi đủ điều kiện thực tế.

Skill dùng: expo-2d-game-engine cho progress/anchor và ranh giới presentation–gameplay; game-motion-camera cho trục cửa, camera và lớp sprite; gameplay-native-qa cho motion/lifecycle/regression/evidence; imagegen cho artwork bitmap gốc. Ba skill game được đọc trực tiếp trong .agents/skills của dự án vì không có trong session catalog. API đối chiếu với [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Reanimated 4 animated styles](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle/) và [animated props](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps/), cùng types cài thực tế: Expo 57.0.26, RN 0.86.3, Reanimated 4.5.5, react-native-svg 15.15.5.
`;
await writeFile(out+'/REPORT_VI.md',report);
console.log(JSON.stringify({report:out+'/REPORT_VI.md',webChecks:web.checks.length,geometry,videoSeconds:video.capturedSeconds}));
