import React from 'react';
import ModalDialog, {DialogType} from '../../../components/ModalDialog/ModalDialog';

export interface ProductionDialogsProps {
    showHopsDialog: boolean;
    hopName: string;
    showFinishDialog: boolean;
    onConfirmHop: () => void;
    onConfirmFinish: () => void;
}

export class ProductionDialogs extends React.Component<ProductionDialogsProps> {
    render(): React.ReactNode {
        const {showHopsDialog, hopName, showFinishDialog, onConfirmHop, onConfirmFinish} = this.props;
        return (
            <>
                <ModalDialog onConfirm={onConfirmHop} type={DialogType.CONFIRM} open={showHopsDialog} content={'Bitte den ' + hopName + ' Hopfen zufügen!'} header="Hopfen Zufügen" />
                <ModalDialog onConfirm={onConfirmFinish} type={DialogType.INFO} open={showFinishDialog} content="Das Bier ist fertig!" header="Fertig!" />
            </>
        );
    }
}
