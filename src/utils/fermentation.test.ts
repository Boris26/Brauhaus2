import {actionDueLabel, actionTriggerLabel, approximateAlcohol, attenuation, bubbleRate, canCompleteAction, contactStatus, contactTimeLabel, isDeviceOnline, latestFermentationReadings, missingPlatoDays, temperatureDelta} from './fermentation';
import {FermentationTriggerType} from '../model/FermentationRecipeAction';

describe('fermentation domain helpers', () => {
  it('uses server bubble rate and otherwise derives bubbles per minute centrally', () => {
    expect(bubbleRate({id: '1', deviceId: 'd', measuredAt: '', bubbleRatePerMinute: 4})).toBe(4);
    expect(bubbleRate({id: '1', deviceId: 'd', measuredAt: '', bubbleCount: 17, windowSeconds: 300})).toBeCloseTo(3.4);
  });
  it('derives temperature delta only where needed', () => expect(temperatureDelta({id: '1', deviceId: 'd', measuredAt: '', beerTemperature: 18.3, ambientTemperature: 17.6})).toBeCloseTo(.7));
  it('classifies future, today and overdue actions', () => {
    const action: any = {scheduledAt: '2026-09-04T18:00:00Z'};
    expect(actionDueLabel(action, new Date('2026-09-04T08:00:00Z'))).toMatchObject({label: 'Für heute geplant', severity: 'future'});
    expect(actionDueLabel({...action, scheduledAt: '2026-09-03'}, new Date('2026-09-04'))).toMatchObject({label: 'Trigger wird vom Backend geprüft', severity: 'future'});
    expect(actionDueLabel({...action, due: true}, new Date('2026-09-04'))).toMatchObject({label: 'Fällig', severity: 'due'});
    expect(actionDueLabel({...action, scheduledAt: '2026-09-07'}, new Date('2026-09-04'))).toMatchObject({label: 'In 3 Tagen', severity: 'future'});
  });
  it('allows only backend-due or manual pending actions to complete', () => {
    expect(canCompleteAction({state: 'PENDING', due: true} as any)).toBe(true);
    expect(canCompleteAction({state: 'PENDING', due: false, triggerType: FermentationTriggerType.MANUAL} as any)).toBe(true);
    expect(canCompleteAction({state: 'PENDING', due: false} as any)).toBe(false);
    expect(canCompleteAction({state: 'SKIPPED', due: true, triggerType: FermentationTriggerType.MANUAL} as any)).toBe(false);
  });
  it('keeps triggers separate from contact time and uses server contact timestamps', () => {
    const action: any = {state: 'COMPLETED', triggerType: FermentationTriggerType.PLATO_THRESHOLD, triggerPlato: 5, contactTime: 3, contactTimeUnit: 'DAYS', contactEndsAt: '2026-09-07T00:00:00Z'};
    expect(actionTriggerLabel(action)).toBe('bei ≤ 5 °P');
    expect(contactTimeLabel(action)).toBe('3 Tage');
    expect(contactStatus(action, Date.parse('2026-09-06'))).toBe('running');
    expect(contactStatus(action, Date.parse('2026-09-08'))).toBe('ended');
    expect(actionTriggerLabel({} as any)).toBe('Kein Zugabe-Trigger definiert');
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
