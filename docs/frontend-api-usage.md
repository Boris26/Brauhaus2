# Frontend API Usage Inventory (React)

## Scope and method

This document is generated from the **current React frontend code** only (no backend-doc assumptions).

### Files/patterns inspected

- API base/url constants: `src/global.ts`
- Generic HTTP wrapper: `src/repositorys/BaseRepository.ts`
- Domain repositories:
  - `src/repositorys/BeerRepository.ts`
  - `src/repositorys/FinishedBeerRepository.ts`
  - `src/repositorys/HopRepository.ts`
  - `src/repositorys/MaltRepository.ts`
  - `src/repositorys/YeastRepository.ts`
  - `src/repositorys/ProductionRepository.ts`
- Runtime usage wiring in epics:
  - `src/epics/beerEpics.ts`
  - `src/epics/hopsEpic.ts`
  - `src/epics/maltsEpic.ts`
  - `src/epics/yeastEpic.ts`
  - `src/epics/productionEpics.ts`
- WebSocket helper:
  - `src/utils/WebSocketController.ts`

### Search patterns used

- `fetch(...)`
- `axios`
- `XMLHttpRequest`
- repository/helper wrappers (`BaseRepository`)
- hardcoded URLs and endpoint constants (`DatabaseURL`, `BaseURL`, `CommandsURL`, `ConfirmURL`)
- command-related URL fragments (`Command`, `Confirm`, `Status`, `WaterStatus`, `Temperatur`, `next`, etc.)

### High-level findings

- No `fetch(...)` calls found.
- No direct `XMLHttpRequest` calls found.
- HTTP calls are done through:
  1. `axios.create(...)` wrapper (`BaseRepository`) for DB-style CRUD endpoints.
  2. direct `axios.get/post` in `ProductionRepository` for brewing/command endpoints.
- A socket connection is used via `socket.io-client` to `ws://...` derived from `BaseURL`.

---

## API call summary table

| Method | Path (template) | Purpose | Category | Source file/function | Body | Needs review? |
|---|---|---|---|---|---|---|
| GET | `beers` (base: `DatabaseURL`) | Load beer recipes | Safe Read | `BeerRepository.getBeers` | none | No |
| POST | `beer` | Create/submit beer recipe | Workflow Prepare | `BeerRepository.submitBeer` | `BeerDTO` JSON | No |
| POST | `importbeer` | Import beer from file | Workflow Prepare | `BeerRepository.importBeer` | `multipart/form-data` (`file`) | Yes (confirm response contract) |
| GET | `finishedbeers` | Load finished brew list | Safe Read | `FinishedBeerRepository.getFinishedBeers` | none | No |
| POST | `finishedbeer` | Add finished brew | Workflow Prepare | `FinishedBeerRepository.sendNewFinishedBeer` | `FinishedBrew` JSON | No |
| POST | `finishedbeer` | Update finished brew (POST used for update) | Legacy / Unknown | `FinishedBeerRepository.updateFinishedBeer` | `FinishedBrew` JSON | Yes (POST used for update) |
| DELETE | `finishedbeer/{aBeerId}` | Delete finished brew | Workflow Control | `FinishedBeerRepository.deleteFinishedBeer` | none | No |
| GET | `hops` | Load hops master data | Safe Read | `HopRepository.getHops` | none | No |
| POST | `hop` | Create hop | Workflow Prepare | `HopRepository.submitHop` | `Hops` JSON | No |
| GET | `malts` | Load malt master data | Safe Read | `MaltRepository.getMalts` | none | No |
| POST | `malt` | Create malt | Workflow Prepare | `MaltRepository.submitMalt` | `Malts` JSON | No |
| GET | `yeasts` | Load yeast master data | Safe Read | `YeastRepository.getYeasts` | none | No |
| POST | `yeast` | Create yeast | Workflow Prepare | `YeastRepository.submitYeast` | `Yeasts` JSON | No |
| GET | `Confirm/{confirmState}` | Send confirm action from UI dialog/process | Workflow Control | `ProductionRepository._doConfirm` | none | **Yes (GET Confirm)** |
| GET | `Command/Temperatur:""` | Read current kettle temperature | Safe Read | `ProductionRepository._doGetTemperature` | none | Yes (command endpoint used for read) |
| GET | `WaterStatus` | Poll automatic water-fill status | Safe Read | `ProductionRepository._doGetWaterFillStatus` | none | No |
| GET | `Status/` | Poll brewing status | Safe Read | `ProductionRepository._doGetBrewingStatus` | none | No |
| GET | `Available/` | Backend availability/health check | Safe Read | `ProductionRepository._doCheckIsBackendAvailable` | none | No |
| POST | `Recipe/` | Upload brewing process data before brew start | Workflow Prepare | `ProductionRepository._doSendBrewingData` | `BrewingData` JSON | Yes (verify compatibility with `/temperatur` migration notes) |
| GET | `Command/StartBrewing:""` | Start brewing process | Workflow Control | `ProductionRepository._doStartBrewing` | none | **Yes (GET Command side effect)** |
| GET | `Command/FillWaterAutomatic:{liters}` | Start automatic water fill | Hardware Control | `ProductionRepository._doFillWaterAutomatic` | none (value in URL) | **Yes (GET Command side effect)** |
| GET | `Command/TurnOn` | Heater on | Hardware Control | `ProductionRepository._doToggleHeater` | none | **Yes (GET Command side effect)** |
| GET | `Command/TurnOff` | Heater off | Hardware Control | `ProductionRepository._doToggleHeater` | none | **Yes (GET Command side effect)** |
| GET | `Command/Speed:{speed}` | Set agitator speed | Hardware Control | `ProductionRepository._doSetAgitatorSpeed` | none (value in URL) | **Yes (GET Command side effect)** |
| POST | `Command/AgitatorInterval:""` | Set agitator interval/settings | Hardware Control | `ProductionRepository._doToggleAgitator` | `MashAgitatorStates` JSON | Yes (command semantics, escaped path) |
| GET | `Command/next:""` | Advance process to next step | Workflow Control | `ProductionRepository._doNextProcedureStep` | none | **Yes (GET Command side effect)** |
| GET *(unused private)* | `Confirm/Mashup` | Legacy confirm mashup helper | Legacy / Unknown | `ProductionRepository._doConfirmMashup` | none | **Yes (GET Confirm, unused)** |
| GET *(unused private)* | `Confirm/Iodine` | Legacy iodine confirm helper | Legacy / Unknown | `ProductionRepository._doConfirmIodineTest` | none | **Yes (GET Confirm, unused)** |
| GET *(unused private)* | `Command/BoilingPointReached:` | Legacy command helper | Legacy / Unknown | `ProductionRepository._doBoilingPointReached` | none | **Yes (GET Command, unused)** |
| GET *(unused private)* | `Command/StartCooking:` | Legacy command helper | Legacy / Unknown | `ProductionRepository._doStartCooking` | none | **Yes (GET Command, unused)** |
| WS (socket.io) | `ws://192.168.178.37:5000/` (derived from `BaseURL`) | Receive `overheat` push event | Hardware/Runtime Signal | `WebSocketController.connect` via `productionWebSocketEpic$` | n/a | Yes (protocol/event contract verification) |

---

## Detailed call list

## 1) Safe read calls

### 1.1 Beer/master/finished data reads (Database backend via BaseRepository)

1. `GET DatabaseURL + beers`
   - Wrapper: `BaseRepository.get` (`api.get<T>(aUrl)`).
   - Repository: `BeerRepository.getBeers()`.
   - Used from: `getBeersEpic` on `GET_BEERS` action.
   - Response type in code: `Beer[]`.

2. `GET DatabaseURL + finishedbeers`
   - Wrapper: `BaseRepository.get`.
   - Repository: `FinishedBeerRepository.getFinishedBeers()`.
   - Used from: `getFinishedBeersEpic`.
   - Response type: `FinishedBrew[]`.

3. `GET DatabaseURL + hops`
   - Wrapper: `BaseRepository.get`.
   - Repository: `HopRepository.getHops()`.
   - Used from: `getHopsEpic`.
   - Response type: `Hops[]`.

4. `GET DatabaseURL + malts`
   - Wrapper: `BaseRepository.get`.
   - Repository: `MaltRepository.getMalts()`.
   - Used from: `getMaltsEpic`.
   - Response type: `Malts[]`.

5. `GET DatabaseURL + yeasts`
   - Wrapper: `BaseRepository.get`.
   - Repository: `YeastRepository.getYeasts()`.
   - Used from: `getYeastsEpic`.
   - Response type: `Yeasts[]`.

### 1.2 Production status/telemetry reads

6. `GET BaseURL + WaterStatus`
   - Direct axios call.
   - Method: `ProductionRepository._doGetWaterFillStatus`.
   - Used from: `startWaterFillingEpic$` polling loop.
   - Response handling: parsed into `WaterStatus` (`{ liters, openClose }` fallback on non-200).

7. `GET BaseURL + Status/`
   - Direct axios call.
   - Method: `ProductionRepository._doGetBrewingStatus`.
   - Used from: `sendBrewingDataEpic$` poll every 1000ms until `StatusText === "BREWING_FINISHED"`.
   - Response handling: `BrewingStatus` JSON + availability wrapper.

8. `GET BaseURL + Available/`
   - Direct axios call.
   - Method: `ProductionRepository._doCheckIsBackendAvailable`.
   - Used from: `checkIsBackendAvailableEpic$` every 20s.
   - Response handling: boolean (`status === 200`).

9. `GET CommandsURL + Temperatur:""`
   - Direct axios call.
   - Method: `ProductionRepository._doGetTemperature`.
   - Used from: `getTemperaturesEpic$`.
   - Response handling: returns `number` (`response.data`) else fallback `0`.
   - Note: read uses `/Command/...` endpoint style.

---

## 2) Recipe/workflow preparation calls

10. `POST DatabaseURL + beer`
    - Wrapper: `BaseRepository.post`.
    - Method: `BeerRepository.submitBeer(aBeer: BeerDTO)`.
    - Used from: `submitBeerEpic`.
    - Body: `BeerDTO` JSON.
    - Response type: `Beer`.

11. `POST DatabaseURL + importbeer`
    - Wrapper: `BaseRepository.postFile`.
    - Method: `BeerRepository.importBeer(aFile: File)`.
    - Used from: `importBeerEpic`.
    - Body: `FormData` with `file` key (`multipart/form-data`).
    - Response type: `any` (unclear).

12. `POST DatabaseURL + hop`
    - Wrapper: `BaseRepository.post`.
    - Method: `HopRepository.submitHop(aHop)`.
    - Used from: `submitNewHopEpic`.
    - Body: `Hops` JSON.
    - Response type: implied none/void.

13. `POST DatabaseURL + malt`
    - Wrapper: `BaseRepository.post`.
    - Method: `MaltRepository.submitMalt(aMalt)`.
    - Used from: `submitNewMaltEpic`.
    - Body: `Malts` JSON.

14. `POST DatabaseURL + yeast`
    - Wrapper: `BaseRepository.post`.
    - Method: `YeastRepository.submitYeast(aYeast)`.
    - Used from: `submitNewYeastEpic`.
    - Body: `Yeasts` JSON.

15. `POST BaseURL + Recipe/`
    - Direct axios call.
    - Method: `ProductionRepository._doSendBrewingData`.
    - Used from: `sendBrewingDataEpic$` as first step before `StartBrewing`.
    - Body: `BrewingData` JSON.
    - Success condition: expects `HTTP 201`.

16. `POST DatabaseURL + finishedbeer` (create)
    - Wrapper: `BaseRepository.post`.
    - Method: `FinishedBeerRepository.sendNewFinishedBeer`.
    - Used from: `sendNewFinishedBeerEpic`.
    - Body: `FinishedBrew` JSON.

17. `POST DatabaseURL + finishedbeer` (update semantics)
    - Wrapper: `BaseRepository.post`.
    - Method: `FinishedBeerRepository.updateFinishedBeer`.
    - Used from: `updateFinishedBeerEpic`.
    - Body: `FinishedBrew` JSON.
    - Note: update uses POST (not PUT/PATCH) in current implementation.

---

## 3) Workflow control calls

18. `GET ConfirmURL + {confirmState}`
    - Direct axios call.
    - Method: `ProductionRepository._doConfirm`.
    - Used from: `confirmEpic$` triggered by `CONFIRM` action.
    - Path parameter (dynamic segment): `confirmState` enum value.
    - Side effect expected on backend (confirm workflow progression).

19. `GET CommandsURL + StartBrewing:""`
    - Direct axios call.
    - Method: `ProductionRepository._doStartBrewing`.
    - Used after successful recipe upload in `sendBrewingDataEpic$`.
    - Success condition: `status == 200`.

20. `GET CommandsURL + next:""`
    - Direct axios call.
    - Method: `ProductionRepository._doNextProcedureStep`.
    - Used from: `nextProcedureStepEpic$` when UI triggers next step.
    - Success condition: `status === 200`.

21. `DELETE DatabaseURL + finishedbeer/{aBeerId}`
    - Wrapper: `BaseRepository.delete`.
    - Method: `FinishedBeerRepository.deleteFinishedBeer`.
    - Used from: `deleteFinishedBeerEpic`.
    - Path parameter: `aBeerId`.

---

## 4) Command/hardware control calls

22. `GET CommandsURL + FillWaterAutomatic:{liters}`
    - Method: `ProductionRepository._doFillWaterAutomatic`.
    - Used from: `startWaterFillingEpic$` before WaterStatus polling.
    - Dynamic URL part: `liters` as numeric value in path suffix.

23. `GET CommandsURL + TurnOn` and `GET CommandsURL + TurnOff`
    - Method: `ProductionRepository._doToggleHeater`.
    - Intended for heater control (hardware-affecting).
    - Current runtime usage: method exists but no epic wiring found in `productionEpics.ts`.

24. `GET CommandsURL + Speed:{speed}`
    - Method: `ProductionRepository._doSetAgitatorSpeed`.
    - Used from: `setAgitatorSpeedEpic$`.
    - Dynamic path suffix: numeric `speed`.

25. `POST CommandsURL + AgitatorInterval:""`
    - Method: `ProductionRepository._doToggleAgitator`.
    - Used from: `toggleAgitatorEpic$`.
    - Body: `MashAgitatorStates` JSON.

---

## 5) Legacy or suspicious calls

### 5.1 Unused private helpers (defined but not referenced)

26. `GET ConfirmURL + Mashup`
27. `GET ConfirmURL + Iodine`
28. `GET CommandsURL + BoilingPointReached:`
29. `GET CommandsURL + StartCooking:`

These are private methods in `ProductionRepository` but are not called from any current epic/action flow.

### 5.2 Suspicious implementation traits

- **GET used for Confirm** calls (`/Confirm/...`) instead of a non-idempotent method.
- **GET used for side-effect Command** operations (`StartBrewing`, `FillWaterAutomatic`, `TurnOn/TurnOff`, `Speed`, `next`).
- **Dynamic command syntax with escaped quotes/colon** (e.g. `Temperatur:""`, `next:""`, `AgitatorInterval:""`), which may be legacy/protocol-coupled.
- **Update operation via POST** (`finishedbeer`) instead of explicit PUT/PATCH.
- **Potential response-contract fragility**:
  - `_doSendBrewingData` hard-requires `201` for success.
  - Some command methods log response but do not strongly type response payload.

---

## 6) Unknown/dynamic calls

1. `GET Confirm/{confirmState}`
   - Dynamic state value from enum; exact runtime values depend on UI actions.

2. `GET Command/FillWaterAutomatic:{liters}`
   - Dynamic liters value.

3. `GET Command/Speed:{speed}`
   - Dynamic speed value.

4. WebSocket URL derived by transformation:
   - `WS_URL = BaseURL.replace(/^http/, 'ws')`
   - With current constant, expected `ws://192.168.178.37:5000/`.

5. WebSocket message parsing mismatch risk:
   - Epic parses `JSON.parse(event.data)`, but controller passes object `{ event, data }`.
   - This is runtime-path behavior and should be reviewed independently from HTTP migration.

---

## Explicit lists requested

## A) GET Confirm calls found

- `GET ConfirmURL + aConfirmState` (active usage).
- `GET ConfirmURL + 'Mashup'` (legacy unused helper).
- `GET ConfirmURL + 'Iodine'` (legacy unused helper).

## B) GET Command calls found

- `GET CommandsURL + 'Temperatur:""'`
- `GET CommandsURL + 'BoilingPointReached:' + ''` *(legacy unused)*
- `GET CommandsURL + 'StartCooking:' + ''` *(legacy unused)*
- `GET CommandsURL + 'StartBrewing:""'`
- `GET CommandsURL + 'FillWaterAutomatic:' + liters`
- `GET CommandsURL + 'TurnOn'`
- `GET CommandsURL + 'TurnOff'`
- `GET CommandsURL + 'Speed:' + speed`
- `GET CommandsURL + 'next:""'`

## C) Other suspicious/legacy calls found

- `POST CommandsURL + 'AgitatorInterval:""'` (non-REST command style URL)
- `POST DatabaseURL + 'finishedbeer'` used for update path (same endpoint as create)
- `POST BaseURL + 'Recipe/'` expects specifically `201`
- WebSocket path derived from HTTP base URL and event parsing likely inconsistent

---

## Source location index (direct vs wrapped)

- Wrapped helper methods: `BaseRepository.get/post/delete/postFile`.
- Wrapped repository endpoints:
  - `BeerRepository` (`beers`, `beer`, `importbeer`)
  - `FinishedBeerRepository` (`finishedbeers`, `finishedbeer`, `finishedbeer/{id}`)
  - `HopRepository` (`hops`, `hop`)
  - `MaltRepository` (`malts`, `malt`)
  - `YeastRepository` (`yeasts`, `yeast`)
- Direct (not wrapped) production endpoints: all entries inside `ProductionRepository` via raw `axios.get/post`.
- Runtime workflow wiring: endpoint methods are invoked from redux epics in `src/epics/*.ts`.

---

## Recommended next review points (for backend-doc comparison)

1. **Confirm semantics**
   - Validate whether `/Confirm/*` should remain GET or be migrated to POST.

2. **Command semantics**
   - Review all side-effectful GET `/Command/*` endpoints for migration to POST/PUT actions.

3. **Recipe upload contract**
   - Check whether success status is guaranteed to be `201` (frontend currently requires this).

4. **Legacy private methods**
   - Decide whether unused helpers (`Mashup`, `Iodine`, `BoilingPointReached`, `StartCooking`) should be removed, retained, or remapped.

5. **Update verb consistency**
   - `finishedbeer` update currently uses POST; confirm expected backend contract.

6. **Command read endpoint**
   - `Temperatur:""` is a read operation using command URL style; verify future canonical endpoint.

7. **WebSocket contract check**
   - Validate socket endpoint, event names, and payload shape (`event.data` parsing vs object callback).

8. **Base URL split-brain**
   - Database CRUD and brewing control use different hardcoded hosts. Confirm intended architecture and migration path.

---

## Notes

- This is a documentation-only snapshot of **current frontend behavior**.
- No API calls were changed.
- No backend code or tests were modified.
