# Bomber / Boomz-like 2D Artillery Game — Project Handoff

> Handoff document for continuing development with Codex or another developer.  
> Game style: **Boomz / DD Tank / Gunbound / Worms-like turn-based artillery shooter**  
> Target platform: **2D Web Game**

---

## 1. Project Goal

Build a **2D web-based turn-based artillery shooter** where players aim, charge power, shoot projectiles, take explosion damage, and play in different local/online multiplayer modes.

The game should eventually support:

- Local multiplayer
- Online multiplayer
- Playing with friends
- Duel / Team Battle / Free For All
- Rooms
- Ready system
- Teams
- Weapons
- Characters
- Wind
- Destructible terrain later
- Ranking / inventory later

The current recommended strategy is:

```text
Build local multiplayer first using the same architecture shape as future online multiplayer.
```

Local mode should be designed like a server-authoritative game, except the browser runs the local authority through `LocalMatchClient`.

Future online mode should replace `LocalMatchClient` with `OnlineMatchClient` and `.NET 8 + SignalR` server authority.

---

## 2. Tech Stack

### Current MVP Stack

```text
Frontend:
- Vite
- TypeScript
- Phaser 3
```

### Future Backend Stack

```text
Backend:
- .NET 8 Web API
- SignalR
- PostgreSQL or SQL Server
```

### Future Architecture

```text
Client
  Phaser 3 rendering
  Input
  UI
  Local / Online MatchClient

Server
  .NET 8 API
  SignalR Hub
  Authoritative Match Engine
  Room Service
  Persistence

Database
  Users
  Friends
  Characters
  Weapons
  Inventory
  Matches
  Ranking
```

---

## 3. Confirmed Current Status

The project has reached at least this confirmed milestone:

```text
Duel local MVP runs successfully.
Build/tests passed after initial playable implementation.
```

Confirmed first playable MVP included:

- Vite + TypeScript + Phaser 3
- BootScene
- RoomScene
- GameScene
- LocalMatchClient
- MatchStateStore
- Core models
- Static map
- Basic cannon weapon
- 2 players
- Turn system
- Projectile arc
- Collision with ground/player
- Explosion
- Distance-based damage
- HP system
- Turn switching
- Win condition
- Return to room

---

## 4. Work Planned / Requested After Initial MVP

The following milestones were designed and prompted for Codex. Verify in code whether each is already implemented.

### Local Multiplayer v2

Goal:

```text
Add multiple local multiplayer modes.
```

Expected modes:

1. **Duel**
   - 2 players
   - Player 1 vs Player 2

2. **TeamBattle**
   - 4 players
   - 2v2
   - Team 1: Player 1 + Player 2
   - Team 2: Player 3 + Player 4
   - Turn order:
     ```text
     P1 -> P3 -> P2 -> P4 -> repeat
     ```
   - Friendly fire toggle

3. **FreeForAll**
   - 2 to 4 players
   - Everyone fights everyone
   - Turn order:
     ```text
     P1 -> P2 -> P3 -> P4 -> repeat
     ```
   - Dead players skipped
   - Winner is last living player

---

### Local Room UI v3

Goal:

```text
Make RoomScene feel like a real local lobby.
```

Expected features:

- Select mode:
  - `1` = Duel
  - `2` = TeamBattle
  - `3` = FreeForAll
- FreeForAll player count:
  - `A/D` or `LEFT/RIGHT` to change 2–4 players
- TeamBattle friendly fire:
  - `F` toggles friendly fire
- Player slots:
  - Slot number
  - Player name
  - Team / FFA label
  - Ready / Not Ready
  - Closed if unused
- Ready controls:
  - `Q` = Player 1 ready
  - `W` = Player 2 ready
  - `E` = Player 3 ready
  - `R` = Player 4 ready
- Start match:
  - `ENTER`
  - Only starts when all occupied slots are ready

---

### Input / Game Feel v4

Goal:

```text
Make gameplay feel closer to Boomz.
```

Expected controls:

```text
Mouse = aim
LEFT / RIGHT = move active unit
SPACE first press = start charging power
SPACE second press = fire
ESC = return to room
```

Expected features:

- Boomz-style oscillating power bar
- Power bar moves automatically up/down
- Projectile fires using current charged power
- Active player movement
- Per-turn movement limit
- Input disabled while projectile is flying
- Aim guide line
- Power bar UI

---

### Input Tuning v5

Goal:

```text
Replace mouse aiming with keyboard aiming and tune movement/power.
```

Expected controls:

```text
UP = aim higher
DOWN = aim lower
LEFT = move active unit left
RIGHT = move active unit right
SPACE first press = start charging power
SPACE second press = fire
ESC = back to room
```

Expected tuning:

```ts
moveSpeedPixelsPerSecond = 90;
maxMoveDistancePerTurn = 80;
powerScale = 1.35; // or 1.5 if shot still feels weak
angleStepDegrees = 1;
```

Important design:

```text
Power UI still displays 0–100.
Actual shot power is stronger through powerScale.
```

Recommended formula:

```ts
actualShotPower = displayedPower * powerScale;
```

---

### Input Polish v6

Goal:

```text
Add undo, continuous aim hold, right-side aim fix, and visible wind.
```

Requested features:

1. **Undo**
   - Undo walking
   - Undo aim changes
   - Works only before power charging / before shooting
   - Suggested key:
     ```text
     Z = undo
     ```

2. **Hold UP/DOWN**
   - Holding UP continuously aims higher
   - Holding DOWN continuously aims lower
   - Use `deltaSeconds`

3. **Fix right-side aiming**
   - UP should mean “aim higher” for both left-side and right-side players
   - Do not directly treat `angleDegrees += 1` as “higher” for all players

4. **Wind display**
   - Show direction and strength
   - Example:
     ```text
     Wind: → 12
     Wind: ← 8
     Wind: Calm
     ```

5. **Deterministic projectile simulation**
   - Same input + same wind = same landing point
   - Different wind = different landing point

---

## 5. Key Architecture Principle

Do **not** put game rules inside Phaser scenes.

Correct separation:

```text
GameScene
- Render state
- Read input
- Show UI
- Play projectile animation
- Send commands to MatchClient

LocalMatchClient
- Local authoritative match engine
- Validate commands
- Resolve movement
- Resolve projectile
- Resolve collision
- Resolve damage
- Resolve turn switching
- Resolve win condition

Core Services
- Plain TypeScript
- No Phaser dependency
- Testable
```

Future online replacement:

```text
LocalMatchClient -> OnlineMatchClient
OnlineMatchClient -> SignalR -> .NET MatchEngine
```

---

## 6. Recommended Folder Structure

Expected structure:

```text
src/
  main.ts

  game/
    PhaserGame.ts

    scenes/
      BootScene.ts
      RoomScene.ts
      GameScene.ts

    renderers/
      PlayerRenderer.ts
      ProjectileRenderer.ts
      TerrainRenderer.ts
      ExplosionRenderer.ts
      AimGuideRenderer.ts
      PowerBarRenderer.ts

    input/
      AimInputController.ts

  core/
    models/
      GameMode.ts
      RoomState.ts
      RoomSettings.ts
      PlayerSlot.ts
      Team.ts
      MatchState.ts
      TurnQueue.ts
      WeaponDefinition.ts
      MapDefinition.ts
      ShotCommand.ts
      ShotResolvedEvent.ts
      DamageResult.ts
      MoveCommand.ts
      WindState.ts
      PreShotSnapshot.ts

    services/
      LocalMatchClient.ts
      MatchStateStore.ts
      MatchFactory.ts
      RoomFactory.ts
      GameModeRules.ts
      TeamResolver.ts
      TurnOrderService.ts
      ProjectileSimulator.ts
      TerrainCollisionService.ts
      DamageCalculator.ts
      WinConditionChecker.ts
      WeaponRegistry.ts
      MovementService.ts
      PowerChargeController.ts
      AimService.ts
      UndoService.ts
      WindService.ts

    data/
      weapons.ts
      maps.ts
      gameplayTuning.ts

  shared/
    math.ts
    ids.ts
```

Not all files may exist yet. This is the target structure.

---

## 7. Core Models

### GameMode

```ts
export enum GameMode {
  Duel = "Duel",
  TeamBattle = "TeamBattle",
  FreeForAll = "FreeForAll",
}
```

---

### RoomSettings

```ts
export interface RoomSettings {
  gameMode: GameMode;
  maxPlayers: number;
  friendlyFireEnabled: boolean;
  mapId: string;
}
```

---

### PlayerSlot

```ts
export type SlotState = "Open" | "Occupied" | "Closed";

export interface PlayerSlot {
  slotId: string;
  slotIndex: number;
  state: SlotState;
  playerName: string;
  teamId: string | null;
  characterId: string;
  weaponIds: string[];
  isReady: boolean;
}
```

---

### Team

```ts
export interface Team {
  teamId: string;
  name: string;
  color: number;
  slotIds: string[];
}
```

---

### RoomState

```ts
export interface RoomState {
  roomId: string;
  settings: RoomSettings;
  slots: PlayerSlot[];
  teams: Team[];
}
```

---

### MatchPlayerState

Recommended current/future shape:

```ts
export interface MatchPlayerState {
  slotId: string;
  playerName: string;
  teamId: string | null;

  x: number;
  y: number;

  hp: number;
  maxHp: number;
  isAlive: boolean;

  facingDirection: 1 | -1;
  aimElevationDegrees: number;

  movedDistanceThisTurn: number;
}
```

Important note:

Do not rely only on `angleDegrees` for visual aiming. It causes incorrect behavior for the right-side player.

Use:

```ts
actualAngleDegrees =
  facingDirection === 1
    ? aimElevationDegrees
    : 180 - aimElevationDegrees;
```

This makes:

```text
UP = aim higher
DOWN = aim lower
```

work correctly for both left and right side.

---

### MatchState

```ts
export interface MatchState {
  matchId: string;
  mode: GameMode;
  friendlyFireEnabled: boolean;
  mapId: string;

  players: MatchPlayerState[];
  teams: Team[];

  turnQueue: TurnQueue;
  activeSlotId: string;

  phase: "Aiming" | "ChargingPower" | "ProjectileInFlight" | "Resolving" | "MatchEnded";

  wind?: WindState;

  winnerSlotId?: string;
  winnerTeamId?: string;
}
```

---

### TurnQueue

```ts
export interface TurnQueue {
  orderedSlotIds: string[];
  currentIndex: number;
}
```

---

### WeaponDefinition

```ts
export interface WeaponDefinition {
  weaponId: string;
  name: string;
  baseDamage: number;
  explosionRadius: number;
  projectileSpeed: number;
  gravity: number;
  maxPower: number;
}
```

---

### MapDefinition

```ts
export interface SpawnPoint {
  x: number;
  y: number;
  teamId?: string;
}

export interface MapDefinition {
  mapId: string;
  name: string;
  width: number;
  height: number;
  groundY: number;
  spawnPoints: SpawnPoint[];
}
```

---

### ShotCommand

```ts
export interface ShotCommand {
  matchId: string;
  shooterSlotId: string;
  weaponId: string;
  angleDegrees: number;
  power: number;
}
```

Note:

`power` should be the effective power used by projectile simulation.

If UI displays 0–100 but gameplay needs stronger shots:

```ts
actualPower = displayedPower * gameplayTuning.powerScale;
```

---

### DamageResult

```ts
export interface DamageResult {
  targetSlotId: string;
  damage: number;
  remainingHp: number;
  killed: boolean;
  relationship: "Self" | "Ally" | "Enemy";
}
```

---

### ShotResolvedEvent

```ts
export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface ShotResolvedEvent {
  shooterSlotId: string;
  weaponId: string;

  trajectory: TrajectoryPoint[];

  explosionX: number;
  explosionY: number;

  damageResults: DamageResult[];

  nextTurnSlotId?: string;

  matchEnded: boolean;
  winnerSlotId?: string;
  winnerTeamId?: string;
}
```

---

### MoveCommand

```ts
export interface MoveCommand {
  matchId: string;
  slotId: string;
  direction: -1 | 1;
  deltaSeconds: number;
}
```

---

### WindState

```ts
export interface WindState {
  direction: -1 | 0 | 1;
  strength: number;
}
```

Meaning:

```text
direction = -1 => wind pushes left
direction =  0 => calm
direction =  1 => wind pushes right
```

---

### PreShotSnapshot

For undo:

```ts
export interface PreShotSnapshot {
  slotId: string;
  x: number;
  aimElevationDegrees: number;
  movedDistanceThisTurn: number;
}
```

---

## 8. Gameplay Tuning

Recommended file:

```text
src/core/data/gameplayTuning.ts
```

Recommended values:

```ts
export const gameplayTuning = {
  angleStepDegrees: 1,
  aimSpeedDegreesPerSecond: 45,

  moveSpeedPixelsPerSecond: 90,
  maxMoveDistancePerTurn: 80,

  powerScale: 1.35,

  minDisplayedPower: 1,
  maxDisplayedPower: 100,
  powerChargeSpeedPerSecond: 80,

  windScale: 8,

  fixedSimulationDeltaSeconds: 1 / 60,
};
```

Notes:

- If movement still feels too fast, reduce `moveSpeedPixelsPerSecond` to `70`.
- If shooting still feels too weak, increase `powerScale` to `1.5` or `1.7`.
- Do not change UI max power above 100 unless the design intentionally changes.

---

## 9. Core Services Responsibilities

### LocalMatchClient

Local authoritative engine.

Responsibilities:

- Validate active player command
- Submit shot
- Move active player
- Apply undo
- Resolve projectile
- Resolve damage
- Advance turn
- Generate/update wind
- Update MatchStateStore

Should expose methods similar to:

```ts
submitShot(command: ShotCommand): ShotResolvedEvent;
moveActivePlayer(command: MoveCommand): MatchState;
adjustAimElevation(slotId: string, deltaDegrees: number): MatchState;
undoLastPreShotAction(matchId: string, slotId: string): MatchState;
```

---

### MatchStateStore

Holds current match state and notifies listeners.

```ts
getState(): MatchState;
setState(state: MatchState): void;
subscribe(listener: (state: MatchState) => void): () => void;
```

---

### MatchFactory

Creates MatchState from RoomState.

Responsibilities:

- Choose players from active slots
- Assign spawn points
- Assign team IDs
- Set HP = 100
- Set default aim
- Set facing direction
- Create initial TurnQueue
- Generate initial wind

Default aiming:

```text
Left side player:
- facingDirection = 1
- aimElevationDegrees = 45

Right side player:
- facingDirection = -1
- aimElevationDegrees = 45
```

---

### RoomFactory

Creates valid RoomState for:

- Duel
- TeamBattle
- FreeForAll

Responsibilities:

- Create player slots
- Create teams
- Set defaults
- Reset ready states when mode/player count changes
- Validate start match readiness

---

### GameModeRules

Controls mode-specific logic:

- Min/max players
- Whether teams are required
- Whether friendly fire toggle is available
- Win condition shape

---

### TeamResolver

Determines relationship:

```text
Self
Ally
Enemy
```

Rules:

```text
Duel:
- shooter = Self
- other player = Enemy

TeamBattle:
- shooter = Self
- same team = Ally
- other team = Enemy

FreeForAll:
- shooter = Self
- everyone else = Enemy
```

---

### TurnOrderService

Responsible for turn queue.

Expected turn order:

```text
Duel:
P1 -> P2

TeamBattle:
P1 -> P3 -> P2 -> P4

FreeForAll:
P1 -> P2 -> P3 -> P4
```

Rules:

- Dead players are skipped
- Movement allowance resets on new turn
- Undo stack clears on new turn
- Wind may regenerate on new turn

---

### ProjectileSimulator

Plain TypeScript deterministic simulation.

Important rules:

- Do not use Phaser physics for core projectile logic
- Use fixed delta:
  ```ts
  deltaSeconds = 1 / 60
  ```
- Same input should produce same trajectory

Recommended input:

```ts
interface ProjectileInput {
  startX: number;
  startY: number;
  angleDegrees: number;
  power: number;
  speed: number;
  gravity: number;
  wind: WindState;
  windScale: number;
  maxSteps: number;
  deltaSeconds: number;
}
```

Recommended simulation:

```ts
vx = Math.cos(radians) * power * speed;
vy = -Math.sin(radians) * power * speed;

for each fixed step:
  vx += wind.direction * wind.strength * windScale * deltaSeconds;
  vy += gravity * deltaSeconds;

  x += vx * deltaSeconds;
  y += vy * deltaSeconds;
```

---

### TerrainCollisionService

Finds first collision from trajectory points.

Collision types:

```text
Ground
Player
OutOfBounds
```

MVP:

- Static flat ground
- Simple player radius collision
- No destructible terrain yet

---

### DamageCalculator

Distance-based explosion damage.

Formula:

```ts
damage = baseDamage * (1 - distance / explosionRadius);
damage = Math.ceil(clamp(damage, 0, baseDamage));
```

Rules:

```text
Enemy:
- takes damage if inside radius

Self:
- takes damage if inside radius

Ally:
- takes damage only if friendlyFireEnabled = true
```

---

### WinConditionChecker

Rules:

```text
Duel:
- Match ends when one player/team remains alive

TeamBattle:
- Match ends when only one team has living players

FreeForAll:
- Match ends when only one player remains alive
```

Draw handling:

```text
If all living players die in the same explosion, return draw safely.
```

Do not crash on zero living players.

---

### MovementService

Responsibilities:

- Move active player left/right
- Allow movement only in Aiming phase
- Enforce map bounds
- Enforce `maxMoveDistancePerTurn`
- Keep y fixed at `groundY - playerRadius`
- Update `movedDistanceThisTurn`

---

### PowerChargeController

Plain TypeScript helper.

Responsibilities:

- Start charging
- Update power over time
- Oscillate between min/max
- Stop and return current displayed power

Expected behavior:

```text
SPACE first press:
- start charging

SPACE second press:
- stop charging
- fire using current displayed power
```

Power bar still displays:

```text
1–100
```

Actual shot uses:

```ts
actualPower = displayedPower * gameplayTuning.powerScale;
```

---

### AimService

Plain TypeScript helper.

Responsibilities:

- Increase/decrease `aimElevationDegrees`
- Clamp between 0 and 90
- Derive actual projectile angle

Recommended methods:

```ts
increaseElevation(current: number, delta: number): number;
decreaseElevation(current: number, delta: number): number;
clampElevation(value: number): number;
toActualAngleDegrees(facingDirection: 1 | -1, elevation: number): number;
```

Conversion:

```ts
facingDirection === 1
  ? elevation
  : 180 - elevation;
```

---

### UndoService

Pre-shot undo only.

Responsibilities:

- Save snapshots before movement/aim changes
- Restore x, aimElevationDegrees, movedDistanceThisTurn
- Clear stack on turn change
- Clear stack when power charging starts
- Disable undo after shot

Rules:

```text
Undo works only during Aiming phase.
Undo affects only active player.
Undo must not restore HP/damage/match result.
```

---

### WindService

Responsibilities:

- Generate wind per turn
- Keep wind stable during one shot
- Provide deterministic wind in tests if needed

Suggested API:

```ts
generateWindForTurn(turnNumber: number): WindState;
```

MVP strength range:

```text
0–30
```

---

## 10. Current / Target Controls

### RoomScene

```text
1 = Duel
2 = TeamBattle
3 = FreeForAll

A / D or LEFT / RIGHT = change FreeForAll player count
F = toggle TeamBattle friendly fire

Q = toggle Player 1 ready
W = toggle Player 2 ready
E = toggle Player 3 ready
R = toggle Player 4 ready

ENTER = start match
ESC = reset/back if implemented
```

---

### GameScene

Current/target controls after v6:

```text
UP = aim higher
DOWN = aim lower

LEFT = move active unit left
RIGHT = move active unit right

Z = undo last pre-shot move/aim action

SPACE first press = start power charging
SPACE second press = fire

ESC = return to RoomScene
```

Important:

```text
UP must aim higher for both left-side and right-side players.
DOWN must aim lower for both left-side and right-side players.
```

---

## 11. GameScene UI Requirements

GameScene should display:

```text
Mode
Active player
Phase
Aim elevation
Actual angle
Displayed power
Power bar
Remaining movement distance
Undo count
Wind direction and strength
Help text
Winner when match ended
```

Example UI text:

```text
Mode: TeamBattle
Active: Player 3
Phase: Aiming
Aim: 45°
Actual Angle: 135°
Power: 72 / 100
Move Left: 48 px
Undo: 2
Wind: ← 8

↑ / ↓: Aim higher/lower
← / →: Move
Z: Undo
SPACE: Start Power
SPACE again: Fire
ESC: Back to Room
```

---

## 12. Rendering Notes

Use simple Phaser graphics for now.

### PlayerRenderer

Should render:

- Body
- Name
- HP bar
- Active player indicator
- Team color
- Dead state

### AimGuideRenderer

Should render:

- Line from active player
- Uses actual angle
- Visible during:
  ```text
  Aiming
  ChargingPower
  ```
- During ChargingPower, use locked angle

### PowerBarRenderer

Should render:

- Background bar
- Fill from 0–100
- Oscillating current power
- Display numeric value

### ProjectileRenderer

Should animate trajectory points returned from LocalMatchClient.

Important:

```text
GameScene animates returned trajectory.
Core simulator determines trajectory.
```

### ExplosionRenderer

Should render simple explosion circle/effect at collision point.

### WindRenderer / UI

Can be simple text + arrow.

Example:

```text
Wind: → 12
```

---

## 13. Projectile / Shot Flow

Expected final flow:

```text
1. Active player enters Aiming phase
2. Player moves left/right
3. Player adjusts aim with UP/DOWN
4. Optional: player presses Z to undo movement/aim
5. Player presses SPACE
6. Game locks current actual angle
7. Power bar starts oscillating
8. Undo stack clears
9. Player presses SPACE again
10. Game calculates actualPower = displayedPower * powerScale
11. GameScene sends ShotCommand to LocalMatchClient
12. LocalMatchClient validates active player
13. LocalMatchClient simulates projectile with fixed timestep and current wind
14. LocalMatchClient finds collision
15. LocalMatchClient calculates damage
16. LocalMatchClient applies HP changes
17. LocalMatchClient checks win condition
18. If match continues:
    - advance turn
    - reset movement allowance
    - clear undo stack
    - generate new wind
19. GameScene animates trajectory and explosion
20. UI updates
```

---

## 14. Room to Match Flow

Expected flow:

```text
RoomScene
  creates RoomState
  selects mode/player count/friendly fire
  tracks ready states
  validates all occupied players ready
  passes RoomState to GameScene

GameScene
  uses MatchFactory to create MatchState from RoomState
  creates MatchStateStore
  creates LocalMatchClient
  renders match
```

Do not pass only raw mode anymore if RoomState exists.

---

## 15. Data Files

### weapons.ts

MVP weapon:

```ts
export const weapons: WeaponDefinition[] = [
  {
    weaponId: "basic-cannon",
    name: "Basic Cannon",
    baseDamage: 35,
    explosionRadius: 90,
    projectileSpeed: 8,
    gravity: 420,
    maxPower: 100,
  },
];
```

If shots still feel weak, prefer adjusting:

```ts
gameplayTuning.powerScale
```

not `weapon.maxPower`.

---

### maps.ts

MVP map:

```ts
export const maps: MapDefinition[] = [
  {
    mapId: "training-field",
    name: "Training Field",
    width: 1280,
    height: 720,
    groundY: 560,
    spawnPoints: [
      { x: 160, y: 536 },
      { x: 1120, y: 536 },
      { x: 360, y: 536 },
      { x: 920, y: 536 },
    ],
  },
];
```

---

## 16. Testing Checklist

### Build

```bash
npm run build
```

### Tests

```bash
npm test
```

If no test script exists:

```bash
npm install -D vitest
```

Add:

```json
{
  "scripts": {
    "test": "vitest"
  }
}
```

---

## 17. Required / Recommended Tests

### Game Mode

- Duel creates 2 players
- TeamBattle creates 4 players
- FreeForAll creates 2–4 players
- TeamBattle teams are assigned correctly
- FFA players are enemies

### Turn Order

- Duel order:
  ```text
  P1 -> P2
  ```
- TeamBattle order:
  ```text
  P1 -> P3 -> P2 -> P4
  ```
- FFA order:
  ```text
  P1 -> P2 -> P3 -> P4
  ```
- Dead players are skipped
- Movement resets on turn change
- Undo stack clears on turn change

### Damage

- Enemy takes damage
- Self can take damage
- Ally does not take damage when friendly fire disabled
- Ally takes damage when friendly fire enabled
- Damage is distance-based

### Win Conditions

- Duel ends when one player remains
- TeamBattle ends when one team remains
- FFA ends when one player remains
- Draw case does not crash

### Movement

- Active player can move during Aiming
- Inactive player cannot move
- Movement disabled outside Aiming
- Movement cannot exceed max distance
- Movement cannot leave map bounds

### Power Charging

- SPACE first press starts charging
- Power oscillates 1–100
- SPACE second press fires
- Displayed power remains 1–100
- Actual power applies `powerScale`

### Aiming

- Holding UP increases aim elevation
- Holding DOWN decreases aim elevation
- Elevation clamps 0–90
- Left player actual angle derives correctly
- Right player actual angle derives correctly
- UP means visually higher for both sides
- DOWN means visually lower for both sides
- Aiming disabled outside Aiming phase

### Undo

- Undo restores x
- Undo restores aimElevationDegrees
- Undo restores movedDistanceThisTurn
- Undo only works in Aiming phase
- Undo does not restore HP
- Undo disabled after charging starts
- Undo stack resets on turn change

### Wind

- MatchState has wind
- Wind displays direction and strength
- Wind remains constant during one shot
- Wind may change on turn change
- Same input + same wind = same trajectory
- Different wind = different trajectory
- Wind direction affects projectile x movement correctly

---

## 18. Known Issues / Design Risks

### 1. Right-side aiming bug

Problem:

```text
Using raw angleDegrees makes UP/DOWN feel inverted on the right side.
```

Fix:

```text
Use aimElevationDegrees + facingDirection.
```

---

### 2. Non-deterministic shot landing

Problem:

```text
Same angle/power does not always land in same spot.
```

Possible causes:

- Wind changes
- Variable delta time used in projectile simulation
- Physics tied to Phaser frame rate
- Player position changed slightly
- Actual power scaling inconsistent

Fix:

```text
Use fixed timestep in ProjectileSimulator.
Display wind clearly.
Keep wind constant during shot.
```

---

### 3. Phaser owning too much state

Risk:

```text
If GameScene mutates match rules directly, future online mode will require rewrite.
```

Fix:

```text
Keep game state changes inside LocalMatchClient/core services.
```

---

### 4. Overbuilding too early

Avoid for now:

- Backend
- SignalR
- Database
- Login
- Ranking
- Inventory
- Shop
- Destructible terrain
- Multiple weapons
- Advanced character systems

---

## 19. Recommended Next Development Order

### Next Step 1: Finish Input Polish v6

Implement / verify:

```text
Undo
Hold UP/DOWN
Right-side aim fix
Wind display
Deterministic projectile simulation
```

---

### Next Step 2: Game Feel v7

After v6 works, improve feel:

```text
Camera follows projectile
Camera returns to active player
Screen shake on explosion
Explosion effect
Hit flash
Floating damage number
Better HP bars
Turn transition text
Basic sound effects
```

Do not change game rules during this step.

---

### Next Step 3: Map / Terrain v8

Add:

```text
Multiple static maps
Better spawn points
Simple obstacles
Collision with obstacles
```

Still avoid destructible terrain unless core gameplay is stable.

---

### Next Step 4: Weapon System v9

Add more weapons:

```text
Basic Cannon
Heavy Bomb
Fast Shot
Wide Blast
Triple Shot later
```

Use data-driven weapon definitions.

---

### Next Step 5: Online Room Prototype v10

Only after local gameplay is stable.

Add:

```text
.NET 8 API
SignalR RoomHub
Create room
Join by room code
Slot updates
Ready updates
Start match event
```

At first, online can sync room only.

Do not start with full online projectile simulation.

---

### Next Step 6: Server-Authoritative Match v11

Move authority from browser to server:

```text
Client sends ShotCommand
Server validates
Server simulates projectile
Server calculates damage
Server advances turn
Server broadcasts ShotResolvedEvent
Client replays visual trajectory
```

---

## 20. Future Backend Design

### .NET Projects

Recommended:

```text
backend/
  Bomber.Api/
    Controllers/
    Hubs/
    Contracts/

  Bomber.Application/
    Rooms/
    Matches/
    Friends/
    Inventory/
    Ranking/

  Bomber.Domain/
    Matches/
    Modes/
    Teams/
    Turns/
    Players/
    Weapons/
    Physics/
    Damage/
    Terrain/

  Bomber.Infrastructure/
    Persistence/
    Repositories/
    Realtime/

  Bomber.Tests/
```

---

### SignalR Events

Client to server:

```text
CreateRoom(settings)
JoinRoomByCode(roomCode)
LeaveRoom(roomId)
ChangeRoomSettings(roomId, settings)
ChangeTeam(roomId, teamId)
SelectCharacter(roomId, characterId)
SelectLoadout(roomId, weaponIds)
SetReady(roomId, isReady)
StartMatch(roomId)

SubmitShot(matchId, angle, power, weaponId)
SendEmote(matchId, emoteId)
RequestReconnect(matchId)
```

Server to client:

```text
RoomCreated
RoomJoined
RoomStateUpdated
PlayerJoinedRoom
PlayerLeftRoom
RoomSettingsChanged
SlotUpdated
TeamUpdated
ReadyStateChanged
MatchStartRejected
MatchStarted

TurnStarted
ShotAccepted
ShotRejected
ShotResolved
DamageApplied
PlayerKilled
TurnEnded
MatchEnded
PlayerDisconnected
PlayerReconnected
```

---

## 21. Server Authority Rules

Never trust client for:

```text
Damage
Hit detection
Projectile collision
HP
Turn order
Weapon ownership
Cooldowns
Match result
Ranking
```

Client should only send intent:

```text
I want to shoot weapon X with angle Y and power Z.
```

Server should validate:

```text
Is it this player's turn?
Is player alive?
Is angle legal?
Is power legal?
Does player own this weapon?
Is weapon allowed?
Is weapon off cooldown?
Is match active?
```

---

## 22. Future Database Tables

High-level:

```text
Users
PlayerProfiles
Friends
RoomInvites
Characters
Weapons
Maps
PlayerInventory
Matches
MatchParticipants
RankHistory
```

Do not implement database until online gameplay design is stable.

---

## 23. Git / Development Notes

Before each major Codex task:

```bash
git add .
git commit -m "message"
```

Recommended commit history pattern:

```text
feat: add playable local duel MVP
feat: add local multiplayer modes
feat: add local room ui
feat: add boomz style power charging
feat: tune keyboard aiming and power scale
feat: add undo aiming and wind display
```

After each Codex task:

```bash
npm run build
npm test
```

Then manually test:

```text
Duel
TeamBattle
FreeForAll
Room ready flow
Power charging
Movement
Aiming
Undo
Wind
Win condition
```

---

## 24. Codex Continuation Prompt Template

Use this for future tasks:

```text
You are working inside my existing code repository.

Do not rewrite the whole project.
Do not add backend unless explicitly requested.
Do not add online multiplayer unless explicitly requested.
Do not move game rules into Phaser scenes.

Keep:
- Phaser for rendering/input/visual effects
- Core rules in plain TypeScript
- LocalMatchClient as local authority
- GameScene as renderer/controller only

Before finishing:
- Run npm run build
- Run npm test if available
- Fix TypeScript errors
- Fix failing tests
- Summarize changed files
```

---

## 25. Immediate Next Prompt for Codex

If v6 is not implemented yet, use:

```text
Implement Input Polish v6.

Add:
- Undo pre-shot movement and aiming with Z
- Holding UP/DOWN continuously adjusts aim
- Fix right-side aiming so UP always means higher
- Add wind state, wind UI, and deterministic wind-aware projectile simulation
- Keep same input architecture
- Run build/tests and fix errors
```

If v6 is already implemented and passes, use:

```text
Implement Game Feel v7.

Add:
- Camera follow projectile
- Camera return to active player
- Screen shake on explosion
- Explosion effect polish
- Floating damage numbers
- Hit flash
- Better active turn indicator
- Better HP bars
- Basic sound hooks without external assets if possible

Do not change core game rules.
Run build/tests and fix errors.
```

---

## 26. Definition of Done for Current Local Prototype

The local prototype is considered stable enough to move toward online when:

```text
Duel works
TeamBattle 2v2 works
FreeForAll 2–4 works
Room ready flow works
Aiming feels correct on both sides
Movement feels fair
Power charging feels good
Undo works before shooting
Wind is visible and predictable
Same shot + same wind lands same place
Damage and win conditions are stable
Build passes
Tests pass
```

Only after that should online multiplayer start.

---

## 27. Summary

This project should stay focused on a strong local core first.

The core philosophy:

```text
Local gameplay should already look like online gameplay.
The only difference is who owns authority:
- Local: LocalMatchClient
- Online: .NET MatchEngine via SignalR
```

Do not rush backend until local gameplay is fun and deterministic.
