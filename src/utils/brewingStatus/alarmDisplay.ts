import {Alarm, AlarmType} from '../../model/brewingStatus.types';

export const equipmentAlarmDisplay = {
    title: 'Anlagenalarm',
    message: 'Die angeschlossene Anlagensteuerung meldet einen Fehler.\nBitte Anlage prüfen.',
    headerText: 'ANLAGENALARM – Anlage prüfen'
};

export const isEquipmentAlarmActive = (alarms?: Alarm[]): boolean =>
    alarms?.some((aAlarm) =>
        aAlarm.type === AlarmType.EQUIPMENT_ALARM && aAlarm.active === true
    ) === true;
