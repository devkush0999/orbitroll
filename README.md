# Orbit Roll

A space puzzle game built with **Expo SDK 57**, **React Native 0.86.3**, and TypeScript. Roll a cube along floating isometric platforms, collect three crystals, and reach the portal. There are **18 handcrafted levels**: six original trails and 12 vertical expeditions with upper/lower decks, broken bridges, gravity landings, and lifts. Levels 1 and 7 are chapter entry points; subsequent levels unlock sequentially. Existing progress and preferences remain saved on the device.

## Run

Use Node **22.13 or newer** (Node 22 LTS recommended).

```sh
npm ci
npm start
```

For the native experience, create a development build:

```sh
npm run ios       # macOS, Xcode, and an iOS simulator required
npm run android   # Android Studio SDK and an emulator/device required
```

After installing the development build, `npm start` reconnects it to Metro. A compatible SDK 57 Expo Go client may also work; use `npx expo start --go` to select it. The development build is the reliable baseline for the native animation dependencies.

Browser preview: `npm run web`. CanvasKit is copied locally during installation, so Skia does not depend on a third-party CDN. Production web hosts must rewrite route requests (for example `/play/1`) to `index.html`.

Fullscreen and the launch splash use `expo-navigation-bar` and `expo-splash-screen`. After pulling these changes, install dependencies and rebuild your iOS/Android development client (`npm run ios` / `npm run android`) to include the native modules and splash configuration.

## Play

The presentation follows the [design direction](DESIGN.md): a real preview of the next trail on Home, route shapes in the level list, a compact gameplay HUD, and staggered earned-star feedback. Home's primary action starts the next unfinished trail; all-trail navigation, the practice guide, and the vertical chapter remain available.

- Swipe diagonally in the direction of the next tile, or use the four arrow buttons.
- Northeast: north; northwest: west; southeast: east; southwest: south.
- Swipe **straight up/down** on a cyan lift pad to rise/descend without buttons. Vertical strokes elsewhere do nothing; nearly horizontal strokes are ignored to avoid ambiguous rolls. Short/Balanced/Long swipe distances are configurable.
- Tap **expand** at the top left for fullscreen. Tap **contract** to leave it; pause stays at the top right. The controller/hand icon shows or hides buttons. Fullscreen reserves space for the HUD and controls so they do not cover the active route. On supported browsers, a user tap also requests browser fullscreen; otherwise the expanded app layout still works.
- Settings can default to fullscreen and gestures. Screen readers keep accessible buttons available and can also use the board's named movement actions. Small screens use a compact HUD.
- On web, use arrows or WASD. Q / Page Up uses a lift upward; E / Page Down uses it downward. Escape opens pause.
- Choose **Vertical expeditions** on the home screen to start level 7 immediately.
- Gold arrows mark broken edges with a landing platform below. Roll toward the arrow: the cube finishes its rotation, falls vertically, lands on the highest aligned platform below, and can then keep rolling. Dotted lines identify the intended drop shaft.
- Cyan rings mark lift stations. The **Rise** and **Down** buttons activate only when that station has a connected platform in the corresponding direction. The cube cannot fly freely or climb a platform's solid side.
- Falling off an edge without an aligned platform below ends the attempt. A platform farther sideways does not catch the cube. Retry restores the starting height and clears the trail.
- Only three upcoming tiles assemble ahead of the cube, with a short fading trail behind it. Backtracking restores nearby tiles. A smooth camera follows this local section, keeping upcoming landing platforms in view; old upper decks fade further to avoid obscuring lower paths. Altitude is shown above the board.
- Brighter platform surfaces and rails separate the route from space. A white outline marks the next tile; white chevrons show the route's turns, while gold chevrons mark drops. Gameplay hints give the next swipe direction. After landing, the camera frames the lower trail and removes the completed drop guide.
- Collect crystals and roll into the portal to finish. Three stars require all crystals and at most three extra moves beyond the shortest authored trail.
- The completion screen names the next trail and offers **Play level XX**. One tap starts that trail with a fresh cube, timer, and crystal count, preserving the expanded/standard game layout. The final level returns to the level map. Repeated next-level taps are guarded during navigation.
- Pausing or backgrounding stops the timer. An in-flight roll/drop/lift completes safely before the pause overlay opens. Inputs remain locked throughout the transfer; rewards and progress commit only after landing. Restart/unmount invalidates pending animation callbacks.
- Switch between Deep Space, Aurora Drift, and Solar Dusk in settings. Haptics and reduced motion are configurable; system reduced motion is also respected during gameplay.

## First launch and settings

New players see a three-step introduction with 3D trail artwork and a control preference selector. Completing it opens the separate **How to play** guide; players can also skip into the universe. Replay the welcome screens from **Settings → Replay introduction**. Existing saves with completed levels retain their progress and skip the new introduction. A branded loading screen covers storage/font preparation, and the browser board has a separate trail-loading state. Route errors offer a retry action without exposing internal error details.

The `/how-to-play` route is available from Home and Settings. Four practice lessons teach diagonal rolling, bidirectional lifts, gravity drops, and crystal collection/portals. Practice uses the production movement hook with `recordProgress: false` and independent lesson IDs, so it does not award stars or unlock levels. Players can use swipes or labeled buttons, resume after backgrounding, retry a miss, and start their next unfinished level. Scrolling is suspended only while touching the practice board, so vertical lift gestures can be used inside the scrollable guide. Additional cards explain fullscreen, safe landings, settings, and keyboard controls during real levels.

Settings contains live theme previews, progress totals, fullscreen/control preferences, swipe distance, hints, haptics, reduced motion, a local-data explanation, and separately confirmed resets for preferences and journey records. Restoring preferences preserves records and tutorial completion. Preferences are validated when loading older saves; serial writes expose saving/error status with retry. No accounts, telemetry, cloud saves, or fabricated support links are added.

## Structure

```text
src/app/                   Expo Router typed file-based routes
  _layout.tsx              Fonts, Redux provider, hydration, navigation
  index.tsx                Home
  levels.tsx               Level map
  settings.tsx             Themes and preferences
  onboarding.tsx           First-launch introduction and replayable guide
  how-to-play.tsx          Illustrated manual with playable practice lessons
  play/[id].tsx            Validated, unlock-aware game route
src/features/game/
  engine.ts                Pure 3D movement planning, gravity, lifts, collisions, scoring
  engine.test.ts           Trail and game-rule regression tests
  levels.ts                Authored 3D paths, lift links, and crystal locations
  geometry.ts              Projection, edge-pivot cube geometry, trail colors
  visibility.ts            Local path visibility and camera framing
  hooks/useGame.ts         Input locking, lifecycle, clock, animation coordination
  components/              Skia board, controls, Lottie completion overlay
src/store/                 Redux Toolkit and validated local persistence
src/features/settings/     Reusable setting rows and mission-control screen
src/features/onboarding/   Three-step flight introduction
src/features/guide/        Practice lessons and shared 3D lesson artwork
src/components/            Shared UI and space artwork
src/theme/                 Design tokens and space palettes
assets/animations/         Original bundled Lottie animation
```

Skia projects 3D cube and beveled platform geometry into an isometric view, with shaded side faces, cube contact shadows, inset highlights, and luminous side rails. The unit cube rotates around its leading ground edge through a full 90-degree roll. Reanimated shared values animate rotation and light transitions on the UI thread on native; React state commits once per completed move. Each theme supplies a trail gradient: visited tiles light up permanently, landing rings pulse, and the cube takes on the next tile's color. Retry clears the illuminated trail. This uses custom 3D geometry rendered with Skia, without a separate 3D engine.

Lottie React Native renders completion particles. Native and web Skia entry points are separated so CanvasKit loads before rendering on web. Both CanvasKit and the web Lottie player's WASM are bundled locally.

Path tiles rise, scale, and fade into place with staggered Reanimated transitions. Camera translation and zoom animate one parent Skia group, preserving cached tile geometry. Visibility affects presentation only: collision surfaces stay intact. Reduced motion makes both reveal and camera changes immediate. For much longer trails, cull distant drawing nodes while retaining the complete collision model.

Redux Toolkit owns durable progress and settings. Transient game state stays inside the game feature, with a pure rules engine and a synchronous input lock to prevent overlapping moves. Redux Saga is unnecessary for this local game; there are no complex remote workflows. Storage writes are serialized and saved data is validated before hydration.

### Authoring vertical levels

Each cell has an explicit `{ x, y, z }` position, where `y` is its platform height. Level scripts use `N/E/S/W` for a horizontal roll and `U/D` for a linked lift three height units up/down. An `@height` suffix sets the next platform's absolute height: `NNN N@0 WWW` starts on an elevated path, rolls off its fourth edge to height zero, then continues west. The level's final tuple field sets its starting height. Example: `NN U WW NN N@0 WW` starts at zero, uses a lift to height three, then drops back to zero later.

Gravity searches the destination column for the highest surface at or below the cube's starting deck, independent of authored path order. A cube's full rolling clearance is checked against higher blocks. Same X/Z coordinates on different decks are distinct cells. The renderer uses the same height values for platforms, cube movement, lift beams, drop guides, and camera bounds.

## Validation

```sh
npm run check                # strict TypeScript, ESLint, game tests
npx expo install --check      # SDK dependency compatibility
npx expo export --platform all
```

The test suite verifies all 18 trails have unique 3D cells and can be completed through legal rolls, drops, and lifts with all three crystals. Additional tests cover nearest-platform gravity, sideways misses, continued movement after a landing, explicit bidirectional lift links, low ceilings, altitude reset, paused/terminal states, backtracking, unique crystal collection, visited tiles, and gradient bounds. Geometry tests verify the rolling edge stays fixed and cube vertices never sink through the ground. Visibility tests cover the reveal window, backtracking, landing previews, upper-deck fading, and camera bounds across all levels at phone and compact board sizes. GitHub Actions runs checks and exports all platforms.

Before a store release, run on physical Android and iOS devices: rapid repeated inputs during falls, swipes at corners, backgrounding during a lift/drop, pause/resume at landing, upward/downward lifts, misses and retry, level unlocks after relaunch, reduced motion, large text, and small screens. Use Maestro for end-to-end navigation and gameplay scenarios; profile a release build on a midrange Android device with React Native DevTools and platform frame tools. Browser testing cannot validate native Skia/worklet execution, haptics, or native Lottie rendering.

For fullscreen/settings changes, also verify: diagonal versus vertical strokes on both ends of a lift; unavailable lifts doing nothing; browser Escape and native back; notch/home-indicator spacing; screen-reader movement actions; first launch versus relaunch; tutorial replay; cancelled reset dialogs; preference persistence; and cold-start splash behavior. Automated tests cover all four swipe directions, unavailable lifts, sensitivity thresholds, malformed preferences, and migration of existing saves.

## Builds and release

`eas.json` includes development, internal preview, and production profiles for both platforms. Set your own app identifiers in `app.json`, link your Expo project with `eas init`, and configure signing before building.

```sh
npx eas-cli build --profile development --platform all
npx eas-cli build --profile preview --platform all
npx eas-cli build --profile production --platform all
```

Use separate Expo projects/app identifiers for staging and production if adding backend services. Keep signing credentials in EAS and `EXPO_TOKEN` in GitHub Actions secrets; never commit credentials. Add EAS Update channels and runtime-version policies only when OTA updates are introduced. Build and submission are separate steps; this repository does not automatically publish or submit to stores.

## Further engineering work

- **Performance:** the native board is memoized, geometry scales to available space, animation runs outside React renders, and font/icon imports are scoped. For substantially larger levels, cache static Skia pictures and cull distant tiles. Profile before adding shaders or a continuous particle loop.
- **Security:** there are no accounts, ads, analytics, remote assets, or requested sensitive permissions. AsyncStorage holds only non-sensitive game progress. If adding leaderboards, validate scores on a server; local progress is intentionally not cheat-proof. Keep secrets out of `EXPO_PUBLIC_*` variables.
- **Dependency maintenance:** the initial npm audit reported 13 moderate advisories through Expo's `xcode → uuid` build tooling and Router's `query-string → decode-uri-component`. No high or critical issues were reported. The suggested forced fixes downgrade Expo/Router, so they were not applied. Track compatible upstream fixes before release.
- **Code quality:** keep routes thin, add trails in `levels.ts`, and test new mechanics in the pure engine. Preserve typed route validation and version storage migrations when its schema changes.

Compatibility references: [Expo SDK 57](https://expo.dev/sdk/57), [Reanimated setup](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/), [Skia setup](https://docs.expo.dev/versions/v57.0.0/sdk/skia/), [Skia web loading](https://shopify.github.io/react-native-skia/docs/getting-started/web/).
# orbitroll
