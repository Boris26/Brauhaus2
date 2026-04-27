# Frontend API Usage Inventory (React)

## Scope and method

This document reflects the **current React frontend implementation** after aligning calls to the current backend API contract.

### Files inspected

- `src/global.ts`
- `src/repositorys/BaseRepository.ts`
- `src/repositorys/BeerRepository.ts`
- `src/repositorys/FinishedBeerRepository.ts`
- `src/repositorys/HopRepository.ts`
- `src/repositorys/MaltRepository.ts`
- `src/repositorys/YeastRepository.ts`
- `src/repositorys/ProductionRepository.ts`
- `src/epics/beerEpics.ts`
- `src/epics/hopsEpic.ts`
- `src/epics/maltsEpic.ts`
- `src/epics/yeastEpic.ts`
- `src/epics/productionEpics.ts`
- `src/utils/WebSocketController.ts`

### Search patterns used

- `fetch(...)`
- `axios`
- `XMLHttpRequest`
- Base repository wrappers (`api.get/post/delete`)
- Hardcoded URLs/constants (`DatabaseURL`, `BaseURL`, `CommandsURL`, `ConfirmURL`)
- Confirm/Command/Status/WaterStatus/temperatur/next/jump/Extended keywords

### High-level findings

- No `fetch(...)` calls.
- No direct `XMLHttpRequest` calls.
- HTTP usage is axios-based (wrapper + direct calls in `ProductionRepository`).
- `Confirm` actions now use **POST**.
- State-changing `Command` actions now use **POST**.
- `next` now uses **POST `/next`**.
- Temperature read now uses **GET `/temperatur/0`** (canonical read route format).

---

## API call summary table

| Method | Path (template) | Purpose | Category | Source file/function | Body | Needs review? |
|---|---|---|---|---|---|---|
| GET | `beers` (`DatabaseURL`) | Load beer recipes | Safe Read | `BeerRepository.getBeers` | none | No |
| POST | `beer` (`DatabaseURL`) | Create/submit beer recipe | Workflow Prepare | `BeerRepository.submitBeer` | `BeerDTO` JSON | No |
| POST | `importbeer` (`DatabaseURL`) | Import beer from file | Workflow Prepare | `BeerRepository.importBeer` | `FormData(file)` | Medium (response type `any`) |
| GET | `finishedbeers` (`DatabaseURL`) | Load finished brews | Safe Read | `FinishedBeerRepository.getFinishedBeers` | none | No |
| POST | `finishedbeer` (`DatabaseURL`) | Add finished brew | Workflow Prepare | `FinishedBeerRepository.sendNewFinishedBeer` | `FinishedBrew` JSON | No |
| POST | `finishedbeer` (`DatabaseURL`) | Update finished brew | Workflow Control | `FinishedBeerRepository.updateFinishedBeer` | `FinishedBrew` JSON | Medium (POST used for update) |
| DELETE | `finishedbeer/{id}` (`DatabaseURL`) | Delete finished brew | Workflow Control | `FinishedBeerRepository.deleteFinishedBeer` | none | No |
| GET | `hops` (`DatabaseURL`) | Load hops | Safe Read | `HopRepository.getHops` | none | No |
| POST | `hop` (`DatabaseURL`) | Create hop | Workflow Prepare | `HopRepository.submitHop` | `Hops` JSON | No |
| GET | `malts` (`DatabaseURL`) | Load malts | Safe Read | `MaltRepository.getMalts` | none | No |
| POST | `malt` (`DatabaseURL`) | Create malt | Workflow Prepare | `MaltRepository.submitMalt` | `Malts` JSON | No |
| GET | `yeasts` (`DatabaseURL`) | Load yeasts | Safe Read | `YeastRepository.getYeasts` | none | No |
| POST | `yeast` (`DatabaseURL`) | Create yeast | Workflow Prepare | `YeastRepository.submitYeast` | `Yeasts` JSON | No |
| POST | `Confirm/{confirmState}` (`ConfirmURL`) | Confirm process state | Workflow Control | `ProductionRepository._doConfirm` | none | No |
| GET | `temperatur/0` (`BaseURL`) | Read current temperature | Safe Read | `ProductionRepository._doGetTemperature` | none | Low (alter parameter currently fixed to `0`) |
| GET | `WaterStatus` (`BaseURL`) | Read water fill status | Safe Read | `ProductionRepository._doGetWaterFillStatus` | none | No |
| GET | `Status/` (`BaseURL`) | Read brewing runtime status | Safe Read | `ProductionRepository._doGetBrewingStatus` | none | No |
| GET | `Available/` (`BaseURL`) | Read backend availability | Safe Read | `ProductionRepository._doCheckIsBackendAvailable` | none | No |
| POST | `Recipe/` (`BaseURL`) | Send recipe/start payload | Workflow Prepare | `ProductionRepository._doSendBrewingData` | `BrewingData` JSON | No (expects `201`) |
| POST | `Command/StartBrewing:""` (`CommandsURL`) | Start brewing | Workflow Control | `ProductionRepository._doStartBrewing` | none | No |
| POST | `Command/FillWaterAutomatic:{liters}` (`CommandsURL`) | Start automatic fill | Hardware Control | `ProductionRepository._doFillWaterAutomatic` | none | No |
| POST | `Command/TurnOn` (`CommandsURL`) | Heater ON | Hardware Control | `ProductionRepository._doToggleHeater` | none | No |
| POST | `Command/TurnOff` (`CommandsURL`) | Heater OFF | Hardware Control | `ProductionRepository._doToggleHeater` | none | No |
| POST | `Command/Speed:{speed}` (`CommandsURL`) | Set agitator speed | Hardware Control | `ProductionRepository._doSetAgitatorSpeed` | none | No |
| POST | `Command/AgitatorInterval:""` (`CommandsURL`) | Set agitator interval | Hardware Control | `ProductionRepository._doToggleAgitator` | `MashAgitatorStates` JSON | No |
| POST | `next` (`BaseURL`) | Advance to next workflow step | Workflow Control | `ProductionRepository._doNextProcedureStep` | none | No |
| WS (socket.io) | `ws://...` derived from `BaseURL` | Receive overheat event | Runtime Signal | `WebSocketController.connect` | n/a | Medium (payload shape should be verified) |

---

## Grouped endpoint list

### 1) Safe read calls

- GET `DatabaseURL + beers`
- GET `DatabaseURL + finishedbeers`
- GET `DatabaseURL + hops`
- GET `DatabaseURL + malts`
- GET `DatabaseURL + yeasts`
- GET `BaseURL + temperatur/0`
- GET `BaseURL + WaterStatus`
- GET `BaseURL + Status/`
- GET `BaseURL + Available/`

### 2) Recipe/workflow preparation

- POST `DatabaseURL + beer`
- POST `DatabaseURL + importbeer` (multipart file)
- POST `DatabaseURL + hop`
- POST `DatabaseURL + malt`
- POST `DatabaseURL + yeast`
- POST `BaseURL + Recipe/`
- POST `DatabaseURL + finishedbeer` (create)

### 3) Workflow control

- POST `ConfirmURL + {confirmState}`
- POST `CommandsURL + StartBrewing:""`
- POST `BaseURL + next`
- POST `DatabaseURL + finishedbeer` (update)
- DELETE `DatabaseURL + finishedbeer/{id}`

### 4) Command/hardware control

- POST `CommandsURL + FillWaterAutomatic:{liters}`
- POST `CommandsURL + TurnOn`
- POST `CommandsURL + TurnOff`
- POST `CommandsURL + Speed:{speed}`
- POST `CommandsURL + AgitatorInterval:""` + JSON body

### 5) Legacy/suspicious

- Removed unused private legacy helpers that implemented old GET Confirm/GET Command behavior:
  - `_doConfirmMashup`
  - `_doConfirmIodineTest`
  - `_doBoilingPointReached`
  - `_doStartCooking`

### 6) Unknown/dynamic

- `confirmState` dynamic enum segment in `POST /Confirm/{confirmState}`.
- `liters` dynamic value in `POST /Command/FillWaterAutomatic:{liters}`.
- `speed` dynamic value in `POST /Command/Speed:{speed}`.
- `temperatur/<alter>` currently uses fixed `alter = 0`; if backend expects non-zero or caller-selected `alter`, frontend needs an additional parameterization decision.

---

## Explicit lists

### GET Confirm calls found

- None in active frontend code.

### GET Command calls found

- None in active frontend code.

### Other suspicious/legacy items

- `finishedbeer` update still uses POST to the same endpoint as create (existing backend contract assumption).
- WebSocket parsing path in epic/controller should be reviewed separately from REST API migration.

---

## Recommended next review points

1. Confirm whether `temperatur/0` should remain fixed (`alter=0`) or become configurable.
2. Confirm whether finished-brew update should stay POST or move to PUT/PATCH in a future coordinated backend/frontend update.
3. Verify socket message payload format (`productionEpics.ts` JSON parsing vs `WebSocketController` callback object).
4. Validate trailing-slash conventions (`Status/`, `Recipe/`, `Available/`) against deployed router behavior.

---

## Notes

- Source of truth for this document is frontend code.
- No backend code was changed.
- No v2 API implementation was introduced.
