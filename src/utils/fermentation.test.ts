import {actionDueLabel, approximateAlcohol, attenuation, bubbleRate, isDeviceOnline, latestFermentationReadings, missingPlatoDays, temperatureDelta} from './fermentation';

describe('fermentation domain helpers', () => {
  it('uses server bubble rate and otherwise derives bubbles per minute centrally', () => {
    expect(bubbleRate({id: '1', deviceId: 'd', measuredAt: '', bubbleRatePerMinute: 4})).toBe(4);
    expect(bubbleRate({id: '1', deviceId: 'd', measuredAt: '', bubbleCount: 17, windowSeconds: 300})).toBeCloseTo(3.4);
  });
  it('derives temperature delta only where needed', () => expect(temperatureDelta({id: '1', deviceId: 'd', measuredAt: '', beerTemperature: 18.3, ambientTemperature: 17.6})).toBeCloseTo(.7));
  it('classifies future, today and overdue actions', () => {
    const action: any = {scheduledAt: '2026-09-04T18:00:00Z'};
    expect(actionDueLabel(action, new Date('2026-09-04T08:00:00Z'))).toMatchObject({label: 'Heute', severity: 'due'});
    expect(actionDueLabel({...action, scheduledAt: '2026-09-03'}, new Date('2026-09-04'))).toMatchObject({severity: 'overdue'});
    expect(actionDueLabel({...action, scheduledAt: '2026-09-07'}, new Date('2026-09-04'))).toMatchObject({label: 'In 3 Tagen', severity: 'future'});
  });
  it('handles missing Plato, online state and approximate metrics', () => {
    expect(missingPlatoDays([{id: '1', finishedBeerId: 'b', measuredAt: '2026-09-01T00:00:00Z', plato: 4}], Date.parse('2026-09-04T00:00:00Z'))).toBe(3);
    expect(isDeviceOnline('2026-09-04T11:50:00Z', Date.parse('2026-09-04T12:00:00Z'))).toBe(true);
    expect(attenuation(13.2, 3)).toBeCloseTo(77.27);
    expect(approximateAlcohol(13.2, 3)).toBeCloseTo(5.406);
  });
  it('selects the newest valid fermentation value per metric across manual and sensor records', () => {
    const readings = latestFermentationReadings(
      [
        {id: 'm1', finishedBeerId: 'b', measuredAt: '2026-09-03T10:00:00Z', temperature: 18.1, plato: 4.2},
        {id: 'm2', finishedBeerId: 'b', measuredAt: '2026-09-05T10:00:00Z', temperature: Number.NaN, plato: null},
        {id: 'm3', finishedBeerId: 'b', measuredAt: 'invalid', temperature: 99, plato: 99},
      ],
      [
        {id: 's1', deviceId: 'd', measuredAt: '2026-09-04T10:00:00Z', beerTemperature: 18.6, ambientTemperature: 16.4},
        {id: 's2', deviceId: 'd', measuredAt: '2026-09-05T11:00:00Z', beerTemperature: null, ambientTemperature: 16.1},
      ],
    );

    expect(readings).toEqual({beerTemperature: 18.6, ambientTemperature: 16.1, plato: 4.2});
    expect(latestFermentationReadings()).toEqual({beerTemperature: undefined, ambientTemperature: undefined, plato: undefined});
  });
});
