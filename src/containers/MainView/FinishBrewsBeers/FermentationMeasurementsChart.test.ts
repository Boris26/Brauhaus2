import {buildFermentationChartData} from './FermentationMeasurementsChart';

describe('buildFermentationChartData', () => {
  it('renders manual and sensor values from the unified measurement history', () => {
    const data = buildFermentationChartData(
      [
        {id: 's', finishedBeerId: 'b', measuredAt: '2026-09-03T10:00:00Z', beerTemperatureC: 18.1, ambientTemperatureC: 16.2, source: 'SENSOR'},
        {id: 'm', finishedBeerId: 'b', measuredAt: '2026-09-04T10:00:00Z', beerTemperatureC: 18.4, plato: 4.2, source: 'MANUAL'},
        {id: 'invalid', finishedBeerId: 'b', measuredAt: 'invalid', beerTemperatureC: 99, source: 'SENSOR'},
      ],
    );

    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({beerTemperature: 18.1, ambientTemperature: 16.2});
    expect(data[1]).toMatchObject({beerTemperature: 18.4, plato: 4.2});
  });
});
