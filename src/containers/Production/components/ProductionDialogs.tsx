import React from 'react';
import ModalDialog, {DialogType} from '../../../components/ModalDialog/ModalDialog';

export interface ProductionDialogsProps {
    showHopsDialog: boolean;
    hopName: string;
    showErrorDialog: boolean;
    errorContent: string;
    showFinishDialog: boolean;
    onConfirmHop: () => void;
    onConfirmError: () => void;
    onConfirmFinish: () => void;
}

export class ProductionDialogs extends React.Component<ProductionDialogsProps> {
    render(): React.ReactNode {
        const {showHopsDialog, hopName, showErrorDialog, errorContent, showFinishDialog, onConfirmHop, onConfirmError, onConfirmFinish} = this.props;
        return (
            <>
                <ModalDialog onConfirm={onConfirmHop} type={DialogType.CONFIRM} open={showHopsDialog} content={'Bitte den ' + hopName + ' Hopfen zufügen!'} header="Hopfen Zufügen" />
                <ModalDialog onConfirm={onConfirmError} type={DialogType.ERROR} open={showErrorDialog} content={errorContent} header="Fehler!" />
                <ModalDialog onConfirm={onConfirmFinish} type={DialogType.INFO} open={showFinishDialog} content="Das Bier ist fertig!" header="Fertig!" />
            </>
        );
    }
}
