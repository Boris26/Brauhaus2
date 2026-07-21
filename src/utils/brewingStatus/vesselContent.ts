import {BrewingStatus, ProcessPhase, WaitingFor} from '../../model/brewingStatus.types';
import {VesselContentType} from '../../model/VesselContentType';

export function getVesselContentType(aBrewingStatus: BrewingStatus | undefined): VesselContentType {
    const phase = aBrewingStatus?.currentStep?.phase;
    const waitingFor = aBrewingStatus?.waiting?.waitingFor;

    if (waitingFor === WaitingFor.MASHING_OUT_CONFIRMATION) {
        return VesselContentType.MASH;
    }

    if (phase === ProcessPhase.RAST || phase === ProcessPhase.MASHING_OUT) {
        return VesselContentType.MASH;
    }

    if (phase === ProcessPhase.COOKING || phase === ProcessPhase.COOLING || phase === ProcessPhase.FINISHED) {
        return VesselContentType.WORT;
    }

    return VesselContentType.WATER;
}
