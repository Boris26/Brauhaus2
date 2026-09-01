import React from 'react';
import ModalDialog, {DialogType} from '../../../components/ModalDialog/ModalDialog';
import {heaterStuckOnAlarmDisplay} from '../../../utils/brewingStatus/alarmDisplay';

export interface ProductionDialogsProps {
    showFinishDialog: boolean;
    onConfirmFinish: () => void;
    isSavingFinishedBrew: boolean;
    finishedBrewSaveError?: string;
    showEquipmentAlarmDialog: boolean;
    equipmentAlarmTitle: string;
    equipmentAlarmMessage: string;
    onDismissEquipmentAlarm: () => void;
}

export class ProductionDialogs extends React.Component<ProductionDialogsProps> {
    render(): React.ReactNode {
        const {showFinishDialog, onConfirmFinish, isSavingFinishedBrew, finishedBrewSaveError,
            showEquipmentAlarmDialog, equipmentAlarmTitle, equipmentAlarmMessage, onDismissEquipmentAlarm} = this.props;
        const showLocalEquipmentAlarm = showEquipmentAlarmDialog && equipmentAlarmTitle !== heaterStuckOnAlarmDisplay.title;

        return (
            <>
                <ModalDialog
                    onConfirm={onConfirmFinish}
                    type={finishedBrewSaveError ? DialogType.ERROR : DialogType.INFO}
                    open={showFinishDialog}
                    content={finishedBrewSaveError ? `Der Sud konnte nicht gespeichert werden: ${finishedBrewSaveError}` : (isSavingFinishedBrew ? 'Der fertige Sud wird gespeichert …' : 'Das Bier ist fertig!')}
                    header={finishedBrewSaveError ? 'Speichern fehlgeschlagen' : 'Fertig!'}
                    confirmLabel={finishedBrewSaveError ? 'Erneut versuchen' : (isSavingFinishedBrew ? 'Speichert …' : 'Sud speichern')}
                    actionsDisabled={isSavingFinishedBrew}
                    disableClose={isSavingFinishedBrew}
                />
                <ModalDialog
                    onConfirm={onDismissEquipmentAlarm}
                    type={DialogType.ERROR}
                    open={showLocalEquipmentAlarm}
                    content={equipmentAlarmMessage}
                    header={equipmentAlarmTitle}
                    confirmLabel="Schließen"
                />
            </>
        );
    }
}
