# Realtime communication optimization

## 1. Scope and baseline

Implemented across Braumeister and Brauhaus2, based on master commits
`536409f611193266480060128f00a89f6b6ea2d9` and
`e21642866a5b230f3cd93d743275e0bc132458cc`, respectively.
The fetched master heads matched the analysis references.

No deployment, database operation, real brewing run, physical GPIO access,
automatic commit or push was performed. Test hardware is stubbed.
Temperature acquisition/rounding, temperature regulation, water GPIO callbacks,
calibration, valve operations, cutoff, no-flow/max-duration limits and start/stop
serialization are unchanged. The explicitly requested process duration clock
change is described below.

## 2. Architecture

Process threads capture immutable status into ProcessStatusStore. The existing
single StatusTransport worker broadcasts latest-state observations. All network
calls remain outside the process/sensor/hardware threads and transport locks.
The water status setter only normalizes/captures data and offers an in-memory
mailbox. It never emits Socket.IO, including while called from water code holding
its existing lock. There is no new work in the GPIO pulse callback.

Socket.IO remains `/socket.io` on namespace `/`, with `/api/controller` supported
for compatibility. HTTP retains commands, startup/repair reads and fallback.
No frontend timer issues a process, confirmation or water command.

## 3. Independent revisions and acceptance

The version-1 process envelope adds `telemetryRevision`, `timeAnchorSequence`
and `timeAnchor`. Existing `controllerEpoch`, `processInstanceId`, `revision`,
`stateRevision` and `status` remain. `revision` still orders changed internal
captures; time-only captures do not cause network telemetry. `stateRevision`
retains its existing meaning and optional confirmation preconditions.

`telemetryRevision` increases only for changed current/target temperature or a
new process. `timeAnchorSequence` orders anchors. Both are epoch scoped. They
are compared in their own stream, never against water revision or a telemetry-
advanced process revision. Telemetry is additionally bound to process identity
and the matching semantic stateRevision.

Frontend Redux keeps semantic `brewingStatus`, `telemetry`, `timeAnchor`,
`waterStatus`, communication metadata and history version separately. Matching
semantic snapshots retain their object identity while independent streams can
advance. Old revisions, old connection-generation responses and retired epochs/
water fill IDs cannot overwrite their successors. New controller epochs require
explicit HTTP synchronization before replacing an already known epoch.

REST process bodies remain unchanged. Atomic response metadata adds headers:

- `X-Telemetry-Revision`
- `X-Time-Anchor-Sequence`
- `X-Time-Anchor` (compact JSON)

Deploy the coordinated controller/frontend changes together: older mobile clients
relied on periodic timing telemetry. REST bodies remain compatible, but an old UI
needs its HTTP-fallback flag during a mixed-version rollout to refresh those
displays. Existing rollback flags remain `BREWMASTER_PROCESS_REALTIME=false`
(controller process events) and `REACT_APP_PROCESS_REALTIME=false` (frontend build).
Hardware and water observations remain independent of the process-event flag.

Existing process metadata headers remain. CORS exposes the additions and OpenAPI
documents them. Unversioned/previous version-1 controllers retain the old acceptance
path; they do not downgrade an already versioned controller.

## 4. Time anchors and drift

An anchor contains sequence, step ID/index, phase/mode, elapsed seconds, step
elapsed seconds, optional duration/remaining seconds, `running`, `stepRunning`,
and `sampleAgeSeconds`. Identity is supplied by its enclosing process metadata.
The running flags describe display progression, not new process enum states.
For RAST heat-up, process elapsed advances while the rest timer remains at zero.

Full snapshots/HTTP reads deliver anchors for semantic transitions, timer/step/
mode changes, duration changes, recovery and connect/reconnect. A running clock
also gets an anchor in the application heartbeat. Mailbox age is added at send
time, including targeted connect snapshots. Monotonic epochs are never persisted
or compared against a browser clock.

Desktop and mobile use ProcessTimeProjection with performance.now(). A display
interval requests recomputation; it never counts callbacks. Delayed/background
callbacks therefore project from elapsed monotonic time. Equal values do not
cause new React state, and stopped clocks do not own running intervals.

For the same process/step/timer identity, deviations below 250 ms preserve display
continuity, deviations from 250 ms through 2 s converge over 10 s, and deviations
above 2 s snap to the authoritative value. Identity, mode or duration changes
reset the anchor. Values are clamped for display only; reaching zero cannot end
a controller step. Existing hop reminders remain notifications only.

On pageshow/return to visible, the socket adapter requests resynchronization.
This also addresses platforms whose performance clock does not span OS standby.
Disconnected/stale displays stop local extrapolation until repaired.

A new RTT endpoint was not introduced: the existing LAN-oriented second display
uses relative controller durations and sample age without assuming equal wall
clocks. One-way network delay remains a bounded display uncertainty under normal
LAN conditions, not a control input. A remote/high-latency deployment may justify
a future read-only RTT exchange; it is not needed for controller correctness.

## 5. Telemetry and history

The transport compares independent telemetry watermarks, so elapsed/remaining
time alone publishes neither a full status nor brewing-telemetry. Changed integer
temperature values are transmitted using the existing precision; no additional
0.1-degree quantization/deadband changes regulation. Semantic target changes
remain immediate full snapshots. Existing sensor health/identity events remain
independent and immediate.

Sensor snapshots serve current sensor display/health; the process stream serves
brew history. History only consumes accepted process data, so the same sample
arriving by full snapshot, telemetry or HTTP does not create duplicates. Time
anchors/heartbeats never create temperature measurements. Relevant temperature/
target changes and process boundaries are retained; elapsed-only updates are not.
Missing temperature is null, not 0. History limits stay 1000/group and 5000 total.

## 6. Water publication

WaterStatusStore observes the existing WaterStatus without owning water control.
`water-filling-state-changed` is a complete flat version-1 snapshot:

```json
{
  "schemaVersion": 1,
  "controllerEpoch": "runtime-epoch",
  "waterFillingRevision": 42,
  "fillId": "operation-id",
  "mode": "MASH",
  "state": "RUNNING",
  "filledLiters": 0.1234,
  "targetLiters": 1.0,
  "openClose": true,
  "reason": null,
  "error": null
}
```

Enums remain AUTO/MANUAL/MASH/SPARGE and
IDLE/STARTING/RUNNING/COMPLETED/STOPPED/ERROR. No flow-rate calculation was added.
Water revision orders exact changed water snapshots. Publication compares the
last broadcast: operation/lifecycle/target/valve/reason/error changes publish
immediately, RUNNING volume changes publish at >=0.1 liter. Values themselves
retain four decimal places. Terminal values always bypass the volume threshold.

Connect/reconnect suppliers read the latest exact snapshot, targeted to the new
client. Observation works for a second client/browser restart without any local
start command. Water is scoped to controller epoch and fillId, not brew process ID.

GET WaterStatus keeps liter/valve/lifecycle fields and adds atomic response headers
`X-Controller-Epoch` and `X-Water-Filling-Revision`, with no-store caching.
Initial socket water state is a complete IDLE; raw legacy status normalization
remains compatible. The displayed quantity remains operation-local, not an
independent measurement of vessel contents.

## 7. Water fallback, freshness and retained stop policy

Central water observation replaces polling owned by the local start command.
One initial status read after successful start establishes operation identity.
Healthy synchronized observation performs no regular HTTP water polling.
Connect waits up to 2 s for its snapshot before reading. Disconnect marks the
last value stale and starts an immediate read, followed by approximately 1 Hz
fallback while a fill is active/pending. Reconnect/synchronized water snapshots
stop fallback. Requests are serialized, timeout at 8 s and abort on replacement/
connection-generation changes. Failed reads, including malformed successful responses, never mean 0 liters or
closed valve. While socket synchronization is unavailable, the existing 20 s
availability check also discovers fills started later by another client, even
if the previous observed water state was IDLE.

During STARTING/RUNNING the transport emits a compact `water-filling-heartbeat`
about every 2 s: schemaVersion, controllerEpoch, last published water revision,
fillId and sourceAgeSeconds. The source age is refreshed only by real water
status offers, including unchanged controller observations. It cannot be refreshed
by a generic process heartbeat. A source age over 4 s does not validate freshness.
The frontend checks active water freshness every second and triggers read-only
repair after 4 s without confirmation. The 15 s general heartbeat cannot mask it.

The pre-existing UI safety policy is retained explicitly for locally initiated
fills: an actual HTTP observation failure attempts the existing HTTP stop; a
30-minute client safeguard and the legacy 10-second not-started check remain.
Socket disconnect alone does not stop water. An observing second client never
stops another client's fill merely because its own status read fails. These are
retained HTTP safeguards, not decisions based on projected liters. Controller
cutoff/no-flow/max-duration behavior remains independently authoritative.

This retained policy is intentionally documented rather than silently removed.
Making all communication-failure stop policy controller-only would require a
separate safety-contract decision.

## 8. General heartbeat and reconnect

brewing-status-heartbeat now defaults to 15 s and contains schemaVersion,
controllerEpoch, processInstanceId, stateRevision, delivered telemetryRevision,
delivered waterFillingRevision and (while running) the ordered compact time anchor.
Legacy revision remains for previous clients. It never contains a full status.
The frontend compares semantic/stream watermarks instead of internal time-driven
revision growth. Missing newer published state requests HTTP synchronization.

General stream silence is checked every 5 s against a 40 s threshold, allowing
heartbeat jitter. Socket disconnect remains immediate. Socket.IO ping/pong is
transport liveness, separate from application state/producer freshness. Commands
remain HTTP and are not resent on reconnect. Process fallback retains its 10 s
cadence, 8 s timeout and connection-generation guards.

## 9. UI and charts

Small TimedProcessList, live timeline and mobile elapsed components own display
ticks. The entire Production view no longer rerenders every second. The timeline
caches recipe/semantic/history model data independently of the moving cursor.
Curve data and chart instance stay stable across cursor updates. Measured sample
coordinates use the cumulative authoritative axis, including step-local resets;
local cursor movement does not synthesize measurement points. Missing readings
remain gaps, including historical chart interpolation.

The pre-existing missing getTargetTemperature import in Production was restored
so the production build can type-check the touched view.

## 10. Monotonic controller time

Process duration timing now uses an injectable process_clock.monotonic source:
step start/update, heat-up duration/timeout, confirmation/decoction wait timeout,
and timed rest/cooking fallback paths. Wall time remains for real timestamps/logs.
Recovery persists elapsed seconds as before, never a monotonic timestamp. A fresh
runtime reconstructs a new monotonic anchor minus the one-shot saved elapsed
offset. Existing process states, predicates, heater decisions and durations are
unchanged. Simulated complete brewing/recovery and wallclock-jump tests passed.

## 11. Automated validation

Final validation results:

| Check | Result |
| --- | --- |
| Braumeister full suite | 587 passed |
| Brauhaus2 targeted communication/UI suite | 142 passed, 14 suites |
| TypeScript `tsc --noEmit` | Passed |
| CRA production build | Passed |
| Complete UI comparison run, with Axios CJS mapping | 883 passed, 138 failed; 29 failing / 107 suites |
| Untouched reference master, same complete UI command | 758 passed, 244 failed; 30 failing / 102 suites |

All failed test descriptions in the complete implementation comparison also
occurred on the reference master; no additional failing description was found.
The final targeted run also includes the subsequently added malformed-response
and idle-to-active rediscovery cases. The whole UI suite is **not** green.

Controller command (587 passed):

```sh
BREWMASTER_LOG_PATH=/workspace/work/controller-tests.log /workspace/work/venv/bin/pytest -q
```

The log path redirects generated logs outside the repository; no tracked log
artifact is retained.

Frontend checks use the installed lockfile dependencies without modifying
package.json/package-lock.json:

```sh
node node_modules/typescript/bin/tsc --noEmit
CI=true node node_modules/react-scripts/bin/react-scripts.js build
CI=true node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand --silent --moduleNameMapper '{"^axios$":"<rootDir>/node_modules/axios/dist/node/axios.cjs"}'
```

The successful targeted run uses the same test command plus `--runTestsByPath`
for productionEpics, statusCommunicationEpics, waterCommunicationEpics, snapshot,
streams, ProcessTimeProjection, waterSnapshot, DataCollector, timeline/model,
TimedProcessList, MobileProductionView.realtime, WebSocketController and
ProductionRepository tests.

Tests cover independent revision ordering, delayed HTTP, epochs, semantic transitions,
no time-only telemetry, 15 s heartbeat, precise water thresholds/terminal values,
multi-client snapshots, fallback, stale water source, aborting requests, retained
local stop policy, display drift, mobile/desktop clocks, history and chart reuse.

The existing frontend Jest/CRA setup encounters Axios ESM parsing under the
installed locked dependencies. Targeted validation maps Axios to its shipped CJS
entry via CLI; no dependency or lockfile change is needed. Existing obsolete UI
expectations also fail on the untouched reference master, independently of this
change. Do not represent the repository-wide UI suite as wholly green.

## 12. Remaining risks / tests not performed

No physical GPIO, live HTTP controller, real sensor/valve/relay, database or
deployment tests ran. Single-worker Gunicorn remains required. Delivery is latest
state, not a lossless event log. Pi load/proxy latency and OS-specific standby need
target validation. Existing 70 L UI limits are not a new controller-side vessel
capacity guarantee. Unbounded legacy manual filling remains supervised and still
requires explicit stop; it does not acquire automatic pulse-worker safety rules.

## 13. Manual Raspberry Pi verification

Only after deliberate deployment and operator preparation:

1. Verify Caddy preserves new metadata headers and Socket.IO upgrades.
2. Compare two clients at connect/reconnect and during an already running fill.
3. Check constant-temperature traffic: no elapsed-only process/telemetry events.
4. Check 15 s process and active 2 s water heartbeats; break each publication path
   separately and confirm the corresponding freshness/fallback UI.
5. Verify desktop/mobile timers after backgrounding, laptop suspend and recovery.
6. Under controlled hardware supervision, verify unchanged calibration, measured
   cutoff, valve close/after-run, no-flow/max-duration and manual stopping.
7. Measure Pi CPU/RAM and transport backlog during multi-client operation.

Physical behavior remains **Needs verification** until these checks are performed.
