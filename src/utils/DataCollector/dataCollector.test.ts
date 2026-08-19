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
});
