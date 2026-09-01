import React from 'react';
import {render, screen} from '@testing-library/react';
import {ProductionDialogs} from './ProductionDialogs';
import {GlobalHeaterSafetyDialogOwnedContext} from '../../../components/GlobalHeaterSafetyDialog/GlobalHeaterSafetyDialog';
import {equipmentAlarmDisplay, heaterStuckOnAlarmDisplay} from '../../../utils/brewingStatus/alarmDisplay';

const renderDialogs = (title: string, message: string, globalOwner = false) => render(
    <GlobalHeaterSafetyDialogOwnedContext.Provider value={globalOwner}>
        <ProductionDialogs
            showFinishDialog={false}
            onConfirmFinish={jest.fn()}
            isSavingFinishedBrew={false}
            showEquipmentAlarmDialog
            equipmentAlarmTitle={title}
            equipmentAlarmMessage={message}
            onDismissEquipmentAlarm={jest.fn()}
        />
    </GlobalHeaterSafetyDialogOwnedContext.Provider>
);

describe('ProductionDialogs alarm ownership', () => {
    it('does not duplicate HEATER_STUCK_ON when the app shell owns the global safety dialog', () => {
        renderDialogs(heaterStuckOnAlarmDisplay.title, heaterStuckOnAlarmDisplay.message, true);
        expect(screen.queryByRole('dialog', {name: heaterStuckOnAlarmDisplay.title})).not.toBeInTheDocument();
    });

    it('keeps the regular equipment alarm local to production', () => {
        renderDialogs(equipmentAlarmDisplay.title, equipmentAlarmDisplay.message, true);
        expect(screen.getByRole('dialog', {name: equipmentAlarmDisplay.title})).toBeInTheDocument();
    });

    it('keeps the legacy production safety dialog behavior outside the app shell for isolated consumers/tests', () => {
        renderDialogs(heaterStuckOnAlarmDisplay.title, heaterStuckOnAlarmDisplay.message, false);
        expect(screen.getByRole('dialog', {name: heaterStuckOnAlarmDisplay.title})).toBeInTheDocument();
    });
});
