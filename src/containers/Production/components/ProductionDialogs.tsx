import React from 'react';
import ModalDialog, {DialogType} from '../../../components/ModalDialog/ModalDialog';

export interface ProductionDialogsProps {
    showFinishDialog: boolean;
    onConfirmFinish: () => void;
    showEquipmentAlarmDialog: boolean;
    equipmentAlarmTitle: string;
    equipmentAlarmMessage: string;
    onDismissEquipmentAlarm: () => void;
}

export class ProductionDialogs extends React.Component<ProductionDialogsProps> {
    render(): React.ReactNode {
        const {showFinishDialog, onConfirmFinish,
            showEquipmentAlarmDialog, equipmentAlarmTitle, equipmentAlarmMessage, onDismissEquipmentAlarm} = this.props;
        return (
            <>
                <ModalDialog onConfirm={onConfirmFinish} type={DialogType.INFO} open={showFinishDialog} content="Das Bier ist fertig!" header="Fertig!" />
                <ModalDialog
                    onConfirm={onDismissEquipmentAlarm}
                    type={DialogType.ERROR}
                    open={showEquipmentAlarmDialog}
                    content={equipmentAlarmMessage}
                    header={equipmentAlarmTitle}
                    confirmLabel="Schließen"
                />
            </>
        );
    }
}
