import {parseProcessTimelineHistory, parseRecordedTimelineExport} from './ProcessTimeline';
import {history, reading} from '../testUtils/processTimeline';

it('accepts repeated values, explicit null and zero, and keeps acquisition precision', () => {
    const value = history([reading(1, 60, 0.1), reading(2, 60, 0.2), reading(3, null), reading(4, 0)]);
    expect(parseProcessTimelineHistory(value)).toBe(value);
});

it.each([
    history([reading(2), reading(1)]),
    history([reading(1), reading(1)]),
    history([reading(1, 60, 5), reading(2, 60, 4)]),
    history([{...reading(1), temperature: undefined} as any]),
    {...history([reading(1)]), nextSequence: 0},
])('rejects malformed or out-of-order history atomically', value => {
    expect(parseProcessTimelineHistory(value)).toBeUndefined();
});

it('requires an explicit archive version; old elapsedTime data is never reinterpreted', () => {
    expect(parseRecordedTimelineExport({groupedData: {}})).toBeUndefined();
    expect(parseRecordedTimelineExport({schemaVersion: 2, ...history(), measurements: [{elapsedTime: 600}]})).toBeUndefined();
});
