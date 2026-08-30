import {getBrewingStatusLabel, getConfirmButtonLabel, getConfirmationRequestViewModel, getConfirmationType, getCountdownValue, isBrewingProcessActive, shouldShowConfirmButton, shouldShowCountdown, shouldShowWaitingDialog} from './selectors';
import {AlarmType, BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';
import {ConfirmStates} from '../../enums/eConfirmStates';
import {isEquipmentAlarmActive} from './alarmDisplay';

const makeStatus = (aPart: Partial<BrewingStatus>): BrewingStatus => ({
  elapsedTime: 0,
  process: {state: ProcessState.ACTIVE},
  currentStep: {phase: ProcessPhase.NONE, mode: ProcessMode.NONE},
  temperature: {}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}, error: {},
  ...aPart
});

describe('brewing selectors', () => {
  it('recognizes only an explicitly active equipment alarm in the alarm list', () => {
    expect(isEquipmentAlarmActive([])).toBe(false);
    expect(isEquipmentAlarmActive([{type: 'FUTURE_ALARM', active: true}])).toBe(false);
    expect(isEquipmentAlarmActive([{type: AlarmType.EQUIPMENT_ALARM, active: false}])).toBe(false);
    expect(isEquipmentAlarmActive([{type: AlarmType.EQUIPMENT_ALARM, active: true}])).toBe(true);
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
    const heating = makeStatus({currentStep:{phase:ProcessPhase.DECOCTION, mode:ProcessMode.HEATING}, heating:{followsDecoction:true, heaterEnabled:true}});
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
