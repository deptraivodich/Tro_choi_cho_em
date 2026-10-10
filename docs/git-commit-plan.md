# Dự kiến commit — chờ người dùng duyệt

Chưa commit, push, tạo branch/worktree hoặc stage vào index thật. Preview dùng index tạm ngoài repository; index thật không chứa thay đổi staged. Không reset, force push, xóa cache/debug hoặc thay đổi gameplay của game khác trong lần preflight.

Title đề xuất: `fix(race-to-finish): stabilize turns, add grade 5 math and isolate game modules`

Bao gồm các thay đổi gameplay race, di chuyển kiến trúc đa game/assets, tests, tooling, tài liệu và hướng dẫn module/worktree. Giữ các thay đổi race đã có trước nhiệm vụ; không tách bỏ chúng vì chúng nằm trong cùng code được sửa và đã được kiểm tra.

## Git hiện tại

- Branch `main`, HEAD `cd26e6ce4ca357dd90298a9bbd60c06e3500f929` (`feat: hoan thien 10 tro choi toan hoc 2D offline va che do dua ve dich`). So với ref `origin/main` hiện có trên máy: ahead 0 / behind 0. Không fetch trong lần này, nên đây không phải xác nhận trạng thái server từ xa mới nhất.
- Một worktree: `C:/Tro_choi_cho_em`. Chưa có worktree Antigravity, merge conflict hoặc file staged.
- Working tree: 10 modified, 125 deleted ở vị trí cũ, 162 untracked ở vị trí mới, tổng 297 path. `src/app/_layout.tsx` hiện được status báo modified nhưng diff nội dung sau chuẩn hóa Git rỗng; không đưa path này vào danh sách stage.
- Preview có 189 entry: 9 modified, 55 added, 107 rename, 18 deleted. 18 deleted là các entry/hook/engine/board/test cũ có bản thay thế ở module mới nhưng Git không ghép thành rename theo heuristic; không phải xóa tính năng.
- [Manifest stage dự kiến](git-commit-files.txt) có **296 path**, bao gồm cả old/new path cho di chuyển. Chỉ sử dụng manifest sau khi người dùng duyệt; không dùng `git add .`.

## File dự kiến đưa vào commit

| Nhóm | Path trong manifest | Nội dung |
| --- | ---: | --- |
| Root/config và vị trí root cũ | 13 | `.gitignore`, `AGENTS.md`, `README.md`, `eslint.config.js`, `jest.config.js`, `package.json`, `package-lock.json`, `tsconfig.json`; old path của App.tsx/index.ts và ba tài liệu di chuyển |
| Assets cũ | 58 | Old path `assets/games/race-to-finish/**`, đi cùng new path dưới module race |
| Source cũ | 62 | Old path `src/features/training-games/**` |
| Race | 91 | `src/games/race-to-finish/**`: source, assets, generator, reducer/controller, tests |
| Module khác và registry | 23 | `src/games/index.ts`, registry, entry/screen của từng game, GameArt của Energy Defense |
| Shared | 25 | UI, timer, math, storage, audio, theme, types và tests |
| Route/lobby | 3 | `src/app/index.tsx`, `src/app/games/[gameId].tsx`, `src/screens/TrainingGamesHome.tsx` |
| Công cụ UI | 4 | `scripts/lib/cdp.mjs`, `scripts/race-e2e.mjs`, `scripts/navigation-e2e.mjs`, `scripts/serve-web.mjs` |
| Docs/ảnh nghiệm thu | 17 | Tài liệu mới/di chuyển, template lưu trữ, năm screenshot nghiệm thu; gồm các file preflight này |

Danh sách rename/add/delete từng file được ghi ở phần cuối tài liệu này. `.txt` là danh sách path nguyên văn để review/stage chính xác, không chứa cache hoặc output.

Bộ ảnh runtime và raw artwork đã được track trước task được giữ cùng module. Cả 57 PNG đã track được đối chiếu byte-for-byte với HEAD ở vị trí cũ. Asset manifest JSON không đổi nội dung, chỉ khác line ending; integration guide cập nhật đường dẫn module. Những ảnh bàn và modal đã untracked trước task nhưng được game sử dụng/giữ như tài nguyên gốc cũng nằm trong manifest; không phải screenshot debug.

## Loại trừ, giữ nguyên trên máy

- `node_modules/`, `.expo/`, `dist/`, `web-build/`, `coverage/`, `.eslintcache`, `*.tsbuildinfo` và log/cache build.
- `.chrome-cdp/`, `.chrome-cdp-journey/`, `.chrome-cdp-play/`, `.chrome-cdp-play2/`, `.chrome-cdp-real/`, `.chrome-tmp/` và các profile `.chrome-*`.
- `docs/debug/` (scratch_nodes.json/dom_dump.html), `docs/screenshots/legacy/`, `artifacts/` (log, JSON, screenshot tự sinh và commit-preview.diff).
- `src/app/_layout.tsx`: status khác nhưng không có diff nội dung để commit.
- Script debug cũ đang được track và không thay đổi không thuộc commit này; không xóa chúng.

`git check-ignore` đã xác nhận cache/debug bị ignore. `git ls-files -ci --exclude-standard` không có kết quả: không thấy file đã track mà hiện thuộc các rule ignore. Runtime assets trong module và screenshot nghiệm thu trong docs không bị ignore. `.gitignore` hiện phù hợp, không cần mở rộng thành `*.png`/`*.json` gây bỏ sót assets.

## 65 warning còn tồn tại

[Phân tích từng nhóm](git-lint-review.md): 50 unused, 4 exhaustive-deps, 1 immutability, 10 purity. Ưu tiên Energy Defense stale closure/side effect và Floating Market shuffle trong render. Một số Date.now/Math.random nằm trong handler; không kết luận chúng chạy ngay ở render chỉ dựa trên diagnostic. Race chỉ có hai warning unused, không có warning Hooks/state/animation. Không hạ mức hoặc tắt thêm các rule gameplay để che lỗi.

Lint toàn repo ban đầu tìm thêm 19 lỗi Buffer ở script Node mà Expo lint mặc định không quét. Đã khai báo Node global Buffer trong config, không sửa các script cũ; sau sửa cả hai cách lint đều exit 0.

## Kiểm tra đã chạy lại trong lần preflight

- Typecheck PASS.
- Expo lint (`npm run lint -- --no-cache`) và full-repository ESLint (`node node_modules/eslint/bin/eslint.js . --no-cache`) PASS: 0 errors, 65 warnings.
- Jest: **9 suites / 86 tests PASS**. Thêm một test kiểm tra shared không phụ thuộc games/screens/router.
- Export `--platform all`: web JS + Android/iOS Hermes bundles PASS. Native device runtime chưa kiểm tra.
- `npm ls --depth=0`: PASS. Direct runtime dependencies/versions giữ nguyên; dev tooling thay đổi như đã báo cáo. Lockfile có 255 thay đổi version entry do ESLint/Jest dependency resolution; đây không phải 255 nâng cấp runtime game.
- Import/source/asset resolution và kiến trúc đều pass. Kiểm tra rộng thêm cả require/dynamic import/alias không thấy cross-game hoặc shared→game dependency. Gameplay body của cả 10 game ngoài race giống HEAD sau khi loại bỏ import và chuẩn hóa JSX quote.
- `git diff --check` với **preview chứa cả file mới** PASS sau khi bỏ một blank line thừa ở cuối types/index.ts của race. Chỉ kiểm tra diff working tree cũ sẽ bỏ qua file untracked nên chưa đủ.
- UI gameplay không chạy lại trong preflight vì không đổi gameplay; kết quả 152/45 UI checks và 9 game navigation của lần nghiệm thu trước nằm trong [race-verification.md](race-verification.md).

Log chi tiết ở `artifacts/git-review/`, không đưa vào commit. Ngoài report/manifest, preflight chỉ thay đổi AGENTS.md, eslint.config.js, architecture.test.ts và một dòng trắng EOF của race types.

## Antigravity và worktree

Kiến trúc không có import chéo game; mỗi game giữ state/assets/tests riêng và public screen nhận `{ onExit }`. Một Expo Router. Shared APIs và union GameId giữ contract hiện tại; thêm game chỉ cần tích hợp entry/metadata ở registry và ID trong shared types. Các file trung tâm này vẫn là điểm phối hợp khi merge, không thể bảo đảm không có conflict nếu hai người sửa cùng một đoạn.

AGENTS.md đã bổ sung quy tắc sở hữu module, chiều dependency, review/stage rõ file, worktree/branch và port riêng. `.gitignore` loại các artifact cục bộ và không bỏ assets của game mới.

**Chưa tạo worktree bây giờ:** worktree từ HEAD hiện tại chỉ chứa code trước refactor. Sau khi người dùng duyệt và commit bộ thay đổi này, lấy hash commit đã duyệt làm base. Ví dụ sau đó (chưa thực thi):

```powershell
git worktree add -b antigravity/new-game C:\Tro_choi_cho_em-antigravity HASH_COMMIT_DA_DUYET
cd C:\Tro_choi_cho_em-antigravity
npm ci
npx expo start --web --port 8092
```

Codex dùng worktree hiện tại hoặc worktree riêng trên branch khác, port 8090. Antigravity chỉ chỉnh module game mới; phối hợp các thay đổi registry/GameId/shared/package tại bước tích hợp. Mỗi worktree có node_modules/cache riêng. Thư mục worktree sibling nằm ngoài repository nên không lẫn vào commit.

## Commit message dự kiến

```text
fix(race-to-finish): stabilize turns, add grade 5 math and isolate game modules

Persist tile/path state through guarded turn transitions and animation callbacks.
Gate movement on generated grade 5 math and use shuffled 4/5 bot answer bags.
Animate overlapping tokens and reward reels with locked, once-only outcomes.
Move each game and its assets into an independent module with shared utilities.
Add regression/UI tooling, architecture checks and development guidance.
```

Đây là nội dung dự kiến để duyệt; không có commit nào được tạo trong lần này.

## Chi tiết diff dự kiến

`Rxxx` là similarity do Git nhận diện; D/A còn lại vẫn có thể là file di chuyển rồi sửa lớn.

| Trạng thái | Path cũ | Path mới / modified |
| --- | --- | --- |
| M | `` | `.gitignore` |
| M | `` | `AGENTS.md` |
| M | `` | `README.md` |
| A | `` | `docs/ARCHITECTURE.md` |
| R100 | `GAME_DESIGN.md` | `docs/GAME_DESIGN.md` |
| R092 | `INTEGRATION_GUIDE.md` | `docs/INTEGRATION_GUIDE.md` |
| R100 | `TEST_REPORT.md` | `docs/TEST_REPORT.md` |
| R100 | `App.tsx` | `docs/archive/expo-template/App.tsx` |
| R100 | `index.ts` | `docs/archive/expo-template/index.ts` |
| A | `` | `docs/changed-files.md` |
| A | `` | `docs/git-commit-files.txt` |
| A | `` | `docs/git-commit-plan.md` |
| A | `` | `docs/git-lint-review.md` |
| A | `` | `docs/race-audit.md` |
| A | `` | `docs/race-verification.md` |
| A | `` | `docs/screenshots/race-reduced-result.png` |
| A | `` | `docs/screenshots/race-small-board.png` |
| A | `` | `docs/screenshots/race-small-question.png` |
| A | `` | `docs/screenshots/race-spinning.png` |
| A | `` | `docs/screenshots/race-victory.png` |
| A | `` | `eslint.config.js` |
| M | `` | `jest.config.js` |
| M | `` | `package-lock.json` |
| M | `` | `package.json` |
| A | `` | `scripts/lib/cdp.mjs` |
| A | `` | `scripts/navigation-e2e.mjs` |
| A | `` | `scripts/race-e2e.mjs` |
| A | `` | `scripts/serve-web.mjs` |
| M | `` | `src/app/games/[gameId].tsx` |
| M | `` | `src/app/index.tsx` |
| D | `src/features/training-games/__tests__/race_to_finish.test.ts` | `` |
| D | `src/features/training-games/games/block-island/index.ts` | `` |
| D | `src/features/training-games/games/energy-defense/index.ts` | `` |
| D | `src/features/training-games/games/floating-market/index.ts` | `` |
| D | `src/features/training-games/games/planet-rescue/index.ts` | `` |
| D | `src/features/training-games/games/race-to-finish/RaceToFinishScreen.tsx` | `` |
| D | `src/features/training-games/games/race-to-finish/assets.ts` | `` |
| D | `src/features/training-games/games/race-to-finish/boardConfig.ts` | `` |
| D | `src/features/training-games/games/race-to-finish/components/GameBoardView.tsx` | `` |
| D | `src/features/training-games/games/race-to-finish/gameEngine.ts` | `` |
| D | `src/features/training-games/games/race-to-finish/index.ts` | `` |
| D | `src/features/training-games/games/race-to-finish/useRaceGame.ts` | `` |
| D | `src/features/training-games/games/rhythm-bakery/index.ts` | `` |
| D | `src/features/training-games/games/royal-artillery/index.ts` | `` |
| D | `src/features/training-games/games/space-pets/index.ts` | `` |
| D | `src/features/training-games/games/terrain-racing/index.ts` | `` |
| D | `src/features/training-games/games/treasure-dive/index.ts` | `` |
| D | `src/features/training-games/games/vault-code/index.ts` | `` |
| A | `` | `src/games/block-island/index.ts` |
| R097 | `src/features/training-games/games/block-island/BlockIslandScreen.tsx` | `src/games/block-island/screens/BlockIslandScreen.tsx` |
| R100 | `src/features/training-games/components/GameArt.tsx` | `src/games/energy-defense/components/GameArt.tsx` |
| A | `` | `src/games/energy-defense/index.ts` |
| R097 | `src/features/training-games/games/energy-defense/EnergyDefenseScreen.tsx` | `src/games/energy-defense/screens/EnergyDefenseScreen.tsx` |
| A | `` | `src/games/floating-market/index.ts` |
| R097 | `src/features/training-games/games/floating-market/FloatingMarketScreen.tsx` | `src/games/floating-market/screens/FloatingMarketScreen.tsx` |
| A | `` | `src/games/index.ts` |
| A | `` | `src/games/planet-rescue/index.ts` |
| R096 | `src/features/training-games/games/planet-rescue/PlanetRescueScreen.tsx` | `src/games/planet-rescue/screens/PlanetRescueScreen.tsx` |
| R100 | `assets/games/race-to-finish/background.png` | `src/games/race-to-finish/assets/background.png` |
| R100 | `assets/games/race-to-finish/characters/bunny_avatar.png` | `src/games/race-to-finish/assets/characters/bunny_avatar.png` |
| R100 | `assets/games/race-to-finish/characters/bunny_idle_1.png` | `src/games/race-to-finish/assets/characters/bunny_idle_1.png` |
| R100 | `assets/games/race-to-finish/characters/bunny_idle_2.png` | `src/games/race-to-finish/assets/characters/bunny_idle_2.png` |
| R100 | `assets/games/race-to-finish/characters/bunny_penalty.png` | `src/games/race-to-finish/assets/characters/bunny_penalty.png` |
| R100 | `assets/games/race-to-finish/characters/bunny_victory.png` | `src/games/race-to-finish/assets/characters/bunny_victory.png` |
| R100 | `assets/games/race-to-finish/characters/bunny_walk_1.png` | `src/games/race-to-finish/assets/characters/bunny_walk_1.png` |
| R100 | `assets/games/race-to-finish/characters/bunny_walk_2.png` | `src/games/race-to-finish/assets/characters/bunny_walk_2.png` |
| R100 | `assets/games/race-to-finish/characters/fox_avatar.png` | `src/games/race-to-finish/assets/characters/fox_avatar.png` |
| R100 | `assets/games/race-to-finish/characters/fox_idle_1.png` | `src/games/race-to-finish/assets/characters/fox_idle_1.png` |
| R100 | `assets/games/race-to-finish/characters/fox_idle_2.png` | `src/games/race-to-finish/assets/characters/fox_idle_2.png` |
| R100 | `assets/games/race-to-finish/characters/fox_penalty.png` | `src/games/race-to-finish/assets/characters/fox_penalty.png` |
| R100 | `assets/games/race-to-finish/characters/fox_victory.png` | `src/games/race-to-finish/assets/characters/fox_victory.png` |
| R100 | `assets/games/race-to-finish/characters/fox_walk_1.png` | `src/games/race-to-finish/assets/characters/fox_walk_1.png` |
| R100 | `assets/games/race-to-finish/characters/fox_walk_2.png` | `src/games/race-to-finish/assets/characters/fox_walk_2.png` |
| R100 | `assets/games/race-to-finish/characters/penguin_avatar.png` | `src/games/race-to-finish/assets/characters/penguin_avatar.png` |
| R100 | `assets/games/race-to-finish/characters/penguin_idle_1.png` | `src/games/race-to-finish/assets/characters/penguin_idle_1.png` |
| R100 | `assets/games/race-to-finish/characters/penguin_idle_2.png` | `src/games/race-to-finish/assets/characters/penguin_idle_2.png` |
| R100 | `assets/games/race-to-finish/characters/penguin_penalty.png` | `src/games/race-to-finish/assets/characters/penguin_penalty.png` |
| R100 | `assets/games/race-to-finish/characters/penguin_victory.png` | `src/games/race-to-finish/assets/characters/penguin_victory.png` |
| R100 | `assets/games/race-to-finish/characters/penguin_walk_1.png` | `src/games/race-to-finish/assets/characters/penguin_walk_1.png` |
| R100 | `assets/games/race-to-finish/characters/penguin_walk_2.png` | `src/games/race-to-finish/assets/characters/penguin_walk_2.png` |
| R100 | `assets/games/race-to-finish/characters/turtle_avatar.png` | `src/games/race-to-finish/assets/characters/turtle_avatar.png` |
| R100 | `assets/games/race-to-finish/characters/turtle_idle_1.png` | `src/games/race-to-finish/assets/characters/turtle_idle_1.png` |
| R100 | `assets/games/race-to-finish/characters/turtle_idle_2.png` | `src/games/race-to-finish/assets/characters/turtle_idle_2.png` |
| R100 | `assets/games/race-to-finish/characters/turtle_penalty.png` | `src/games/race-to-finish/assets/characters/turtle_penalty.png` |
| R100 | `assets/games/race-to-finish/characters/turtle_victory.png` | `src/games/race-to-finish/assets/characters/turtle_victory.png` |
| R100 | `assets/games/race-to-finish/characters/turtle_walk_1.png` | `src/games/race-to-finish/assets/characters/turtle_walk_1.png` |
| R100 | `assets/games/race-to-finish/characters/turtle_walk_2.png` | `src/games/race-to-finish/assets/characters/turtle_walk_2.png` |
| R100 | `assets/games/race-to-finish/dice/dice_1.png` | `src/games/race-to-finish/assets/dice/dice_1.png` |
| R100 | `assets/games/race-to-finish/dice/dice_2.png` | `src/games/race-to-finish/assets/dice/dice_2.png` |
| R100 | `assets/games/race-to-finish/dice/dice_3.png` | `src/games/race-to-finish/assets/dice/dice_3.png` |
| R100 | `assets/games/race-to-finish/dice/dice_4.png` | `src/games/race-to-finish/assets/dice/dice_4.png` |
| R100 | `assets/games/race-to-finish/dice/dice_5.png` | `src/games/race-to-finish/assets/dice/dice_5.png` |
| R100 | `assets/games/race-to-finish/dice/dice_6.png` | `src/games/race-to-finish/assets/dice/dice_6.png` |
| A | `` | `src/games/race-to-finish/assets/index.ts` |
| R100 | `assets/games/race-to-finish/items/back_arrow.png` | `src/games/race-to-finish/assets/items/back_arrow.png` |
| R100 | `assets/games/race-to-finish/items/cleanse.png` | `src/games/race-to-finish/assets/items/cleanse.png` |
| R100 | `assets/games/race-to-finish/items/dice_base.png` | `src/games/race-to-finish/assets/items/dice_base.png` |
| R100 | `assets/games/race-to-finish/items/hourglass.png` | `src/games/race-to-finish/assets/items/hourglass.png` |
| R100 | `assets/games/race-to-finish/items/mockup_dice_sample.png` | `src/games/race-to-finish/assets/items/mockup_dice_sample.png` |
| R100 | `assets/games/race-to-finish/items/portal.png` | `src/games/race-to-finish/assets/items/portal.png` |
| R100 | `assets/games/race-to-finish/items/shield.png` | `src/games/race-to-finish/assets/items/shield.png` |
| R100 | `assets/games/race-to-finish/items/trophy.png` | `src/games/race-to-finish/assets/items/trophy.png` |
| R100 | `assets/games/race-to-finish/items/wing.png` | `src/games/race-to-finish/assets/items/wing.png` |
| R100 | `assets/games/race-to-finish/manifest.json` | `src/games/race-to-finish/assets/manifest.json` |
| A | `` | `src/games/race-to-finish/assets/map_landscape.png` |
| R100 | `assets/games/race-to-finish/raw/background.png` | `src/games/race-to-finish/assets/raw/background.png` |
| R100 | `assets/games/race-to-finish/raw/background_mockup.png` | `src/games/race-to-finish/assets/raw/background_mockup.png` |
| R100 | `assets/games/race-to-finish/raw/item.png` | `src/games/race-to-finish/assets/raw/item.png` |
| R100 | `assets/games/race-to-finish/raw/model_nv.png` | `src/games/race-to-finish/assets/raw/model_nv.png` |
| R100 | `assets/games/race-to-finish/raw/sample_tile8.png` | `src/games/race-to-finish/assets/raw/sample_tile8.png` |
| R100 | `assets/games/race-to-finish/tiles/tile_bonus.png` | `src/games/race-to-finish/assets/tiles/tile_bonus.png` |
| R100 | `assets/games/race-to-finish/tiles/tile_finish.png` | `src/games/race-to-finish/assets/tiles/tile_finish.png` |
| R100 | `assets/games/race-to-finish/tiles/tile_neutral.png` | `src/games/race-to-finish/assets/tiles/tile_neutral.png` |
| R100 | `assets/games/race-to-finish/tiles/tile_penalty.png` | `src/games/race-to-finish/assets/tiles/tile_penalty.png` |
| R100 | `assets/games/race-to-finish/ui/header_sign.png` | `src/games/race-to-finish/assets/ui/header_sign.png` |
| R100 | `assets/games/race-to-finish/ui/header_sign_raw.png` | `src/games/race-to-finish/assets/ui/header_sign_raw.png` |
| A | `` | `src/games/race-to-finish/assets/ui/modal_bonus_frame.png` |
| A | `` | `src/games/race-to-finish/assets/ui/modal_penalty_frame.png` |
| R100 | `assets/games/race-to-finish/ui/start_board.png` | `src/games/race-to-finish/assets/ui/start_board.png` |
| R100 | `assets/games/race-to-finish/ui/start_board_raw.png` | `src/games/race-to-finish/assets/ui/start_board_raw.png` |
| A | `` | `src/games/race-to-finish/components/AnimatedToken.tsx` |
| R097 | `src/features/training-games/games/race-to-finish/components/CleanseChoiceModal.tsx` | `src/games/race-to-finish/components/CleanseChoiceModal.tsx` |
| A | `` | `src/games/race-to-finish/components/ForkChoiceModal.tsx` |
| A | `` | `src/games/race-to-finish/components/GameBoardView.tsx` |
| A | `` | `src/games/race-to-finish/components/MathQuestionModal.tsx` |
| A | `` | `src/games/race-to-finish/components/MysteryRollModal.tsx` |
| R092 | `src/features/training-games/games/race-to-finish/components/PlayerBanner.tsx` | `src/games/race-to-finish/components/PlayerBanner.tsx` |
| R094 | `src/features/training-games/games/race-to-finish/components/SetupModal.tsx` | `src/games/race-to-finish/components/SetupModal.tsx` |
| R084 | `src/features/training-games/games/race-to-finish/components/TurnDashboard.tsx` | `src/games/race-to-finish/components/TurnDashboard.tsx` |
| R094 | `src/features/training-games/games/race-to-finish/components/TurnHandoverModal.tsx` | `src/games/race-to-finish/components/TurnHandoverModal.tsx` |
| R086 | `src/features/training-games/games/race-to-finish/components/VictoryModal.tsx` | `src/games/race-to-finish/components/VictoryModal.tsx` |
| A | `` | `src/games/race-to-finish/data/boardConfig.ts` |
| A | `` | `src/games/race-to-finish/hooks/useRaceGame.ts` |
| A | `` | `src/games/race-to-finish/hooks/useReducedMotion.ts` |
| A | `` | `src/games/race-to-finish/index.ts` |
| A | `` | `src/games/race-to-finish/logic/exactAnswer.ts` |
| A | `` | `src/games/race-to-finish/logic/gameEngine.ts` |
| A | `` | `src/games/race-to-finish/logic/questions.ts` |
| A | `` | `src/games/race-to-finish/logic/reelPlan.ts` |
| A | `` | `src/games/race-to-finish/logic/tokenPlacement.ts` |
| A | `` | `src/games/race-to-finish/screens/RaceToFinishScreen.tsx` |
| A | `` | `src/games/race-to-finish/state/RaceController.ts` |
| A | `` | `src/games/race-to-finish/state/raceReducer.ts` |
| A | `` | `src/games/race-to-finish/tests/animation.test.tsx` |
| A | `` | `src/games/race-to-finish/tests/controller.test.ts` |
| A | `` | `src/games/race-to-finish/tests/questions.test.ts` |
| A | `` | `src/games/race-to-finish/tests/raceFlow.test.ts` |
| A | `` | `src/games/race-to-finish/tests/race_to_finish.test.ts` |
| R050 | `src/features/training-games/games/race-to-finish/types.ts` | `src/games/race-to-finish/types/index.ts` |
| R086 | `src/features/training-games/registry.ts` | `src/games/registry.ts` |
| A | `` | `src/games/rhythm-bakery/index.ts` |
| R096 | `src/features/training-games/games/rhythm-bakery/RhythmBakeryScreen.tsx` | `src/games/rhythm-bakery/screens/RhythmBakeryScreen.tsx` |
| A | `` | `src/games/royal-artillery/index.ts` |
| R097 | `src/features/training-games/games/royal-artillery/RoyalArtilleryScreen.tsx` | `src/games/royal-artillery/screens/RoyalArtilleryScreen.tsx` |
| A | `` | `src/games/space-pets/index.ts` |
| R097 | `src/features/training-games/games/space-pets/SpacePetsScreen.tsx` | `src/games/space-pets/screens/SpacePetsScreen.tsx` |
| A | `` | `src/games/terrain-racing/index.ts` |
| R096 | `src/features/training-games/games/terrain-racing/TerrainRacingScreen.tsx` | `src/games/terrain-racing/screens/TerrainRacingScreen.tsx` |
| A | `` | `src/games/treasure-dive/index.ts` |
| R096 | `src/features/training-games/games/treasure-dive/TreasureDiveScreen.tsx` | `src/games/treasure-dive/screens/TreasureDiveScreen.tsx` |
| A | `` | `src/games/vault-code/index.ts` |
| R097 | `src/features/training-games/games/vault-code/VaultCodeScreen.tsx` | `src/games/vault-code/screens/VaultCodeScreen.tsx` |
| R096 | `src/features/training-games/TrainingGamesHome.tsx` | `src/screens/TrainingGamesHome.tsx` |
| R100 | `src/features/training-games/core/audioController.ts` | `src/shared/audio/audioController.ts` |
| R100 | `src/features/training-games/components/FractionView.tsx` | `src/shared/components/FractionView.tsx` |
| R096 | `src/features/training-games/components/GameCard.tsx` | `src/shared/components/GameCard.tsx` |
| R097 | `src/features/training-games/components/GameHeader.tsx` | `src/shared/components/GameHeader.tsx` |
| R099 | `src/features/training-games/components/GameIcons.tsx` | `src/shared/components/GameIcons.tsx` |
| R099 | `src/features/training-games/components/GameModal.tsx` | `src/shared/components/GameModal.tsx` |
| R100 | `src/features/training-games/components/TimerBar.tsx` | `src/shared/components/TimerBar.tsx` |
| R094 | `src/features/training-games/core/game-loop/useGameTimer.ts` | `src/shared/hooks/useGameTimer.ts` |
| R100 | `src/features/training-games/core/math/angle.ts` | `src/shared/math/angle.ts` |
| R100 | `src/features/training-games/core/math/decimal.ts` | `src/shared/math/decimal.ts` |
| R100 | `src/features/training-games/core/math/fraction.ts` | `src/shared/math/fraction.ts` |
| R100 | `src/features/training-games/core/math/generators.ts` | `src/shared/math/generators.ts` |
| R100 | `src/features/training-games/core/math/geometry.ts` | `src/shared/math/geometry.ts` |
| R100 | `src/features/training-games/core/math/prng.ts` | `src/shared/math/prng.ts` |
| R100 | `src/features/training-games/core/math/units.ts` | `src/shared/math/units.ts` |
| R100 | `src/features/training-games/storage/localStorageAdapter.ts` | `src/shared/storage/localStorageAdapter.ts` |
| R099 | `src/features/training-games/storage/profileManager.ts` | `src/shared/storage/profileManager.ts` |
| R100 | `src/features/training-games/storage/storageAdapter.ts` | `src/shared/storage/storageAdapter.ts` |
| A | `` | `src/shared/tests/architecture.test.ts` |
| R099 | `src/features/training-games/__tests__/generator_sampling.test.ts` | `src/shared/tests/generator_sampling.test.ts` |
| R095 | `src/features/training-games/__tests__/math_core.test.ts` | `src/shared/tests/math_core.test.ts` |
| R096 | `src/features/training-games/__tests__/storage_and_games.test.ts` | `src/shared/tests/storage_and_games.test.ts` |
| R100 | `src/features/training-games/theme/colors.ts` | `src/shared/theme/colors.ts` |
| R100 | `src/features/training-games/theme/gamePalettes.ts` | `src/shared/theme/gamePalettes.ts` |
| R100 | `src/features/training-games/types.ts` | `src/shared/types/index.ts` |
| M | `` | `tsconfig.json` |
