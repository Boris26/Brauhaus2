# Fermentation detail data loading

## Root cause found in Brauhaus2

There is no interval or timer in the fermentation detail component. Its mount effect requests the aggregate once, and measurement mode requests the default bubble range once. The repeated traffic came from WebSocket invalidations: every `FERMENTATION_DATA_CHANGED/MEASUREMENT` and selected gateway status transition dispatched `Fermentation.LOAD`. That aggregate read fanned out into `recipe-actions`, `measurements`, `devices`, and `sensor-measurements`. A bubble invalidation similarly re-read the complete selected bubble range. Manual measurement creation also reloaded the aggregate.

`/measurements` is the canonical BeerDataStore history for beer/inside temperature, ambient/outside temperature, Plato, provenance (`MANUAL | SENSOR`), sensor/source IDs, timestamp and note. The UI chart and current values use it. The old `/sensor-measurements` consumer used only its timestamp for a “sensor last seen” label even though its DTO also contained duplicate beer and ambient temperatures plus bubble fields. Bubble count, window duration, and differential pressure are already consumed through the dedicated `/bubble-activity` API. The BeerDataStore repository/collection implementation is outside this repository, so the concrete database collection and service classes are **Needs verification** there; the cross-repository contract requires normal temperature persistence to be `FermentationMeasurements`, not a parallel sensor history.

## Implemented request lifecycle

- Page open: one parallel read each for `recipe-actions`, canonical `measurements`, and `devices`; measurement mode additionally reads the selected `/bubble-activity` range once.
- Live operation: persisted `FERMENTATION_MEASUREMENT_RECORDED` and `FERMENTATION_BUBBLE_ACTIVITY_RECORDED` WebSocket payloads append to Redux. IDs (or device ID plus sequence for bubble windows) deduplicate repeated messages. Legacy invalidations no longer trigger history reads.
- Manual measurement creation: the canonical POST response is appended without a follow-up aggregate GET.
- Reconnect: each loaded beer with a last measurement requests only `GET .../measurements?afterId=<last-id>` and merges the returned suffix. Reconnect does not start polling.
- Assignment, unassignment, alias changes, action skip, and explicit lifecycle changes retain their command-specific canonical reload behavior because they are infrequent user commands, not telemetry.

## Cross-repository requirements

BeerDataStore must support ordered, exclusive `afterId` reads and return canonical `FermentationMeasurement` DTOs. The gateway path must publish the two persisted-record events only after BeerDataStore persistence succeeds. Event delivery and the endpoint deployment are **Needs verification** in BeerDataStore/FermentationSensorGateway. During a mixed-version rollout, old invalidations are safely ignored, but live points appear only after the new event contract is deployed; reconnect recovery likewise requires `afterId` support.
