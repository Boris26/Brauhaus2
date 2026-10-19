# Consistent production temperature timeline

## Scope and clock semantics

This is the coordinated Braumeister/Brauhaus2 implementation. It adds an
independent cumulative brew clock and replayable physical temperature observations.
Existing `elapsedTime`, `currentStep.elapsedTime`, duration, remaining time,
countdown, recipe timing, confirmation commands and hardware predicates retain
all their existing meanings and units. No product database schema changes are
required; no deployment or live hardware/database operations were made.

The cumulative clock begins with the first accepted ACTIVE process snapshot.
Every ACTIVE phase counts: HEATING, TIMER_RUNNING, HOLDING, confirmation WAITING,
and transitions between steps. Explicit `process.paused: true`, IDLE, terminal
FINISHED/ABORTED/ERROR, and the downtime before explicit recovery do not count.
There is no new pause command; pausing the agitator does not pause the brew clock.
A clean application shutdown suspends observation before its cancellation abort,
so it does not relabel an interrupted brew as a normally completed history.

Seconds are derived from the controller's monotonic clock. Wall time is used only
for UTC `startedAt` and physical observation `measuredAt`, never for elapsed time.
A browser uses monotonic display projection. Local step resets cannot reset or
advance the cumulative clock. The now marker never depends on the most recent
measurement. Long confirmation waits and OS standby are repaired by source-age
observations even when the underlying status anchor sequence has not changed.

## Additive data contract

Current process status adds optional `timeline` (schemaVersion 1):

- `timelineId`: logical brew-history identity, distinct from runtime controller
  epoch and process instance ID.
- `processElapsedSeconds`, `running`: authoritative cumulative seconds and whether
  that clock advances.
- `startedAt`: UTC ISO timestamp of the logical start.
- `origin`: PROCESS_START, or RECOVERY when earlier history could not be restored.
- `phaseSequence`, `phaseStartedAtSeconds`: independent actual phase boundary.
- `historyCursor`: highest physical observation sequence; IDs are never reused
  within a timeline, including after retention.
- `retentionVersion`: changes when observations are removed by bounds.
- `durable`: whether the local persistence layer is available.

Existing time anchors add `timelineId`, `processElapsedSeconds`, and
`processRunning`. Their existing elapsed/step fields and running flags remain
local timer fields. Status/telemetry acceptance, epoch and generation guards,
transport namespace/path and the existing HTTP fallback remain intact.

The existing recovery JSON checkpoint additively carries only
`status.timeline.{timelineId,processElapsedSeconds,startedAt}`. It contains no
sensor identity, temperature measurements, GPIO state or hardware outputs. The
existing BeerDataStore JSON-envelope route already preserves these optional
properties: no schema migration or changes to that repository are needed.
Periodic checkpoint writes refresh the cumulative clock even during a long wait,
without additional writes from the control loop or altered step timing.

Recovery joins local history only when its timeline ID and BrewSession match.
The same recipe alone cannot join unrelated brews. Matching recovery preserves
sequence, boundaries, identity and the latest durable cumulative seconds, then
starts a new monotonic runtime segment. If the local file is missing, cumulative
time can still resume from the additive recovery checkpoint; a new history ID
and RECOVERY origin make the missing earlier samples explicit. Older checkpoints
without this information start a clearly marked partial history at zero rather
than estimating actual past time from recipe plans.

## Measurement acquisition and transport

DS18B20Controller has a separate acquisition listener. It reports each completed
read cycle, including unchanged values and explicit failed-read observations,
without replaying a cached value as a new reading. Startup/discovery state,
heartbeats, phase changes, telemetry and status refreshes never create physical
samples. Existing whole-Celsius sensor rounding and hardware regulation are
unchanged. Sensor callbacks only update memory; they perform no SQLite or HTTP I/O.

Each observation has `sequence`, `processElapsedSeconds`, UTC `measuredAt`,
nullable `temperature` and `targetTemperature`, `phaseSequence`, step metadata,
and the unchanged local status `elapsedTime` for legacy export compatibility.
The identity is `(timelineId, sequence)`, not temperature value or rounded second.
Multiple acquisitions within one second are retained. Invalid readings stay null;
status values cannot overwrite a physical observation or a gap.

GET `/ProcessTimeline` is a side-effect-free, no-store, cursor read and does not
initialize GPIO. Optional query fields are `timelineId`, exclusive
`afterSequence`, and `retentionVersion`. Responses contain runtime
`controllerEpoch`/`processInstanceId`, the clock, retained phase intervals,
measurements, `nextSequence`, `reset`, and compact `retainedRanges` pairs.

The first read (`afterSequence=0`) returns all retained observations and reset=true.
Later reads return only newer retained observations. The ranges describe which
previous IDs still exist, so retention removes client points without replaying
5000 rows on every subsequent sensor reading. Missing sequence ranges become
explicit line breaks, not interpolated temperatures. Invalid cursors return 400,
unknown/mismatched timelines 404, unexpected read failures 500. All routes and
schemas are documented in the controller's OpenAPI contract.

Brauhaus2 performs serialized, timeout/abort-protected cursor reads every two
seconds while the process is active, independently of latest-state telemetry.
Reads also repair reconnects. An unsuccessful terminal drain retries; successful
terminal synchronization stops the periodic reads. Old connection generations,
controller epochs, process instances and timelines cannot overwrite a successor.
A final validated read precedes finished-brew export; failure leaves saving
retryable instead of silently saving an incomplete final view.

## Bounded local persistence

The current timeline is stored in a new application-owned SQLite file, using only
Python's standard library. `BREWMASTER_TIMELINE_PATH` overrides its location;
default is `temperature-timeline.sqlite3` alongside the existing
`BREWMASTER_RUNTIME_STATE_PATH` settings file. This follows Develop `.runtime/`
and Production persistent `Control/data/` settings placement without changing
startup/deployment scripts.

An independent worker checkpoints about once per second. SQLite stores new rows
incrementally and prunes removed rows within the same transaction as clock/phase
metadata. It closes connections explicitly and does not repeatedly write stopped,
unchanged histories. At most 1000 measurements per step/phase/mode group and 5000
overall are kept. First group samples are preferred as anchors; phase intervals
are retained independently of temperature detail. Reloads and lost connections
replay this retained history. The next actual brew replaces the current local
history; finished-brew exports remain the archive.

A sudden power loss may lose observations/time not yet committed by the worker.
A durable recovery checkpoint can supply a later known cumulative offset, but
missing temperatures are never recreated. Persistence failures keep memory
observation available and expose durable=false. An unreadable, corrupt or unknown
storage version is preserved, not automatically overwritten or reinterpreted;
operator repair/backup and restart are required to enable persistence again.
There is no automatic process recovery or restart of hardware.

## Timeline and archive rendering

Measured X coordinates come directly from cumulative observation time. Actual
phase intervals are independent from measurements and cannot move when old
measurement details are trimmed. A new status boundary is usable immediately,
before the next history read. Completed bands retain their actual boundaries.

The live chart caches historical points and recipe/phase structure. A small
projection extends only the active band and shifts only future planned steps.
Overdue heat-up remains the active band; the marker cannot run into an unchanged
planned successor. Historical measurements are not moved. Point objects are
reused across incremental reads and retention changes, keys are stable, chart
animation is disabled, and clock ticks do not remount the chart. Responsive resize
notifications are debounced. Pure DISPLAY rows still consume no thermal time.

Progress, time-axis ticks, target curves and tooltips use the same cumulative
coordinates. The target curve retains its separate step-after presentation;
physical missing readings are never filled from target or stale process status.
Mobile/desktop display projection shares the cumulative clock, while countdown
and hop reminders continue to use local step time. Explicitly paused timers
retain their remaining value without advancing.

New `brewValues` exports are explicitly schemaVersion 2 and retain `groupedData`
alongside canonical `timeline`, `phases`, and `measurements`. Local `elapsedTime`
is not rewritten. BrewProcessChart reads canonical coordinates directly for v2
instead of adding them as if they were local durations. Its process filter remains
available. Unversioned archives retain their existing legacy interpretation and
are neither migrated nor rewritten automatically.

Older controllers remain supported by the legacy status path. Its actual total
time and missing physical samples cannot be reconstructed where the old protocol
never supplied them. The chart fixes remove double cursor advancement and stale
point replacement there as well; full acquisition/reload guarantees require the
coordinated new controller contract. With no actual observation, the default
fallback temperature is not plotted as a fabricated zero-degree measurement.

## Verification

Hardware tests use stubs and isolated temporary persistence files. No GPIO,
productive database, controller deployment or outbound control commands were used.
Validation results and changed-file lists are recorded below for this task.


## Implementation verification report — 2026-10-19

The fixes cover independent clock projection, real identical acquisitions,
null/stale measurement handling, actual phases and overrun, reload/reconnect,
recovery identity and clock retention, bounded persistence, incremental retention,
versioned archives, and stable chart/history reuse. No deployment was performed.
BeerDataStore source and product databases were not modified.

| Validation | Result |
| --- | --- |
| Braumeister complete pytest suite | 605 passed |
| Brauhaus2 focused timeline/communication/display/repository/export suite | 193 passed in 19 suites |
| TypeScript `tsc --noEmit` | Passed |
| CRA production build | Passed |
| Complete frontend run | 920 passed; 138 failed in 29 failing suites |
| Unchanged frontend HEAD, same dependencies and command | 884 passed; the same 138 failing tests |
| Comparison of failed assertion names | No new failing assertion; existing pre-assertion suite failure also reproduces on baseline |
| Whitespace/diff checks | Passed |

The full run preceded the two additional final-export tests; both were then
included in the passing 193-test focused run. The existing frontend failures
include older Production, process-list, recipe/settings, routing and other UI
expectations. This report does not claim the whole frontend suite is green.
The baseline was extracted from the unchanged HEAD without creating a commit or
modifying either working tree. Dependency/lock files were not changed.

Regression coverage includes unchanged/changed/zero/null sensor readings,
duplicate delivery, no heartbeat/status-generated physical samples, independent
cumulative/step clocks, step resets and HEATING-to-TIMER_RUNNING transitions,
waits, explicit pauses, wall-clock jumps, OS standby, actual phase boundaries,
overdue heating, recovered timer remaining duration, reload/reconnect and stale
responses, process replacement, current-history bounds, compact retention,
SQLite reload/corruption preservation, recovery identity and periodic checkpoint
clock refresh, v2/legacy archives, final-drain retry, and chart/data reuse.

Commands used include:

```sh
# Controller, isolated venv with GPIO/hardware test stubs:
BREWMASTER_LOG_PATH=/workspace/work/timeline-tests.log /workspace/work/timeline-venv/bin/pytest -q
# Frontend, installed lockfile dependencies:
node node_modules/typescript/bin/tsc --noEmit
CI=true node node_modules/react-scripts/bin/react-scripts.js build
CI=true node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand --silent --moduleNameMapper '{"^axios$":"<rootDir>/node_modules/axios/dist/node/axios.cjs"}'
```

The focused run uses the same Jest command with explicit timeline, collector,
projection, snapshot/streams, countdown, timed-process panel, mobile realtime,
status/production/history epics, reducer, repository and archive/export test paths.

### Migration and remaining limits

No existing measurement or elapsedTime values are rewritten. New local SQLite
storage is created automatically by the controller at its configured runtime
location, and new finished-brew JSON is explicitly version 2. Existing archives
and older controller payloads retain the legacy path; unknown archive/storage
versions are not silently reinterpreted. Deploy both repositories together to
obtain the full clock/acquisition guarantees; no deployment was executed here.
The optional clock fields use the existing generic recovery JSON envelope and
require no product database migration.

History remains deliberately bounded and keeps only the current local brew.
An abrupt process/power loss can lose the worker's not-yet-committed tail.
Missing/corrupt local history and old recovery checkpoints cannot recreate
measurements that were never persisted; the partial-history origin and durable
state expose those limits. Real Pi disk latency, actual hardware acquisition,
reverse-proxy deployment, and real-browser resize/standby behavior remain
**Needs verification**. Automated checks ran without controlling real hardware.

### Changed files

Paths below are relative to the named repository. The list includes tests and
contract documentation, in addition to application files.

Brauhaus2:

- `docs/codex/compatibility/compatibility-checklist.md`
- `docs/codex/compatibility/cross-repo-contracts.md`
- `docs/codex/data-flow.md`
- `docs/codex/domain-model.md`
- `docs/codex/exports/ui-context-for-control.md`
- `docs/codex/exports/ui-visible-data.md`
- `docs/codex/external/control-context.md`
- `docs/codex/interfaces.md`
- `docs/codex/known-risks.md`
- `src/actions/actions.ts`
- `src/containers/MainView/FinishBrewsBeers/BrewProcessChart/BrewProcessChart.tsx`
- `src/containers/MainView/FinishBrewsBeers/FinishedBrewDetails/FinishedBrewDetails.tsx`
- `src/containers/Production/Production.connect.ts`
- `src/containers/Production/Production.tsx`
- `src/containers/Production/TemperatureTimeline/ProductionTemperatureTimeline.test.tsx`
- `src/containers/Production/TemperatureTimeline/ProductionTemperatureTimeline.tsx`
- `src/containers/Production/TemperatureTimeline/temperatureTimelineModel.ts`
- `src/epics/statusCommunicationEpics.ts`
- `src/model/BrewRecovery.ts`
- `src/model/brewingStatus.types.ts`
- `src/reducers/productionReducer.ts`
- `src/repositorys/ProductionRepository.ts`
- `src/store.ts`
- `src/utils/DataCollector/dataCollector.test.ts`
- `src/utils/DataCollector/dataCollector.ts`
- `src/utils/brewingStatus/ProcessTimeProjection.test.ts`
- `src/utils/brewingStatus/ProcessTimeProjection.ts`
- `src/utils/brewingStatus/normalizeBrewingStatus.ts`
- `src/utils/brewingStatus/snapshot.ts`
- `src/utils/brewingStatus/streams.ts`
- `src/utils/brewingStatus/useProcessDisplayTime.ts`
- `docs/codex/temperature-timeline.md`
- `src/containers/MainView/FinishBrewsBeers/BrewProcessChart/BrewProcessChart.test.tsx`
- `src/containers/Production/ProductionTimelineExport.test.tsx`
- `src/containers/Production/TemperatureTimeline/authoritativeTimeline.test.ts`
- `src/epics/timelineHistoryEpic.test.ts`
- `src/epics/timelineHistoryEpic.ts`
- `src/model/ProcessTimeline.test.ts`
- `src/model/ProcessTimeline.ts`
- `src/testUtils/processTimeline.ts`
