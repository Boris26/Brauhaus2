import {ProductionActions} from '../actions/actions';
import {WarningActions} from '../actions/warningActions';
import {initialWarningState, warningReducer} from './warningReducer';

const temperatureWarning = (health: string) => ({
    type: 'TEMPERATURE_SENSOR',
    active: true,
    details: {health},
});

describe('warningReducer', () => {
    it('stores replacement warning snapshots and marks them as received', () => {
        const state = warningReducer(
            initialWarningState,
            WarningActions.warningStateChanged({warnings: [temperatureWarning('MISSING')]}),
        );

        expect(state).toEqual({
            warnings: [temperatureWarning('MISSING')],
            warningsReceived: true,
        });
    });

    it('returns the same state for an identical semantic snapshot', () => {
        const active = warningReducer(
            initialWarningState,
            WarningActions.warningStateChanged({warnings: [temperatureWarning('STALE')]}),
        );

        const repeated = warningReducer(
            active,
            WarningActions.warningStateChanged({warnings: [temperatureWarning('STALE')]}),
        );

        expect(repeated).toBe(active);
    });

    it('updates details when a warning changes without changing its type', () => {
        const missing = warningReducer(
            initialWarningState,
            WarningActions.warningStateChanged({warnings: [temperatureWarning('MISSING')]}),
        );

        const stale = warningReducer(
            missing,
            WarningActions.warningStateChanged({warnings: [temperatureWarning('STALE')]}),
        );

        expect(stale).not.toBe(missing);
        expect(stale.warnings[0].details?.health).toBe('STALE');
    });

    it('copies the socket snapshot so later payload mutation cannot change Redux state', () => {
        const warning = temperatureWarning('MISSING');
        const payload = {warnings: [warning]};
        const state = warningReducer(initialWarningState, WarningActions.warningStateChanged(payload));

        warning.details.health = 'OK';
        payload.warnings.length = 0;

        expect(state.warnings).toEqual([temperatureWarning('MISSING')]);
    });

    it('accepts multiple simultaneous warnings and clears them with an empty replacement snapshot', () => {
        const active = warningReducer(initialWarningState, WarningActions.warningStateChanged({
            warnings: [
                temperatureWarning('MISSING'),
                {type: 'WATER_SUPPLY', active: true, details: {reason: 'NO_FLOW'}},
            ],
        }));

        expect(active.warnings).toHaveLength(2);

        const cleared = warningReducer(active, WarningActions.warningStateChanged({warnings: []}));
        expect(cleared).toEqual({warnings: [], warningsReceived: true});
    });

    it('drops non-latched warning snapshots when the socket disconnects', () => {
        const active = warningReducer(
            initialWarningState,
            WarningActions.warningStateChanged({warnings: [temperatureWarning('MISSING')]}),
        );

        const disconnected = warningReducer(active, ProductionActions.socketConnectionChanged(false));

        expect(disconnected).toEqual(initialWarningState);
    });
});
