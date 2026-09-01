import {WarningActions} from '../actions/warningActions';
import {mapControlSocketEvent} from './productionEpics';

describe('warning socket mapping', () => {
    it('maps warning-state-changed without changing the replacement snapshot', () => {
        const snapshot = {
            warnings: [
                {
                    type: 'TEMPERATURE_SENSOR',
                    active: true,
                    details: {health: 'MISSING'},
                },
            ],
        };

        expect(mapControlSocketEvent({event: 'warning-state-changed', data: snapshot}))
            .toEqual(WarningActions.warningStateChanged(snapshot));
    });
});
