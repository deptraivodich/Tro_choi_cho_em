import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const out = 'artifacts/energy-defense-round35';
const unit = JSON.parse(await readFile(out + '/spawn-measurements.json', 'utf8'));
const web = JSON.parse(await readFile(out + '/web-report.json', 'utf8'));
const video = JSON.parse(await readFile(out + '/video-metadata.json', 'utf8'));
const labels = { easy: 'Khởi động', medium: 'Rèn luyện', hard: 'Thử thách', endless: 'Vô Tận' };
const intervals = { easy: [5000,4500,4000,3500,3000], medium: [5000,4500,4000,3250,2500], hard: [3500,3250,3000,2750,2500,2250,2000] };
// Independently verify the browser's real production controller trace, not just Jest output.
let browserWaves = 0;
for (const run of web.schedules) {
  const groups = new Map();
  for (const row of run.rows) { const key = row.mode + row.wave; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); }
  for (const rows of groups.values()) {
    const first = rows[0], interval = first.mode === 'endless' ? Math.max(1000,1900-Math.floor((first.wave-1)/3)*100) : intervals[first.mode][first.wave-1];
    assert.equal(rows.length, first.count);
    rows.forEach((r,i) => assert.ok(Math.abs(r.relativeMs - (2000 + i * interval)) < 1e-6));
    assert.equal(new Set(rows.map(r=>r.bornAt)).size, rows.length);
    browserWaves++;
  }
}
assert.equal(browserWaves, 48); // 17 normal waves plus 31 Endless waves.
assert.ok(web.checks.every(c => c.passed));
const sec = n => (n / 1000).toFixed(2).replace('.', ',');
const browserRows = (mode,wave) => web.schedules.flatMap(s=>s.rows).filter(r=>r.mode===mode&&r.wave===wave);
function table(rows) {
  return '| Chế độ | Chặng | Quái | Cách spawn (s) | Đầu (s) | Cuối (s) | Đo Jest đầu → cuối (s) | Đo production web đầu → cuối (s) |\n' +
    '|---|---:|---:|---:|---:|---:|---:|---:|\n' + rows.map(r => {
      const b = browserRows(r.mode,r.wave);
      return `| ${labels[r.mode]} | ${r.wave} | ${r.count} | ${sec(r.intervalMs)} | 2,00 | ${sec(r.lastMs)} | ${sec(r.measuredMs[0])} → ${sec(r.measuredMs.at(-1))} | ${sec(b[0].relativeMs)} → ${sec(b.at(-1).relativeMs)} |`;
    }).join('\n');
}
const live = web.liveSpawns.slice(0,5);
const errors = live.map(r=>r.observedClock-r.bornAt);
const files = [
  'components/Battlefield.tsx','components/CombatStage.tsx','components/CreatureSprite.tsx',
  'hooks/useBattleClock.ts','logic/config.ts','logic/controller.ts','presentation/enemy.ts',
  'presentation/portrait.ts','presentation/route.ts','tests/portrait-camera.test.ts','tests/progression.test.ts',
  'tests/spawn-pacing.test.ts','tests/round35-e2e.mjs','tests/run-bounded.mjs','tests/encode-round35-video.mjs','tests/report-round35.mjs',
];
const report = `# Energy Defense — Round 3.5

Đã triển khai trong C:\\Tro_choi_cho_em, chỉ sửa module Energy Defense và xuất bằng chứng liên quan. Chờ người dùng nghiệm thu Expo Go trên điện thoại thật.

## Nguyên nhân và cách sửa

1. **Cổng sai hướng:** presentation portrait cũ áp matrix xoay 90° cho toàn bộ SVG đường và cổng, trong khi sprite vẫn đứng thẳng. Cổng vốn dành cho đoạn ngang bị xoay thành hình bậc thang. Cổng nay đứng thẳng, có chiều sâu theo hướng phải, lấy vị trí trực tiếp từ đầu tuyến; sprite xuất hiện đúng tại ngưỡng mở của cổng và được vẽ phía trước khung phía sau. Không teleport vào tuyến.
2. **Thành lệch/đường dư:** SVG cũ chạy từ x=-25 đến x=611, nhưng đường gameplay thực tế bắt đầu ở (45,134) và kết thúc tại (576,269) trong hệ map desktop. Thành cũ dựa vào baseX=603/baseY=326 và tâm bounding box, không dùng cửa; khi chuyển portrait các sai lệch tiếp tục bị xoay. Đường còn có góc bo riêng, không trùng hoàn toàn đường logic ở cua. Nay SVG và quái dùng cùng dữ liệu tuyến; đường dừng chính xác tại anchor cửa, không có đoạn kéo dài hay miếng nền che lỗi.
3. **Tuyến mới:** cổng trái trên → đoạn ngang sang phải → xuống → cua ngắn về trái → xuống → sang phải → vào ngưỡng cửa thành phía phải dưới. Cua được lấy mẫu từ đường cong bậc hai, dùng chung mẫu cho SVG và vị trí quái. Một đoạn cua ngắn đi về trái; sprite vẫn giữ hướng vẽ của atlas theo yêu cầu. Camera giữ một tỉ lệ đồng nhất, HUD và dock ở screen space. Pháo chuyển sang khoảng trống bên phải phần trên của tuyến. Nền rừng, texture, atlas, thành và pháo giữ nguyên file ảnh.
4. **Anchor cửa:** đo trên ảnh thành 512×512, ngưỡng tiếp giáp bậc cửa là (207,430), thay cho tâm ảnh. Portrait: spawn (${unit.geometry.spawn.x},${unit.geometry.spawn.y}), cửa (${unit.geometry.door.x},${unit.geometry.door.y}), thành rộng 170. Các lane hội tụ tại spawn và cửa; dọc đường lệch tối đa 9 đơn vị map, vẫn trong bề rộng đường 64. Desktop giữ đường gameplay hiện có và sửa đầu/cuối artwork tương ứng.
5. **Hướng nhìn:** không xoay theo tangent, không flip. Chỉ dùng tangent làm pháp tuyến cho lane. Giữ nguyên atlas Round 3.2, animation bước đi, neo chân 228/256, bóng và combat. Golem có đúng một thành phần ảnh đáng kể trên mỗi frame, không tái tạo asset.
6. **Clock/spawn:** quái đầu sau 2000ms; deadline sau cộng khoảng chặng, không cộng theo thời điểm callback đến trễ. Controller chia bước tới chính deadline nên không tích lũy sai số. Bỏ entry-clear gate gây trì hoãn khi golem đi chậm. Không thêm timeout spawn. Pause/background giữ game clock; resume đặt clock về controller.now. Frame đầu sau kích hoạt không cộng thời gian treo, delta dài bị chặn ở 100ms để tránh spawn bù khi mất frame. Thoát/dispose ngừng advance; restart đặt lại deadline, entity và ID. Chỉ chuyển chặng khi đủ spawned, processed, không còn enemy/shot. Deadline sáu phút giữ nguyên.

## Chiều dài và thời gian đến thành

Chiều dài logic trước/sau: **370 → 370**, thay đổi 0%. Mỗi mode dùng chung một controller và vận tốc cũ. Desktop có đường map dài 666; đường cong portrait đo theo cùng mẫu là **${unit.geometry.portraitRoadLength.toFixed(6)} đơn vị presentation**. Ánh xạ tiến trình 0…370 theo tổng độ dài mẫu bảo đảm tốc độ hiển thị đều dọc tuyến; đây là camera/presentation dành cho portrait, không phải thêm một bộ luật. Không dùng vận tốc mới để bù chiều dài.

| Quái | Vận tốc cũ (đơn vị logic/100ms) | Đi hết tuyến trước | Sau | Chênh |
|---|---:|---:|---:|---:|
| Scout | 1,3 | 28,461538s | 28,461538s | 0 |
| Slime tím | 1,0 | 37,000000s | 37,000000s | 0 |
| Golem | 0,7 | 52,857143s | 52,857143s | 0 |

Controller xử lý lọt thành trong bước tối đa 20ms, trừ 15 HP một lần và xóa entity. Bài kiểm thử kiểm tra repeated tick không trừ lại. Video thật có đủ 5 quái chặng 1 lọt thành, HP 100→25, sang chặng 2; không còn entity cũ sau thành.

## Bảng spawn 17 chặng chính

Đơn vị giây; mọi mốc tính từ lúc chặng bắt đầu, công thức cuối = 2 + (số quái − 1) × khoảng spawn. Hai cột đo dùng controller thật trong Jest và production browser, với đồng hồ mô phỏng được cập nhật ở các bước không đều 17/31/53ms; **không phải đo wall-clock toàn bộ 17 chặng trên thiết bị thật**. Kiểm tra từng timestamp của mọi quái, không chỉ đầu/cuối; sai số so deadline 0ms (sai số số thực browser <0,000001ms).

${table(unit.rows.filter(r=>r.mode!=='endless'))}

## Vô Tận

Số quái = 10 + floor((chặng−1)/3)×3. Khoảng spawn được tính bằng số nguyên: max(1000,1900−floor((chặng−1)/3)×100) ms. Bảng dưới là các mốc đo thực; production browser kiểm tra đủ chặng 1…31. Từ chặng 28 đạt sàn 1000ms và giữ sàn cho mọi chặng sau; chặng 1.000.000 có kiểm tra công thức riêng trong Jest, không mô phỏng một triệu chặng.

${table(unit.rows.filter(r=>r.mode==='endless'))}

Khoảng spawn chỉ mô tả thời gian xuất hiện quái. Chặng vẫn tiếp tục tới khi xử lý hết quái. Ví dụ Thử thách chặng 1 trong video: quái cuối xuất hiện 16s; golem sinh 9s chạm cửa khoảng 61,86s, sau đó mới chuyển chặng. Pause không tính vào game clock.

## Đo realtime trong video 1×

Thử thách chặng 1, chọn loại quái theo chuỗi xác định scout/slime/golem để có đủ bằng chứng. Không sửa tốc độ, HP, damage, lịch spawn; không nhảy clock, không dựng entity cho đoạn video này. Các ảnh kiểm tra layout và shot dùng fixture riêng, phân biệt với video.

| Quái | Loại | Deadline (s) | Game clock khi browser nhận cập nhật (s) | Trễ hiển thị (ms) |
|---:|---|---:|---:|---:|
${live.map(r=>`| ${r.id} | ${r.type} | ${sec(r.bornAt)} | ${(r.observedClock/1000).toFixed(6)} | ${(r.observedClock-r.bornAt).toFixed(3)} |`).join('\n')}

Độ trễ cập nhật quan sát được ${Math.min(...errors).toFixed(3)}…${Math.max(...errors).toFixed(3)}ms; các deadline sinh thực tế vẫn chính xác. File JSON lưu wall timestamp performance.now riêng. Pause khi đang chờ quái đầu, chờ hơn 3 giây rồi resume: clock không tăng và chưa sinh quái; khi tiếp tục quái đầu vẫn có bornAt=2000ms. Background được kiểm tra bằng visibilitychange trên web, foreground vẫn chờ người chơi resume và không spawn dồn.

## Kết quả kiểm thử

- TypeScript: PASS, chạy bằng bounded runner, timeout 120s.
- Jest toàn repository: **25 suites, 332/332 PASS**; có architecture/import checks, không sửa game khác.
- Jest module lần cuối: **8 suites, 101/101 PASS**, gồm bảng spawn, pause/restart/dispose, xử lý cửa thành, hướng/anchor, camera và combat.
- ESLint toàn repository: PASS, **0 error, 47 warning có sẵn ngoài Energy Defense**. Module thay đổi không còn warning.
- Production web export: PASS. Android Hermes export: PASS; chỉ chứng minh bundle/asset đóng gói được.
- Web E2E: **240/240 PASS**, 320×640, 360×640, 390×844, 412×915, tablet 768×1024, desktop 1440×1000. Không scroll ngang, mobile không scroll dọc, quái/công trình không bị HUD/dock che. Sample vị trí qua tuyến, sprite thẳng, bóng theo chân; impact sai lệch tối đa ${Math.max(...web.shot.filter(r=>r.opacity>.1).map(r=>r.error)).toFixed(6)} CSS px trong bài đo browser.
- Kiểm tra bổ sung trace browser: **48 chặng PASS** (17 chính + 31 Vô Tận), mọi timestamp/số lượng/không trùng bornAt khớp công thức.
- Asset validation: PASS, 12 frame. Golem validation: PASS, 4 frame đều 1 significant component, pivot [128,228].
- git diff --check: PASS. Thay đổi AGENTS.md, .agents và docs/references đã có từ trước được giữ nguyên.
- **Chưa nghiệm thu native:** không có điện thoại Android/iOS hoặc emulator/ADB khả dụng trong môi trường này. Web viewport, Android export và Jest không chứng minh hành vi trên Expo Go hay điện thoại thật. Chưa đo FPS native hoặc thao tác hệ thống Back/AppState thực trên Android.

Các lệnh kiểm tra dùng tests/run-bounded.mjs, tự ngừng tiến trình theo timeout; không tạo terminal tương tác hoặc chạy codex resume. Log đầy đủ trong [logs](logs/). Runner thực thi các entry: node_modules/typescript/bin/tsc --noEmit; node_modules/jest/bin/jest.js --runInBand --silent; node_modules/expo/bin/cli lint/export; tests/round35-e2e.mjs; các script validate Python. Không cài dependency, đổi shared API hoặc thực hiện thao tác ghi Git.

## Ảnh và video

- [Toàn cảnh 320×640](images/320x640.png), [360×640](images/360x640.png), [390×844](images/390x844.png), [412×915](images/412x915.png).
- [Cổng spawn](images/spawn-gate.png), [thành và cuối tuyến](images/castle-endpoint.png), [golem + quái tím](images/golem-purple-route.png).
- [Tablet](images/768x1024.png), [desktop](images/1440x1000.png), [pause khi chờ spawn](images/pause-pending-spawn.png).
- [Video production web 1×](${video.file}): ${video.capturedSeconds.toFixed(3)}s, ${video.capturedFrames} frame gốc, ${video.width}×${video.height}, không audio. Encode giữ timestamp gốc, không tăng tốc/nội suy; 30fps của encoder không phải FPS native đo được.
- Dữ liệu gốc: [Jest measurements](spawn-measurements.json), [web report + schedules + realtime stamps](web-report.json), [video metadata](video-metadata.json).

## File sửa/thêm

Tất cả đường dẫn dưới đây có tiền tố src/games/energy-defense/:

${files.map(f=>'- '+f).join('\n')}

Không sửa raster artwork, HUD fullscreen, math dock, công thức/số học, điểm, HP/damage/vận tốc, modal, lịch sử, shared API hoặc source hai game đua xe. Chỉ thay bố trí/căn anchor và khoảng spawn đã yêu cầu. File bitmap có checksum giữ nguyên trong Git.

## Nghiệm thu Expo Go còn lại

1. Mở dự án bằng Expo Go, vào Energy Defense; kiểm tra toàn tuyến và cổng trái/thành phải trên điện thoại portrait.
2. Khởi động chặng 1: quái ở 2s, 7s, 12s theo thời gian chơi; pause ở khoảng 1s rồi chờ 5s, resume còn khoảng 1s tới quái đầu.
3. Khi đang chờ spawn, đưa app ra nền 10s, trở lại và resume: không có quái xuất hiện dồn; kiểm tra nút Back hệ thống và thoát/restart.
4. Theo dõi golem và slime qua cua, bóng/neo chân và đạn; để một quái chạm cửa, xác nhận trừ 15 HP một lần, không còn sprite phía sau thành.
5. Chơi các chặng tiếp theo và Vô Tận để cảm nhận nhịp mới; bảng trên là khoảng sinh, không phải thời gian bắt buộc hoàn thành chặng.

Skill đã dùng (đọc trực tiếp bản cài trong dự án do không có trong session catalog): expo-2d-game-engine cho progress/clock và tọa độ; game-motion-camera cho tuyến/anchor/sprite; gameplay-native-qa cho lifecycle, regression và phân biệt web/export/native. Đã đối chiếu [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) và [Reanimated 4 useFrameCallback](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback/) với package/type cài thực tế (Expo 57.0.26, RN 0.86.3, Reanimated 4.5.5).
`;
await writeFile(out + '/REPORT_VI.md', report);
await writeFile(out + '/spawn-timing.csv', '\uFEFFmode,wave,count,intervalMs,firstMs,lastMs,measuredJestFirstMs,measuredJestLastMs,measuredWebFirstMs,measuredWebLastMs\n' + unit.rows.map(r=>{const b=browserRows(r.mode,r.wave);return [r.mode,r.wave,r.count,r.intervalMs,2000,r.lastMs,r.measuredMs[0],r.measuredMs.at(-1),b[0].relativeMs,b.at(-1).relativeMs].join(',');}).join('\n'));
console.log(JSON.stringify({ browserWavesVerified: browserWaves, report: out + '/REPORT_VI.md', rows: unit.rows.length, liveSpawnDelayMs: [Math.min(...errors),Math.max(...errors)] }));
