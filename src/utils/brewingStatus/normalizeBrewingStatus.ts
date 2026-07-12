import {BrewingStatus, LegacyBrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor, WaitingState} from '../../model/brewingStatus.types';
const isObject = (aValue: unknown): aValue is Record<string, any> => typeof aValue === 'object' && aValue !== null;
const normalizePhase = (aValue: unknown): ProcessPhase => { if (typeof aValue !== 'string') return ProcessPhase.NONE; const mapped = aValue.toUpperCase(); return (Object.values(ProcessPhase) as string[]).includes(mapped) ? mapped as ProcessPhase : ProcessPhase.NONE; };
const normalizeMode = (aValue: unknown): ProcessMode => { if (typeof aValue !== 'string') return ProcessMode.NONE; const mapped = aValue.toUpperCase(); return (Object.values(ProcessMode) as string[]).includes(mapped) ? mapped as ProcessMode : ProcessMode.NONE; };
const normalizeState = (aValue: unknown): ProcessState => { if (typeof aValue !== 'string') return ProcessState.IDLE; const mapped = aValue.toUpperCase(); return (Object.values(ProcessState) as string[]).includes(mapped) ? mapped as ProcessState : ProcessState.IDLE; };
const normalizeWaitingFor = (aValue: unknown): WaitingState => { if (typeof aValue !== 'string') return WaitingFor.NONE; const mapped = aValue.toUpperCase(); return (Object.values(WaitingFor) as string[]).includes(mapped) ? mapped as WaitingFor : mapped; };
const mapLegacyTypeToPhase = (aType: unknown): ProcessPhase => { const value = typeof aType === 'string' ? aType.toUpperCase() : ''; if (value.includes('COOK')) return ProcessPhase.COOKING; if (value.includes('FINISH')) return ProcessPhase.FINISHED; if (value.includes('RAST')) return ProcessPhase.RAST; if (value.includes('MASHING_IN') || value.includes('EINMA')) return ProcessPhase.MASHING_IN; if (value.includes('MASHING_OUT') || value.includes('ABMA')) return ProcessPhase.MASHING_OUT; return ProcessPhase.NONE; };
/**
 * Zentrale Kompatibilitätsschicht:
 * - Neue strukturierte Backend-Felder sind führend.
 * - Alte UI-Felder sind nur Fallback.
 * So vermeiden wir, dass Komponenten wieder direkt an StatusText & Co. gekoppelt werden.
 */
export const normalizeBrewingStatus = (aRawStatus: unknown): BrewingStatus => {
 const aRaw = isObject(aRawStatus) ? aRawStatus : {}; const aLegacy = aRaw as LegacyBrewingStatus;
 const aLegacyPhase = mapLegacyTypeToPhase(aLegacy.Type);
 const aStructuredPhase = normalizePhase(aRaw.currentStep?.phase);
 let aLegacyMode = ProcessMode.NONE; if (aLegacy.WaitingStatus === true) aLegacyMode = ProcessMode.WAITING; else if (aLegacy.HeatUpStatus === true) aLegacyMode = ProcessMode.HEATING;
 const aHeater = typeof aRaw.hardware?.heater === 'string' ? aRaw.hardware.heater : (typeof aLegacy.HeatingStates === 'string' ? (aLegacy.HeatingStates.includes('ON') ? 'ON' : 'OFF') : undefined);
 const aAgitator = typeof aRaw.hardware?.agitator === 'string' ? aRaw.hardware.agitator : (typeof aLegacy.AgitatorStatus === 'boolean' ? (aLegacy.AgitatorStatus ? 'ON' : 'OFF') : undefined);
 return { elapsedTime: Number(aRaw.elapsedTime ?? aLegacy.elapsedTime ?? 0), currentTime: Number(aRaw.currentTime ?? aLegacy.currentTime ?? 0), process: { state: normalizeState(aRaw.process?.state) }, currentStep: { index: typeof aRaw.currentStep?.index === 'number' ? aRaw.currentStep.index : aLegacy.index, count: typeof aRaw.currentStep?.count === 'number' ? aRaw.currentStep.count : undefined, phase: aStructuredPhase !== ProcessPhase.NONE ? aStructuredPhase : aLegacyPhase, mode: (() => { const aMode = normalizeMode(aRaw.currentStep?.mode); return aMode !== ProcessMode.NONE ? aMode : aLegacyMode; })(), name: aRaw.currentStep?.name ?? aLegacy.Name, duration: aRaw.currentStep?.duration, elapsedTime: aRaw.currentStep?.elapsedTime, remainingTime: aRaw.currentStep?.remainingTime, type: aRaw.currentStep?.type ?? aLegacy.Type }, temperature: { current: aRaw.temperature?.current ?? aLegacy.Temperature, target: aRaw.temperature?.target ?? aLegacy.TargetTemperature }, hardware: { heater: aHeater, agitator: aAgitator }, waiting: { waitingFor: normalizeWaitingFor(aRaw.waiting?.waitingFor), canConfirm: typeof aRaw.waiting?.canConfirm === 'boolean' ? aRaw.waiting.canConfirm : !!aLegacy.WaitingStatus }, error: { code: aRaw.error?.code ?? null, details: aRaw.error?.details ?? null } };
};
