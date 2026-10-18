import {Beer, FermentationSteps} from '../../model/Beer';
import {RestExecutionMode} from '../../enums/eRestExecutionMode';
import {ProcessMode, ProcessPhase} from '../../model/brewingStatus.types';
import {ProcedureType} from '../../enums/eProcedureType';

export enum ProcessListEntryType {
    HEATING = "HEATING",
    PROCESS = "PROCESS",
    DISPLAY = "DISPLAY"
}

export enum ProcessListDurationUnit {
    MINUTES = "MINUTES",
    SECONDS = "SECONDS"
}

export interface ProcessStepDetail {
    temperature?: number;
    duration?: number;
    durationUnit?: ProcessListDurationUnit;
    confirmationRequired?: boolean;
}


export interface ProcessListCurrentStep {
    index?: number;
    phase?: ProcessPhase;
    mode?: ProcessMode;
    name?: string;
}

export interface ProcessListStep {
    name: string;
    entryType?: ProcessListEntryType;
    /**
     * 1-based index reported by the PI control in brewingStatus.currentStep.index.
     * Heating and execution rows can share the same control step index; the
     * currentStep.mode decides which visible row is active.
     */
    controlStepIndex?: number;
    phase?: ProcessPhase;
    detail?: ProcessStepDetail;
    relatedRastId?: string;
}

// -------------------------------------------------------
// PROCESS STEPS GENERATION
// -------------------------------------------------------

export function createProcessSteps(selectedBeer: Beer): ProcessListStep[] {
    let processSteps: ProcessListStep[] = [];
    if (!selectedBeer || !Array.isArray(selectedBeer.fermentation)) {
        return processSteps;
    }

    const fermentation = selectedBeer.fermentation;
    let controlStepIndex = 1;

    // Einmaischen
    const einmaischen = fermentation.find(step => step.type === 'Einmaischen');
    if (einmaischen) {
        processSteps.push({ name: `Aufheizen für Einmaischen`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.MASHING_IN, detail: {temperature: einmaischen.temperature} });
        processSteps.push({ name: 'Einmaischen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.MASHING_IN, detail: {temperature: einmaischen.temperature, confirmationRequired: true} });
        controlStepIndex++;
    }

    let lastMashStepIndex = -1;

    // Sequenzielle Maischeschritte (Rasten und Dekoktionen)
    fermentation.forEach((step: FermentationSteps) => {
        const isConfirmationHold = (step.executionMode ?? RestExecutionMode.TIMED) === RestExecutionMode.CONFIRMATION_HOLD;
        const procedureType = step.procedureType ?? (isConfirmationHold ? ProcedureType.DECOCTION : ProcedureType.RAST);
        const isFixedStep = ['Einmaischen', 'Abmaischen', 'Kochen'].includes(step.type);
        if (!isFixedStep) {
            const phase = procedureType === ProcedureType.DECOCTION ? ProcessPhase.DECOCTION : ProcessPhase.RAST;
            if (procedureType === ProcedureType.RAST) processSteps.push({ name: `Aufheizen für ${step.type}`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase, detail: {temperature: step.temperature} });
            processSteps.push({ name: step.type || (phase === ProcessPhase.DECOCTION ? 'Dekoktion' : 'Rast'), entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase, relatedRastId: step.relatedRastId, detail: {temperature: step.temperature, duration: step.time, durationUnit: ProcessListDurationUnit.MINUTES, confirmationRequired: procedureType === ProcedureType.DECOCTION} });
            controlStepIndex++;
            lastMashStepIndex = processSteps.length - 1;
        }
    });

    // Jod-Probe nach letztem Maischeschritt (Rast oder Dekoktion)
    if (lastMashStepIndex !== -1) {
        processSteps.splice(lastMashStepIndex + 1, 0, { name: 'Jod Probe', entryType: ProcessListEntryType.DISPLAY, detail: {confirmationRequired: true} });
    }

    // Abmaischen
    const abmaischen = fermentation.find(step => step.type === 'Abmaischen');
    if (abmaischen) {
        processSteps.push({ name: `Aufheizen für Abmaischen`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.MASHING_OUT, detail: {temperature: abmaischen.temperature} });
        processSteps.push({ name: 'Abmaischen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.MASHING_OUT, detail: {temperature: abmaischen.temperature, confirmationRequired: true} });
        controlStepIndex++;
    }

    // Kochen
    processSteps.push({ name: 'Aufheizen auf Kochen', entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.COOKING, detail: {temperature: selectedBeer.cookingTemperatur} });
    processSteps.push({ name: 'Kochen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.COOKING, detail: {temperature: selectedBeer.cookingTemperatur, duration: selectedBeer.cookingTime * 60, durationUnit: ProcessListDurationUnit.SECONDS} });
    controlStepIndex++;

    return processSteps;
}

export function getActiveProcessStepIndex(processSteps: ProcessListStep[], currentControlStepIndex: number, currentStep?: ProcessListCurrentStep): number {
    const controlStepIndex = currentStep?.index ?? currentControlStepIndex;
    const requestedEntryType = currentStep?.mode === ProcessMode.HEATING
        ? ProcessListEntryType.HEATING
        : ProcessListEntryType.PROCESS;

    const activeIndex = processSteps.findIndex(step =>
        step.controlStepIndex === controlStepIndex &&
        step.entryType === requestedEntryType &&
        (currentStep?.phase === undefined || step.phase === undefined || step.phase === currentStep.phase)
    );

    if (activeIndex >= 0) {
        return activeIndex;
    }

    const fallbackIndex = processSteps.findIndex(step => step.controlStepIndex === controlStepIndex);
    return fallbackIndex >= 0 ? fallbackIndex : 0;
}
