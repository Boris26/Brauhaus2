import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';
import {VesselContentType} from '../../model/VesselContentType';
import {getVesselContentType} from './vesselContent';

const makeStatus = (aPhase: ProcessPhase = ProcessPhase.NONE, aWaitingFor = WaitingFor.NONE): BrewingStatus => ({
    elapsedTime: 0,
    currentTime: 0,
    process: {state: ProcessState.ACTIVE},
    currentStep: {phase: aPhase, mode: ProcessMode.NONE},
    temperature: {},
    hardware: {},
    waiting: {waitingFor: aWaitingFor, canConfirm: aWaitingFor !== WaitingFor.NONE},
    error: {}
});

describe('getVesselContentType', () => {
    it('maps initial, water filling, and mashing-in confirmation states to water', () => {
        expect(getVesselContentType(undefined)).toBe(VesselContentType.WATER);
        expect(getVesselContentType(makeStatus(ProcessPhase.NONE))).toBe(VesselContentType.WATER);
        expect(getVesselContentType(makeStatus(ProcessPhase.MASHING_IN))).toBe(VesselContentType.WATER);
        expect(getVesselContentType(makeStatus(ProcessPhase.MASHING_IN, WaitingFor.MASHING_IN_CONFIRMATION))).toBe(VesselContentType.WATER);
    });

    it('maps successful mashing-in, rests, mashing-out, and mashing-out confirmation to mash', () => {
        expect(getVesselContentType(makeStatus(ProcessPhase.RAST))).toBe(VesselContentType.MASH);
        expect(getVesselContentType(makeStatus(ProcessPhase.MASHING_OUT))).toBe(VesselContentType.MASH);
        expect(getVesselContentType(makeStatus(ProcessPhase.MASHING_OUT, WaitingFor.MASHING_OUT_CONFIRMATION))).toBe(VesselContentType.MASH);
    });

    it('maps states after confirmed mashing-out to wort', () => {
        expect(getVesselContentType(makeStatus(ProcessPhase.COOKING))).toBe(VesselContentType.WORT);
        expect(getVesselContentType(makeStatus(ProcessPhase.COOLING))).toBe(VesselContentType.WORT);
        expect(getVesselContentType(makeStatus(ProcessPhase.FINISHED))).toBe(VesselContentType.WORT);
    });

    it('falls back safely to water for unknown statuses', () => {
        const status = makeStatus('UNKNOWN' as ProcessPhase);
        expect(getVesselContentType(status)).toBe(VesselContentType.WATER);
    });
});
