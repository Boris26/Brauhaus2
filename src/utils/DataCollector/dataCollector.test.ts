import {dataCollector, MAX_MEASUREMENTS_PER_STATUS_GROUP, MAX_TOTAL_MEASUREMENTS} from './dataCollector';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';
import {clock, history, modernStatus, phase, reading} from '../../testUtils/processTimeline';
import {parseRecordedTimelineExport} from '../../model/ProcessTimeline';

const createStatus = (aTemperature: number): BrewingStatus => ({
  elapsedTime: aTemperature,
  process: {state: ProcessState.ACTIVE},
  currentStep: {
    index: 1,
    phase: ProcessPhase.RAST,
    mode: ProcessMode.HEATING,
    name: 'Rast',
  },
  temperature: {
    current: aTemperature,
    target: 65,
  },
  waiting: {
    waitingFor: WaitingFor.NONE,
    canConfirm: false,
  },
  error: {},
});

describe('dataCollector', (): void => {
  beforeEach((): void => {
    dataCollector.reset();
  });

  it('does not collect time-only updates and retains null as a measurement gap', () => {
    const status = createStatus(40);
    dataCollector.setBrewingStatus(status);
    dataCollector.setBrewingStatus({...status, elapsedTime: 100});
    expect(dataCollector.getMeasurementCount()).toBe(1);
    dataCollector.setBrewingStatus({...status, temperature: {current: undefined, target: 65}});
    expect(dataCollector.getTimelineMeasurements().at(-1)?.Temperature).toBeNull();
    dataCollector.setBrewingStatus({...status, currentStep: {...status.currentStep, index: 2}});
    expect(dataCollector.getMeasurementCount()).toBe(3);
  });

  it('clears collected measurements on reset', (): void => {
    dataCollector.setBrewingStatus(createStatus(40));

    expect(dataCollector.getMeasurementCount()).toBe(1);

    dataCollector.reset();

    expect(dataCollector.getMeasurementCount()).toBe(0);
    expect(dataCollector.getAllDataAsJSONString()).toBe(JSON.stringify({groupedData: {}}, null, 2));
  });

  it('keeps the process boundary and newest measurements when a status group exceeds the maximum', (): void => {
    for (let aIndex = 0; aIndex < MAX_MEASUREMENTS_PER_STATUS_GROUP + 5; aIndex += 1) {
      dataCollector.setBrewingStatus(createStatus(aIndex));
    }

    const aParsedData = JSON.parse(dataCollector.getAllDataAsJSONString()) as {
      groupedData: Record<string, Array<{ Temperature: number }>>;
    };
    const aMeasurements = Object.values(aParsedData.groupedData)[0];

    expect(dataCollector.getMeasurementCount()).toBe(MAX_MEASUREMENTS_PER_STATUS_GROUP);
    expect(aMeasurements[0].Temperature).toBe(0);
    expect(aMeasurements[1].Temperature).toBe(6);
    expect(aMeasurements.at(-1)?.Temperature).toBe(MAX_MEASUREMENTS_PER_STATUS_GROUP + 4);
  });

  it('bounds the total across many distinct status groups', (): void => {
    for (let index = 0; index < MAX_TOTAL_MEASUREMENTS; index += 1) {
      dataCollector.setBrewingStatus({
        ...createStatus(index),
        currentStep: {...createStatus(index).currentStep, index, name: `step-${index}`},
      });
    }

    expect(dataCollector.getMeasurementCount()).toBe(MAX_TOTAL_MEASUREMENTS);
    expect(dataCollector.getTimelineMeasurements()).toHaveLength(MAX_TOTAL_MEASUREMENTS);

    for (let index = MAX_TOTAL_MEASUREMENTS; index < MAX_TOTAL_MEASUREMENTS + 25; index += 1) {
      dataCollector.setBrewingStatus({
        ...createStatus(index),
        currentStep: {...createStatus(index).currentStep, index, name: `step-${index}`},
      });
    }

    const parsed = JSON.parse(dataCollector.getAllDataAsJSONString()) as {groupedData: Record<string, unknown[]>};
    expect(dataCollector.getMeasurementCount()).toBe(MAX_TOTAL_MEASUREMENTS);
    expect(dataCollector.getTimelineMeasurements()).toHaveLength(MAX_TOTAL_MEASUREMENTS);
    expect(Object.keys(parsed.groupedData)).toHaveLength(MAX_TOTAL_MEASUREMENTS);
    expect(dataCollector.getTimelineMeasurements().at(-1)?.Temperature).toBe(MAX_TOTAL_MEASUREMENTS + 24);
  });
});

describe('physical acquisition history', () => {
  beforeEach(() => dataCollector.reset());

  it('collects identical acquisitions and null gaps once, without status-generated samples', () => {
    dataCollector.setBrewingStatus(modernStatus());
    dataCollector.setBrewingStatus(modernStatus({elapsedTime: 100}));
    expect(dataCollector.getMeasurementCount()).toBe(0);
    const page = history([reading(1, 60), reading(2, 60), reading(3, 61), reading(4, null), reading(5, 0)]);
    dataCollector.applyTimelineHistory(page);
    const snapshot = dataCollector.getTimelineSnapshot();
    expect(snapshot.measurements.map(p => p.Temperature)).toEqual([60, 60, 61, null, 0]);
    expect(dataCollector.applyTimelineHistory(page)).toBe(false);
    expect(dataCollector.getTimelineSnapshot()).toBe(snapshot);
  });

  it('repairs browser reloads and reconnect gaps through exclusive sequence reads', () => {
    const all = [reading(1), reading(2), reading(3), reading(4)];
    dataCollector.applyTimelineHistory(history(all.slice(0, 2)));
    const old = dataCollector.getTimelineSnapshot().measurements[0];
    expect(dataCollector.getHistoryCursor().afterSequence).toBe(2);
    dataCollector.applyTimelineHistory(history(all.slice(1), {reset: false}));
    expect(dataCollector.getTimelineSnapshot().measurements).toHaveLength(4);
    expect(dataCollector.getTimelineSnapshot().measurements[0]).toBe(old);
    dataCollector.reset();
    dataCollector.applyTimelineHistory(history(all));
    expect(dataCollector.getTimelineSnapshot().measurements.map(p => p.measurementSequence)).toEqual([1, 2, 3, 4]);
  });

  it('replaces bounded retained history, rejects stale pages, and keeps unchanged point identities', () => {
    dataCollector.applyTimelineHistory(history([reading(1), reading(2), reading(3)]));
    const first = dataCollector.getTimelineSnapshot().measurements[0];
    dataCollector.applyTimelineHistory(history([reading(1), reading(3), reading(4)], {
      timeline: clock({historyCursor: 4, retentionVersion: 1})}));
    expect(dataCollector.getTimelineSnapshot().measurements.map(p => p.measurementSequence)).toEqual([1, 3, 4]);
    expect(dataCollector.getTimelineSnapshot().measurements[0]).toBe(first);
    expect(dataCollector.applyTimelineHistory(history([reading(1)]))).toBe(false);
  });

  it('applies compact retention changes without replaying or rebuilding the retained measurements', () => {
    dataCollector.applyTimelineHistory(history([reading(1), reading(2), reading(3)]));
    const first = dataCollector.getTimelineSnapshot().measurements[0];
    dataCollector.applyTimelineHistory(history([reading(4)], {reset: false, retainedRanges: [[1, 1], [3, 4]],
      timeline: clock({historyCursor: 4, retentionVersion: 1})}));
    expect(dataCollector.getTimelineSnapshot().measurements.map(p => p.measurementSequence)).toEqual([1, 3, 4]);
    expect(dataCollector.getTimelineSnapshot().measurements[0]).toBe(first);
  });

  it('preserves recovery identity and exports explicit cumulative coordinates without changing local elapsedTime', () => {
    dataCollector.applyTimelineHistory(history([{...reading(1, 60, 600), elapsedTime: 0}]));
    dataCollector.setBrewingStatus(modernStatus({snapshotMetadata: {...modernStatus().snapshotMetadata!, controllerEpoch: 'restart'}}));
    expect(dataCollector.getMeasurementCount()).toBe(1);
    dataCollector.setBrewingStatus({...modernStatus(), timeline: undefined, process: {state: ProcessState.IDLE}});
    expect(dataCollector.getMeasurementCount()).toBe(1);
    const archive = parseRecordedTimelineExport(JSON.parse(dataCollector.getAllDataAsJSONString()))!;
    expect(archive.schemaVersion).toBe(2);
    expect(archive.measurements[0]).toMatchObject({elapsedTime: 0, processElapsedSeconds: 600});
    dataCollector.beginTimeline(clock({timelineId: 'different-brew'}));
    expect(dataCollector.getMeasurementCount()).toBe(0);
  });

  it('updates phase boundaries without synthesizing a temperature measurement', () => {
    dataCollector.applyTimelineHistory(history());
    dataCollector.applyTimelineHistory(history([], {phases: [phase({endSeconds: 10}), phase({sequence: 2, startSeconds: 10, stepMode: ProcessMode.TIMER_RUNNING})]}));
    expect(dataCollector.getMeasurementCount()).toBe(0);
    expect(dataCollector.getTimelineSnapshot().phases).toHaveLength(2);
  });
});

describe('timeline measurement order', () => {
  beforeEach(() => dataCollector.reset());

  it('preserves collection order when a previous status group becomes active again', () => {
    const heating = createStatus(40);
    const waiting = {...createStatus(41), currentStep: {...createStatus(41).currentStep, mode: ProcessMode.WAITING}};
    dataCollector.setBrewingStatus(heating);
    dataCollector.setBrewingStatus(waiting);
    dataCollector.setBrewingStatus({...heating, elapsedTime: 42, temperature: {...heating.temperature, current: 42}});

    expect(dataCollector.getTimelineMeasurements().map(item => item.Temperature)).toEqual([40, 41, 42]);
  });

  it('reuses a versioned snapshot until timeline data changes', () => {
    dataCollector.setBrewingStatus(createStatus(40));
    const snapshotA = dataCollector.getTimelineSnapshot();
    const snapshotB = dataCollector.getTimelineSnapshot();

    expect(snapshotB).toBe(snapshotA);
    expect(snapshotB.measurements).toBe(snapshotA.measurements);

    // An identical status is not collected and therefore does not invalidate the snapshot.
    dataCollector.setBrewingStatus(createStatus(40));
    expect(dataCollector.getTimelineSnapshot()).toBe(snapshotA);

    dataCollector.setBrewingStatus(createStatus(41));
    const snapshotC = dataCollector.getTimelineSnapshot();
    expect(snapshotC).not.toBe(snapshotA);
    expect(snapshotC.measurements).not.toBe(snapshotA.measurements);
    expect(snapshotC.version).toBe(snapshotA.version + 1);
    expect(snapshotC.measurements.map(item => item.Temperature)).toEqual([40, 41]);
  });

  it('keeps the cached snapshot chronological and consistent after trimming', () => {
    for (let index = 0; index < MAX_MEASUREMENTS_PER_STATUS_GROUP + 5; index += 1) {
      dataCollector.setBrewingStatus(createStatus(index));
    }
    const snapshot = dataCollector.getTimelineSnapshot();
    const sequences = snapshot.measurements.map(item => item.collectionSequence ?? -1);

    expect(snapshot.measurements).toHaveLength(MAX_MEASUREMENTS_PER_STATUS_GROUP);
    expect(snapshot.measurements[0].Temperature).toBe(0);
    expect(snapshot.measurements[1].Temperature).toBe(6);
    expect(snapshot.measurements.at(-1)?.Temperature).toBe(MAX_MEASUREMENTS_PER_STATUS_GROUP + 4);
    expect(sequences.every((sequence, index) => index === 0 || sequences[index - 1] <= sequence)).toBe(true);

    const versionBeforeNextTrim = snapshot.version;
    dataCollector.setBrewingStatus(createStatus(MAX_MEASUREMENTS_PER_STATUS_GROUP + 5));
    const afterTrim = dataCollector.getTimelineSnapshot();
    expect(afterTrim.version).toBe(versionBeforeNextTrim + 1);
    expect(afterTrim.measurements.some(item => item.Temperature === 6)).toBe(false);
    expect(afterTrim.measurements[0].Temperature).toBe(0);
  });
});
