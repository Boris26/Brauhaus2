import BrewProcessChart from './BrewProcessChart';
import {dataCollector} from '../../../../utils/DataCollector/dataCollector';
import {history, reading} from '../../../../testUtils/processTimeline';
import {parseRecordedTimelineExport} from '../../../../model/ProcessTimeline';

it('uses archived cumulative coordinates directly while preserving the original local seconds', () => {
    dataCollector.reset();
    dataCollector.applyTimelineHistory(history([{...reading(1, 60, 600), elapsedTime: 0}, {...reading(2, null, 601), elapsedTime: 1}]));
    const archive = parseRecordedTimelineExport(JSON.parse(dataCollector.getAllDataAsJSONString()))!;
    const chart = new BrewProcessChart({groupedData: {}, recordedTimeline: archive});
    const points = chart.prepareChartData({});
    expect(points.map(p => p.elapsedTime)).toEqual([600, 601]);
    expect(points[1].Temperature).toBeNull();
    expect(archive.measurements[0].elapsedTime).toBe(0);
});

it('retains the legacy local-time accumulation for unversioned archives', () => {
    const chart = new BrewProcessChart({groupedData: {}});
    const points = chart.prepareChartData({a: {HEATING: [{elapsedTime: 10, Temperature: 60}]}, b: {RUNNING: [{elapsedTime: 5, Temperature: 61}]}});
    expect(points.map(p => p.elapsedTime)).toEqual([10, 15]);
});
