import {buildFermentationChartData} from './FermentationMeasurementsChart';

describe('buildFermentationChartData', () => {
  it('combines manual and sensor values chronologically and ignores invalid records', () => {
    const data = buildFermentationChartData(
      [{id: 'm', finishedBeerId: 'b', measuredAt: '2026-09-04T10:00:00Z', temperature: 18.4, plato: 4.2}],
      [
        {id: 's', deviceId: 'd', measuredAt: '2026-09-03T10:00:00Z', beerTemperature: 18.1, ambientTemperature: 16.2},
        {id: 'invalid', deviceId: 'd', measuredAt: 'invalid', beerTemperature: 99},
      ],
    );

    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({beerTemperature: 18.1, ambientTemperature: 16.2});
    expect(data[1]).toMatchObject({beerTemperature: 18.4, plato: 4.2});
  });
});
