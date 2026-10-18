import {getBrewingStatusLabel, getConfirmButtonLabel, getConfirmationRequestViewModel, getConfirmationType, getCountdownValue, getTargetTemperature, isBrewingProcessActive, shouldShowConfirmButton, shouldShowCountdown, shouldShowWaitingDialog} from './selectors';
import {Beer} from '../../model/Beer';
import {ProcedureType} from '../../enums/eProcedureType';
import {RestExecutionMode} from '../../enums/eRestExecutionMode';
import {AlarmType, BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';
import {ConfirmStates} from '../../enums/eConfirmStates';
import {isEquipmentAlarmActive, isHeaterStuckOnAlarmActive} from './alarmDisplay';

const makeStatus = (aPart: Partial<BrewingStatus>): BrewingStatus => ({
  elapsedTime: 0,
  process: {state: ProcessState.ACTIVE},
  currentStep: {phase: ProcessPhase.NONE, mode: ProcessMode.NONE},
  temperature: {}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}, error: {},
  ...aPart
});

describe('shared target temperature', () => {
  const beer = {
    cookingTemperatur: 100,
    fermentation: [
      {type: 'Einmaischen', temperature: 57},
      {type: 'Rast 1', stepId: 'rest-1', temperature: 65, procedureType: ProcedureType.RAST},
      {type: 'Dekoktion', stepId: 'decoction-1', relatedRastId: 'rest-1', temperature: 95, procedureType: ProcedureType.DECOCTION},
      {type: 'Rast 2', stepId: 'rest-2', temperature: 72},
      {type: 'Dekoktion', stepId: 'decoction-2', relatedRastId: 'rest-2', executionMode: RestExecutionMode.CONFIRMATION_HOLD},
      {type: 'Abmaischen', temperature: 78},
    ],
  } as Beer;
  const status = (index = 2, phase = ProcessPhase.RAST, mode = ProcessMode.HEATING) =>
    makeStatus({currentStep: {index, phase, mode}, temperature: {current: 65}});

  it.each([66, 0, '66', '0'])('keeps controller target %p ahead of recipe values', target => {
    const controllerStatus = {...status(), temperature: {target}} as BrewingStatus;
    expect(getTargetTemperature(controllerStatus, beer)).toBe(Number(target));
    expect(getTargetTemperature(controllerStatus)).toBe(Number(target));
  });

  it.each([undefined, null, NaN, Infinity, -Infinity, '', ' ', 'invalid', false])('falls back for missing or invalid controller target %p', target => {
    expect(getTargetTemperature({...status(), temperature: {target}} as BrewingStatus, beer)).toBe(65);
  });

  it.each([
    [1, ProcessPhase.MASHING_IN, 57],
    [2, ProcessPhase.RAST, 65],
    [3, ProcessPhase.DECOCTION, 65],
    [4, ProcessPhase.RAST, 72],
    [5, ProcessPhase.DECOCTION, 72],
    [6, ProcessPhase.MASHING_OUT, 78],
    [7, ProcessPhase.COOKING, 100],
  ])('resolves control step %i in phase %s to %i °C', (index, phase, expected) => {
    expect(getTargetTemperature(status(index, phase), beer)).toBe(expected);
  });

  it.each([ProcessMode.HEATING, ProcessMode.HOLDING, ProcessMode.TIMER_RUNNING, ProcessMode.WAITING])('resolves an active step in %s mode', mode => {
    expect(getTargetTemperature(status(2, ProcessPhase.RAST, mode), beer)).toBe(65);
  });

  it.each([ProcessState.IDLE, ProcessState.FINISHED, ProcessState.ABORTED, ProcessState.ERROR])('does not infer a recipe target for process state %s', state => {
    expect(getTargetTemperature({...status(), process: {state}}, beer)).toBeUndefined();
  });

  it.each([undefined, 0, -1, 999, 1.5])('does not fall back to the first row for index %p', index => {
    expect(getTargetTemperature({...status(), currentStep: {...status().currentStep, index}}, beer)).toBeUndefined();
  });

  it('requires matching phase, active mode, status, and recipe', () => {
    expect(getTargetTemperature(status(2, ProcessPhase.MASHING_IN), beer)).toBeUndefined();
    expect(getTargetTemperature(status(2, ProcessPhase.NONE), beer)).toBeUndefined();
    expect(getTargetTemperature(status(2, ProcessPhase.RAST, ProcessMode.NONE), beer)).toBeUndefined();
    expect(getTargetTemperature(status(2, ProcessPhase.RAST, ProcessMode.FINISHED), beer)).toBeUndefined();
    expect(getTargetTemperature(undefined, beer)).toBeUndefined();
    expect(getTargetTemperature(status())).toBeUndefined();
  });

  it.each([undefined, NaN, Infinity, 0, -1])('does not invent a target for invalid recipe temperature %p', temperature => {
    const recipe = {...beer, fermentation: beer.fermentation.map(step => step.stepId === 'rest-1' ? {...step, temperature} : step)};
    expect(getTargetTemperature(status(), recipe)).toBeUndefined();
  });

  it('does not use a decoction temperature when the related rest is missing or ambiguous', () => {
    const recipe = {...beer, fermentation: beer.fermentation.filter(step => step.stepId !== 'rest-1')};
    expect(getTargetTemperature(status(2, ProcessPhase.DECOCTION), recipe)).toBeUndefined();
    expect(getTargetTemperature(status(3, ProcessPhase.DECOCTION), {...beer, fermentation: [...beer.fermentation, beer.fermentation[1]]})).toBeUndefined();
    const invalidRelation = {...beer, fermentation: beer.fermentation.map(step => step.stepId === 'rest-1' ? {...step, procedureType: ProcedureType.DECOCTION} : step)};
    expect(getTargetTemperature(status(3, ProcessPhase.DECOCTION), invalidRelation)).toBeUndefined();
  });
});

describe('brewing selectors', () => {
  it('recognizes only an explicitly active equipment alarm in the alarm list', () => {
    expect(isEquipmentAlarmActive([])).toBe(false);
    expect(isEquipmentAlarmActive([{type: 'FUTURE_ALARM', active: true}])).toBe(false);
    expect(isEquipmentAlarmActive([{type: AlarmType.EQUIPMENT_ALARM, active: false}])).toBe(false);
    expect(isEquipmentAlarmActive([{type: AlarmType.EQUIPMENT_ALARM, active: true}])).toBe(true);
  });
  it('recognizes HEATER_STUCK_ON independently from the equipment alarm', () => {
    expect(isHeaterStuckOnAlarmActive([{type: AlarmType.EQUIPMENT_ALARM, active: true}])).toBe(false);
    expect(isHeaterStuckOnAlarmActive([{type: AlarmType.HEATER_STUCK_ON, active: false}])).toBe(false);
    expect(isHeaterStuckOnAlarmActive([{type: AlarmType.HEATER_STUCK_ON, active: true}])).toBe(true);
  });
  it('derives an active brewing process from process.state ACTIVE only', () => {
    expect(isBrewingProcessActive(undefined)).toBe(false);
    expect(isBrewingProcessActive(makeStatus({process:{state:ProcessState.IDLE}}))).toBe(false);
    expect(isBrewingProcessActive(makeStatus({process:{state:ProcessState.ACTIVE}}))).toBe(true);
    expect(isBrewingProcessActive(makeStatus({process:{state:ProcessState.FINISHED}}))).toBe(false);
  });

  it('process priority labels', () => {
    expect(getBrewingStatusLabel(makeStatus({process:{state:ProcessState.ERROR}}))).toContain('Fehler');
    expect(getBrewingStatusLabel(makeStatus({process:{state:ProcessState.ABORTED}}))).toContain('abgebrochen');
    expect(getBrewingStatusLabel(makeStatus({process:{state:ProcessState.FINISHED}}))).toContain('abgeschlossen');
    expect(getBrewingStatusLabel(makeStatus({process:{state:ProcessState.IDLE}}))).toContain('Bereit');
  });

  it('waiting and confirm handling', () => {
    const s = makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.WAITING}, waiting:{waitingFor:WaitingFor.IODINE_TEST, canConfirm:true}});
    expect(shouldShowConfirmButton(s)).toBe(true);
    expect(getConfirmButtonLabel(s)).toBe('Iodine bestätigen');
  });

  it('handles decoction waiting label', () => {
    const s = makeStatus({currentStep:{phase:ProcessPhase.DECOCTION, mode:ProcessMode.WAITING}, waiting:{waitingFor:WaitingFor.DECOCTION_CONFIRMATION, canConfirm:true}});
    expect(getConfirmButtonLabel(s)).toBe('Dickmaische bestätigen');
    expect(getBrewingStatusLabel(s)).toContain('Dekoktion');
  });

  it('does not enable or show confirmation without a concrete confirm endpoint', () => {
    const s = makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.WAITING}, waiting:{waitingFor:WaitingFor.USER_CONFIRMATION, canConfirm:true}});
    expect(shouldShowConfirmButton(s)).toBe(false);
    expect(shouldShowWaitingDialog(s)).toBe(false);
  });

  it('maps MASHING_OUT_CONFIRMATION to the existing Mashup confirmation endpoint', () => {
    const s = makeStatus({currentStep:{phase:ProcessPhase.MASHING_OUT, mode:ProcessMode.WAITING}, waiting:{waitingFor:WaitingFor.MASHING_OUT_CONFIRMATION, canConfirm:true}});
    expect(getConfirmationType(s)).toBe(ConfirmStates.MASHUP);
    expect(shouldShowWaitingDialog(s)).toBe(true);
    expect(shouldShowConfirmButton(s)).toBe(true);
  });

  it('requires canConfirm to show the confirmation dialog', () => {
    const s = makeStatus({currentStep:{phase:ProcessPhase.MASHING_OUT, mode:ProcessMode.WAITING}, waiting:{waitingFor:WaitingFor.MASHING_OUT_CONFIRMATION, canConfirm:false}});
    expect(shouldShowWaitingDialog(s)).toBe(false);
  });

  it.each([
    [WaitingFor.MASHING_IN_CONFIRMATION, ConfirmStates.MASHUP, 'Einmaischen bestätigen'],
    [WaitingFor.IODINE_TEST, ConfirmStates.IODINE, 'Jodprobe durchführen'],
    [WaitingFor.DECOCTION_CONFIRMATION, ConfirmStates.DECOCTION, 'Dekoktion'],
    [WaitingFor.DECOCTION_RETURN_CONFIRMATION, ConfirmStates.DECOCTION_RETURNED, 'Dickmaische zurückführen'],
    [WaitingFor.MASHING_OUT_CONFIRMATION, ConfirmStates.MASHUP, 'Abmaischen bestätigen'],
    [WaitingFor.COOKING_CONFIRMATION, ConfirmStates.COOKING, 'Kochen bestätigen'],
    [WaitingFor.BOILING_CONFIRMATION, ConfirmStates.BOILING, 'Siedepunkt bestätigen'],
  ] as const)('builds one central view model for %s', (waitingFor, confirmState, title) => {
    const status = makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.WAITING}, waiting:{waitingFor, canConfirm:true}});
    expect(getConfirmationRequestViewModel(status)).toMatchObject({waitingFor, confirmState, title, canConfirm: true, requiresAction: true});
  });

  it('labels the decoction return heating and confirmation states', () => {
    const heating = makeStatus({currentStep:{phase:ProcessPhase.DECOCTION, mode:ProcessMode.HEATING}, heating:{followsDecoction:true}});
    expect(getBrewingStatusLabel(heating)).toBe('Hauptmaische wird nach der Dekoktion aufgeheizt');

    const waiting = makeStatus({currentStep:{phase:ProcessPhase.DECOCTION, mode:ProcessMode.WAITING}, waiting:{waitingFor:WaitingFor.DECOCTION_RETURN_CONFIRMATION, canConfirm:true}});
    expect(getConfirmationType(waiting)).toBe(ConfirmStates.DECOCTION_RETURNED);
    expect(getConfirmButtonLabel(waiting)).toBe('Abgeschlossen');
  });

  it('represents unsupported waiting states without a confirmation command', () => {
    const status = makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.WAITING}, waiting:{waitingFor:WaitingFor.USER_CONFIRMATION, canConfirm:true}});
    expect(getConfirmationRequestViewModel(status)).toMatchObject({title: 'Wartet auf Benutzeraktion', canConfirm: false, requiresAction: true});
    expect(getConfirmationRequestViewModel(status)?.confirmState).toBeUndefined();
  });

  it('countdown shown only for timer running', () => {
    expect(shouldShowCountdown(makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.TIMER_RUNNING}}))).toBe(true);
    expect(shouldShowCountdown(makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.HEATING}}))).toBe(false);
  });

  it('uses remainingTime as the only countdown value', () => {
    expect(getCountdownValue(makeStatus({ currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.TIMER_RUNNING}}))).toBe(0);
    expect(getCountdownValue(makeStatus({ currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.TIMER_RUNNING, remainingTime: 45}}))).toBe(45);
  });
});
