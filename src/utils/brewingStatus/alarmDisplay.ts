import {Alarm, AlarmType} from '../../model/brewingStatus.types';

export const equipmentAlarmDisplay = {
    title: 'Anlagenalarm',
    message: 'Die angeschlossene Anlagensteuerung meldet einen Fehler.\nBitte Anlage prüfen.',
    headerText: 'ANLAGENALARM – Anlage prüfen'
};

export const heaterStuckOnAlarmDisplay = {
    title: 'Heizungs-Sicherheitsalarm',
    message: 'Die Heizung scheint nach dem Abschalten weiter Wärme zu erzeugen.\nBitte Anlage prüfen und den Sicherheitsalarm erst nach Beseitigung der Ursache zurücksetzen.',
    headerText: 'HEIZUNGSALARM – Anlage prüfen'
};

export const isEquipmentAlarmActive = (alarms?: Alarm[]): boolean =>
    alarms?.some((aAlarm) =>
        aAlarm.type === AlarmType.EQUIPMENT_ALARM && aAlarm.active === true
    ) === true;

export const isHeaterStuckOnAlarmActive = (alarms?: Alarm[]): boolean =>
    alarms?.some((alarm) =>
        alarm.type === AlarmType.HEATER_STUCK_ON && alarm.active === true
    ) === true;
