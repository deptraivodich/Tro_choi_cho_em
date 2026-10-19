import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const out='artifacts/energy-defense-round36';
const read=name=>readFile(out+'/'+name,'utf8').then(JSON.parse);
const [web,responsive,combat,spawn,motion,pixel,occlusion,video,portalVideo,protectedFiles,journey,liveJourney]=await Promise.all([
  read('web-report.json'),read('responsive-regression.json'),read('combat-regression.json'),read('spawn-measurements.json'),
  read('motion-analysis.json'),read('pixel-occlusion.json'),read('occlusion-regression.json'),read('video-metadata.json'),read('portal-video-metadata.json'),read('protected-files.json'),read('journey-measurements.json'),read('live-journey-measurements.json'),
]);
for(const report of [web,responsive,combat,occlusion])assert.ok(report.checks.every(c=>c.passed));
assert.ok(Object.values(protectedFiles).every(Boolean));assert.ok(pixel.occludedPixelsMatchingBase>20);
const seconds=n=>(n/1000).toFixed(3), before=812.5282075238852,after=spawn.geometry.portraitRoadLength;
const modeName={easy:'Khởi động',medium:'Rèn luyện',hard:'Thử thách'};
const schedule=spawn.rows.filter(r=>r.mode!=='endless').map(r=>`| ${modeName[r.mode]} | ${r.wave} | ${r.count} | ${seconds(r.intervalMs)} | 2.000 | ${seconds(r.lastMs)} | ${seconds(r.measuredMs.at(-1))} |`).join('\n');
const perf=web.performance.map(r=>`| ${r.count} | ${r.median.toFixed(2)} | ${r.p95.toFixed(2)} | ${r.over50} |`).join('\n');
const travelRows=liveJourney.map(r=>`| ${r.type} #${r.id} | ${seconds(r.expectedTravelMs)} | ${seconds(r.measuredTravelMs)} | ${r.errorMs.toFixed(3)} | ${r.hp} |`).join('\n');
const files=[
 'logic/controller.ts','screens/EnergyDefenseScreen.tsx','components/Battlefield.tsx','presentation/enemy.ts','presentation/combat.ts',
 'presentation/route.ts','presentation/portal.ts','components/AncientPortal.tsx','components/CombatStage.tsx','components/CreatureSprite.tsx',
 'tests/portrait-camera.test.ts','tests/castle-portal.test.ts','tests/round36-layout.test.ts','tests/route-distance.test.ts','tests/spawn-pacing.test.ts',
 'tests/round36-e2e.mjs','tests/round36-responsive-e2e.mjs','tests/round36-combat-e2e.mjs','tests/round36-occlusion-e2e.mjs',
 'tests/encode-round36-video.mjs','tests/encode-round36-portal-video.mjs','tests/encode-round36-video.py','tests/report-round36.mjs','tests/analyze-round36-evidence.py','tests/round36-overview-e2e.mjs','tests/verify-round36-video.mjs',
 'assets/round36/source-art/ancient-portal-front.png','assets/round36/source-art/PROMPT.txt','assets/round36/manifest.json',
];
const text=`# ENERGY DEFENSE — ROUND 3.6

Workspace: C:\\Tro_choi_cho_em. Đã triển khai, kiểm thử web/export; chờ người dùng nghiệm thu Expo Go trên điện thoại thật.

## 1. Đối chiếu tham chiếu và nguyên nhân

Đã đọc AGENTS.md, README_VI.md, MANIFEST.json và đúng ba ảnh trong bộ energy-defense-round36-route-layout. Đã trích và xem video MP4 gốc theo manifest, gồm các mốc 0, 3, 4, 5, 6, 8 giây. File metadata và frame nguyên gốc nằm ở reference-analysis/. Video 720×1600, 335 frame, 30fps, khoảng 11,17s; đó là thông số recording, không phải số đo FPS game.

- 3s: quái tím đang trong màn năng lượng. 4–5s: quái giao với trụ giữa, nhưng thân xuất hiện đè trên đá. 6s: quái qua vùng trụ phải. 8s: quái đầu đã thoát, quái tiếp theo xuất hiện.
- Source portalDepth đổi cả sprite từ zIndex 1 lên 3 ở progress=12, độc lập với vị trí thực tế của cột. Foreground cũ chỉ tách trụ giữa. Artwork PNG có facade chéo nên quái đi ngang còn giao khung sau khi đổi lớp.
- Source roadRibbon Round 3.5B nội suy bề rộng 64 xuống bề rộng cửa 56×170/512≈18,59 trong 38 progress cuối. Đây là nguyên nhân cổ chai; không phải camera scale.

## 2. Đường mobile và công trình

Phục hồi các lớp stroke từ source trước 3.5B, đối chiếu cả git show cc254bd và bundle web Round 3.5: bóng đất rộng66, viền64 màu #4F6132, mép58 màu #B4995E, mặt51 màu #DCC18A, texture38 màu #ECD29A với dash 3/14, opacity0.3. Không dùng Git restore/reset. Các lớp mobile giữ nguyên bề rộng tới endpoint, không có taper. Camera vẫn scale đồng đều X/Y.

Một tập waypoint world sinh cả đường SVG và nội suy quái. Tuyến mới: spawn (115,95), thoát xuống qua mặt cổng, đi phải trên nhánh y≈145; vòng phải xuống y≈315, đi trái tới x≈60; vòng trái xuống y≈580, đi phải đến cửa (330,580). Các góc dùng quadratic samples chung cho đường và movement; không dùng nét đỏ như ảnh nền.

- Cổng: nằm nửa trái phía trên, mặt nhìn xuống màn hình. Canvas rộng220, cao146,667 world units. Anchor landing đo trên source (560,840) / 1536, không lấy tâm bounding box.
- Pháo: (325,230) → **(160,420)**. Giữ base148/head164, muzzle radius67, recoil và projectile timeline. Engine hiện chọn quái tiến xa nhất; không có giới hạn range riêng để điều chỉnh. Không thêm hoặc tăng range.
- Cửa thành: (305,530) → **(330,580)**, tức xuống50 và sang phải25. Artwork vẫn170×170, anchor cửa (207,383)/512. Canvas mới left261,2695/top452,8320. Đường kết thúc đúng điểm này và nằm dưới foundation/bậc thềm; không có cap kéo dài phía sau hoặc miếng nền che. Không thêm lại oval shadow.
- Desktop/tablet giữ waypoint, endpoint, turret, castle scale và road mesh được chấp nhận ở 3.5B. Taper cũ chỉ còn ở desktop; yêu cầu phục hồi đường full-width được áp dụng cho portrait. Không xoay toàn bộ bản đồ.

## 3. Artwork và chiều sâu cổng

Dùng built-in imagegen **edit** từ PNG 3.5B để dựng facade chính diện: ba trụ cùng ground line, hai lintel ngang, cùng đá vàng, rêu, rune và màn tím. Không xoay/ép méo ảnh chéo. Source mới RGBA1536×1024, khoảng2,7MB; alpha ngoài công trình=0. Giữ PNG gốc3.5B và source mới cùng PROMPT.txt, manifest. Không sửa bitmap bằng Python.

Rendering: back artwork → opaque purple backing/animated energy → một sprite quái → stone foreground lấy từ alpha source bằng ClipPath. Foreground chỉ chứa đá, không phủ cả màn năng lượng lên quái. Mobile đổi depth theo ground plane chân trụ đo ở source y922, không theo hằng progress12: quái đi xuống qua plane trước khi rẽ phải. Chỗ đổi lớp nằm trong bay trống nên không nhảy qua cột. Desktop giữ artwork chéo, thêm mask trụ phải; phần foreground chỉ giao các pixel đá.

Sprite vẫn đứng thẳng, không flip/rotate theo tangent. Không thay atlas golem, stride, pivot chân228/256, shadow hoặc hit/death animation. Portal dùng clock hiện có; không thêm timer, trì hoãn spawn hoặc enemy thứ hai.

Chuỗi ảnh occlusion-0/1/2/3/4/6/8/12/18 thể hiện các giai đoạn thoát cổng. Ngoài video chuyển động thật, có phép thử riêng: một golem dừng, dịch presentation35 world units vào trụ giữa để buộc giao nhau. Chỉ ẩn modal trong DOM kiểm thử; không sửa game. So sánh pixel có/không foreground: ${pixel.changedPixels} pixel khác nhau, ${pixel.occludedPixelsMatchingBase} pixel ở phần bị cột che khớp nền không-quái. Đây là diagnostic ép giao, không được coi là video đi tuyến thật.

## 4. Chiều dài và thời gian — phân biệt đơn vị

| Đại lượng | Trước | Sau |
|---|---:|---:|
| Chiều dài đường portrait trong presentation world | ${before.toFixed(6)} | ${after.toFixed(6)} |
| Chiều dài hành trình logic | 370 | ${journey.afterLogicalLength.toFixed(6)} |
| Chiều dài desktop presentation | 679.161054 | 679.161054 |
| Scout: spawn → cửa, giây | 28.461538 | ${journey.measurements.find(m=>m.type==='scout').afterSeconds.toFixed(6)} |
| Slime: spawn → cửa, giây | 37.000000 | ${journey.measurements.find(m=>m.type==='slime').afterSeconds.toFixed(6)} |
| Golem: spawn → cửa, giây | 52.857143 | ${journey.measurements.find(m=>m.type==='golem').afterSeconds.toFixed(6)} |

**Giữ vận tốc:** dùng calibration Round3.5B: 812,5282075/370 = 2,1960221825 world units/logical unit. Tuyến mới tăng ${((after/before-1)*100).toFixed(2)}% chiều dài, nên controller nhận chiều dài ${journey.afterLogicalLength.toFixed(6)} trước start và giữ cố định trong cả trận. Không kéo giãn370 đơn vị trên tuyến dài hơn. Thời gian di chuyển tăng cùng tỷ lệ; speed scout1,3/slime1/golem0,7 và hàm travelled không đổi. Desktop vẫn370. Cùng một controller, chỉ khác dữ liệu level; không tạo bộ luật riêng. Tổng thời gian trận360s và spawn deadlines giữ nguyên, không bù difficulty.

Enemy feet, lane convergence và portal ground plane dùng cùng phép đổi distance → normalized road progress. ShotTarget truyền distance thực để bắn đúng cả sau progress370. Layout đã chọn giữ presentation tương ứng khi resize giữa trận, tránh đổi metric/teleport. journey-measurements.json kiểm tra từng loại: trước ngưỡng0,01ms còn sống, sau ngưỡng0,01ms xử lý đúng một lần.

Trong quay web có một phát bắn hạ một quái, bốn quái còn lại tới cửa và HP100→85→70→55→40, mỗi lần15. Không còn ID của chặng trước phía sau thành. ${motion.samples} mẫu vị trí slime từ cùng video cho chuỗi hướng [phải,trái,phải], độ lệch tim đường tối đa ${motion.maxCenterlineDistance.toFixed(4)} so với lane9. Mẫu cuối trước escape sát endpoint; không có teleport tới cửa.

Quay với clock thật, seed thứ tự loại quái để có đủ scout/slime/golem và cấp một bài toán fixture đáp án1 cho phát bắn UI ở khoảng20s. Không chèn enemy, đổi HP/speed hoặc nhảy clock. Số đo runtime từ cùng recording (live-journey-measurements.json):

Recording bắt đầu ở game clock ${(web.recording.clock/1000).toFixed(3)}s; deadline quái đầu2s được tính từ lúc bắt đầu chặng, không tính từ đầu video hoặc đoạn crop.

| Quái | Dự kiến spawn→cửa s | Đo game clock s | Sai số ms | HP sau lọt |
|---|---:|---:|---:|---:|
${travelRows}

## 5. Spawn giữ nguyên và số đo

logic/config.ts, path.ts, history.ts, pausable-tasks.ts giữ nguyên SHA-256 so với baseline đầu Round3.6 (protected-files.json). Controller chỉ thêm cấu hình pathLength trước start và dùng nó làm ngưỡng escape; inverse patch khớp chính xác SHA baseline (controller-change-validation.json), chứng minh spawn/clock/math/scoring không thay. Không sửa maths, HP/damage, số quái, score, Endless, pause/background, HUD/dock hoặc shared API.

Bảng dưới dùng giây. Cột đo là birth timestamp của controller chạy clock bất quy tắc17/31/53ms trong Jest, không phải đo đồng hồ điện thoại. Quái đầu2s; cuối=2+(count−1)×interval. Chặng chỉ hoàn thành sau xử lý hết quái.

| Mode | Chặng | Số quái | Interval s | Đầu s | Cuối s | Đo cuối s |
|---|---:|---:|---:|---:|---:|---:|
${schedule}

Endless đã chạy qua các mốc1,3,4,6,7,9,10,13,16,25,27,28,30,31; đủ số quái, interval nguyên milliseconds và clamp1000ms. Chi tiết đầy đủ: spawn-measurements.json. Trong video thật, chặng hard1 có bornAt2000/5500/9000/12500/16000ms, không jitter. Pause/resume giữ deadline; pulse/band cùng clock cũng dừng.

## 6. Kiểm thử

- TypeScript toàn dự án: PASS (logs/typecheck-final.txt).
- Jest module + architecture: **122/122**, 12 suites (119 module +3 architecture). Bao gồm vận tốc world không đổi, distance level khóa trong trận, width không taper, lane continuity, notch/camera, endpoint, once-only HP, spawn/lifecycle, maths/history.
- ESLint module: chạy lại sau dọn helper test; xem logs/lint-final.txt.
- Web E2E quay thật: ${web.checks.length}/${web.checks.length}; responsive cuối sau bảo toàn desktop: ${responsive.checks.length}/${responsive.checks.length}; combat: ${combat.checks.length}/${combat.checks.length}; diagnostic occlusion: ${occlusion.checks.length}/${occlusion.checks.length}.
- Responsive web:320×640,360×640,390×844,412×915,768×1024,1440×1000; cửa/spawn lệch <0,05 CSSpx, không overflow trang, công trình clear HUD/dock. Notch47/34 được kiểm tra tọa độ bằng Jest, chưa phải notch native.
- Projectile/muzzle/impact kiểm tra mobile và desktop, gần cổng, progress330 và progress560 mobile, impact error<4 CSSpx, đúng1 kill/25 điểm/HP100 ở fixture combat.
- Web export và Android Hermes export: PASS. Export không chứng minh native runtime.
- Không có thiết bị/emulator Android khả dụng trong phiên; **chưa nghiệm thu native Expo Go**, chưa đo FPS/memory trên điện thoại. Video không audio, không dùng làm bằng chứng âm thanh.

Đo requestAnimationFrame Chrome headless, mỗi tình huống khoảng2,2s, portal hoạt động; không quy đổi thành FPS Android:

| Số quái | Median ms | P95 ms | Frame >50ms |
|---:|---:|---:|---:|
${perf}

Export có warning NO_COLOR/FORCE_COLOR và có lần cache Metro không đọc được; Metro tự full crawl rồi bundle thành công. Không nâng dependency hay sửa lỗi ngoài module.

## 7. Bằng chứng

- [Mobile390×844 chạy thật](images/mobile-overview-live.png), [pháo giữa-trái](images/turret-middle-left.png); các viewport khác cùng thư mục images/.
- [Cổng ba trụ](images/portal-three-pillars.png), [spawn thật](images/portal-spawn-live.png).
- [Cửa/đường](images/door-road-junction.png), [không oval](images/castle-no-oval.png), [cross endpoint diagnostic](images/door-endpoint-proof.png).
- [Quái qua foreground, diagnostic](images/occlusion-forced-with-front.png); ảnh đối chứng occlusion-forced-base/without-front và pixel-occlusion.json. Ảnh diagnostic không thay cho video.
- [Desktop](images/1440x1000.png), [tablet](images/768x1024.png).
- [Video gameplay web1×](${video.file}): ${video.sourceSeconds.toFixed(3)}s, spawn, cua, phát bắn, đi đến thành; không audio.
- [Video cận portal web1×](${portalVideo.file}): ${portalVideo.sourceSeconds.toFixed(3)}s, crop từ recording thật, gồm golem bước ra. Không tăng tốc. Timestamps/raw JPEG còn trong video-frames/.
- Bản cuối dùng H264 OpenCV/Windows Media Foundation đã có, giữ mỗi frame theo timestamp gốc, xuất20fps, không nội suy chuyển động. Đã kiểm tra toàn bộ frame decode và khoảng timestamp (50ms); output20fps không phải số đo FPS native. Loại đúng một frame screencast bị crop khi chụp ảnh đồng thời; giữ frame trước tới frame hợp lệ kế tiếp, có liệt kê trong metadata. Thử nghiệm encoder trước đó bị hụt frame/timeout nên không dùng làm bằng chứng cuối, lưu ở diagnostics/. Có kiểm tra phát file bằng HTML video Chrome (video-playback-check.json).
- motion-analysis.json, motion-samples.json, web-report.json, responsive-regression.json, combat-regression.json, asset-validation.json và logs/ cho số liệu thô.

## 8. File sửa/thêm trong Round3.6

Tất cả dưới src/games/energy-defense, ngoài các artifacts trực tiếp liên quan:

${files.map(f=>'- '+f).join('\n')}

Không chỉnh race-to-finish, terrain-racing, worktree anti, dependency, registry hoặc shared API; không commit/push/reset/restore/clean/merge. Các thay đổi có từ vòng trước được giữ lại.

Skill đã dùng: .agents/skills/expo-2d-game-engine/SKILL.md (tọa độ/clock), game-motion-camera (phân tích video/sprite), gameplay-native-qa (phân loại bằng chứng); đọc trực tiếp vì không có trong catalog. Skill imagegen dùng built-in edit, source/prompt lưu trong module. Đã đối chiếu API SVG với https://docs.expo.dev/versions/v57.0.0/sdk/svg/ và Reanimated4 useAnimatedStyle với https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle/ .

## 9. Mở nghiệm thu

Expo Go: exp://192.168.2.2:8090 — điện thoại cùng Wi-Fi, Reload dự án, chọn Thủ Thành Năng Lượng. Metro/status đã kiểm tra200. Web: http://localhost:8097/games/energy-defense (production export Round3.6).

Trên thiết bị thật cần xác nhận thời gian hành trình dài hơn theo đúng quãng đường, che khuất từng giai đoạn, notch/HUD/dock, pause/background và FPS với nhiều quái. Không ghi đã PASS những mục native này.
`;
await writeFile(out+'/REPORT_VI.md',text,'utf8');
console.log('Report written: '+out+'/REPORT_VI.md');
