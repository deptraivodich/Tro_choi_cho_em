This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Game modules and parallel work

- Each game owns its source, components, logic, state, assets and tests under `src/games/<game-id>/`. Export its public screen from `index.ts`; keep the `{ onExit: () => void }` contract.
- Do not import another game's implementation or import the central game registry from a game module. Shared code under `src/shared/` must not import game modules; keep the dependency direction from games to shared.
- Keep one Expo Router in `src/app/`. Screens in game modules are implementations, not additional routers. See `docs/ARCHITECTURE.md` for registration and integration.
- Assign a separate branch/worktree and a separate game directory to each developer or agent. Create worktrees from the approved integration commit; uncommitted changes in another worktree are not inherited.
- Keep dependency installations and generated artifacts local to each worktree. Use distinct Metro/web ports when running both worktrees. Coordinate changes to `src/games/registry.ts`, `src/shared/types/index.ts`, shared APIs and package/config files during integration.
- Preserve existing working changes. Do not reset, overwrite unrelated work, commit or push unless the user authorizes it. Avoid broad `git add .`; review an explicit file list, including both old and new paths for moves.
- Validate the affected game, architecture/import checks, typecheck and lint before handing changes back. Report remaining warnings and distinguish bundle checks from runtime checks on actual devices.
