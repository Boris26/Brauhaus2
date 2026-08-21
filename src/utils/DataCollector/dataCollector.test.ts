import {dataCollector, MAX_MEASUREMENTS_PER_STATUS_GROUP} from './dataCollector';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';

const createStatus = (aTemperature: number): BrewingStatus => ({
  elapsedTime: aTemperature,
  currentTime: aTemperature,
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
  hardware: {},
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
