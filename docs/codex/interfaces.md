# Interfaces and external contracts

## Database/backend REST endpoints

Base URL: `DatabaseURL` (`http://192.168.178.72:5000/`).

| Method | Path | UI use | Payload/response expected |
|---|---|---|---|
| GET | `beers` | Load recipes | `Beer[]` |
| POST | `beer` | Create/submit recipe | `BeerDTO`, returns `Beer` |
| DELETE | `beer/{id}` | Delete recipe | no body |
| POST | `importbeer` | Import recipe file | multipart `file`, response `any`/imported beer |
| GET | `finishedbeers` | Load finished brews | `FinishedBrew[]` |
| POST | `finishedbeer` | Create finished brew | `FinishedBrew`, returns `FinishedBrew` |
| POST | `finishedbeer` | Update finished brew | `FinishedBrew`, returns `FinishedBrew`; create/update distinction is backend-owned |
| DELETE | `finishedbeer/{id}` | Delete finished brew | no body |
| GET | `hops` | Load hops | `Hops[]` |
| POST | `hop` | Create hop | `Hops` |
| DELETE | `hop/{id}` | Delete hop | no body |
| GET | `malts` | Load malts | `Malts[]` |
| POST | `malt` | Create malt | `Malts` |
| DELETE | `malt/{id}` | Delete malt | no body |
| GET | `yeasts` | Load yeasts | `Yeasts[]` |
| POST | `yeast` | Create yeast | `Yeasts` |
| DELETE | `yeast/{id}` | Delete yeast | no body |
| GET | `additionalingredients` | Load additional ingredients | `AdditionalIngredient[]` |
| POST | `additionalingredient` | Create additional ingredient | `AdditionalIngredientCreatePayload` |
| DELETE | `additionalingredient/{id}` | Delete additional ingredient | no body |

## PI/control REST endpoints

Base URL: `BaseURL` (`http://192.168.178.37:5000/`), `CommandsURL`, and `ConfirmURL`.

| Method | Path | UI use | Success expectation |
|---|---|---|---|
| GET | `temperatur/0` | Current temperature fallback | `200`, numeric body |
| GET | `WaterStatus` | Water fill status | `200`, `{ liters, openClose }` |
| GET | `Status/` | Runtime brewing status | `200`, structured or legacy status |
| GET | `Available/` | Availability heartbeat | `200` means available |
| POST | `Recipe/` | Send `BrewingData` | `201` |
| POST | `Command/StartBrewing:""` | Start brew | `200` |
| POST | `Command/FillWaterAutomatic:{liters}` | Water fill | `200` |
| POST | `Command/TurnOn` | Heater on | `200` |
| POST | `Command/TurnOff` | Heater off | `200` |
| POST | `Command/Speed:{speed}` | Set agitator speed | `200` |
| POST | `Command/AgitatorInterval:""` | Set agitator interval body | `200` |
| POST | `next` | Advance process step | `200` |
| POST | `Confirm/{confirmState}` | Confirm waiting state | `200` |

## Socket.io

- URL is derived from `BaseURL` by replacing leading `http` with `ws`.
- `WebSocketController` uses `socket.io-client` and subscribes to event name `overheat`.
- On `overheat`, it calls the configured handler with `{ event: 'overheat', data }`.
- Needs verification: production epic currently parses `event.data` as JSON, which does not match the controller handler object shape.

## Normalized brewing status expected by UI

Preferred structured schema:

```ts
interface BrewingStatus {
  elapsedTime: number;
  currentTime: number;
  process: { state: 'IDLE' | 'ACTIVE' | 'FINISHED' | 'ABORTED' | 'ERROR' };
  currentStep: {
    index?: number;
    count?: number;
    phase: 'NONE' | 'MASHING_IN' | 'RAST' | 'MASHING_OUT' | 'COOKING' | 'COOLING' | 'FINISHED';
    mode: 'NONE' | 'HEATING' | 'HOLDING' | 'TIMER_RUNNING' | 'WAITING' | 'FINISHED' | 'ERROR';
    name?: string;
    duration?: number;
    elapsedTime?: number;
    remainingTime?: number;
    type?: string;
  };
  temperature: { current?: number; target?: number };
  hardware: { heater?: string; agitator?: string };
  waiting: { waitingFor: WaitingFor; canConfirm: boolean };
  error: { code?: string | null; details?: string | null };
}
```

Legacy fallback fields still accepted by `normalizeBrewingStatus`: `Temperature`, `TargetTemperature`, `StatusText`, `HeatingStates`, `Name`, `Type`, `WaitingStatus`, `HeatUpStatus`, `AgitatorStatus`, `index`, `elapsedTime`, and `currentTime`.

