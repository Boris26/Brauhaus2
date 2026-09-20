import React from 'react';
import {Button, ButtonProps} from '@mui/material';
import AppDialog, {AppDialogVariant, DialogCancelButton} from '../AppDialog/AppDialog';
import './ModalDialog.css';

export enum DialogType {
    CONFIRM = "confirm",
    ERROR = "error",
    INFO = "info",
    WARNING = "warning",
    SUCCESS = "success",
    PROGRESS = "progress"
}

interface ModalDialogProps {
    onConfirm: (content: string) => void;
    onCancel?: () => void;
    type: DialogType;
    open: boolean;
    content: string;
    header: string;
    icon?: React.ReactNode;
    confirmIcon?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    showCancelButton?: boolean;
    confirmColor?: ButtonProps['color'];
    confirmVariant?: ButtonProps['variant'];
    actionsDisabled?: boolean;
    showConfirmButton?: boolean;
    disableClose?: boolean;
};

interface ModalDialogState {
    open: boolean;
}

class ModalDialog extends React.Component<ModalDialogProps, ModalDialogState> {
    // ... (der restliche Code bleibt unverändert)

    contentWithLineBreaks(text: string) {
        if(text !== undefined)
        {
            const lines = text.split('\n');
            return lines.map((line, index) => (
                <React.Fragment key={index}>
                    {line}
                    {index < lines.length - 1 && <br />}
                </React.Fragment>
            ));
        }

    }
    handleClose = ()=> {
        const {onConfirm, content} = this.props;

        onConfirm(content);
    };

    handleCancel = () => {
        const {onCancel} = this.props;
        if (onCancel) {
            onCancel();
        }
    };
    render() {
        const {content, header, open, type, icon, confirmIcon, confirmLabel, cancelLabel, showCancelButton, confirmColor, confirmVariant,
            actionsDisabled, showConfirmButton = true, disableClose} = this.props;

        return (
            <AppDialog open={open} title={header} variant={type as AppDialogVariant} icon={icon}
                disableClose={disableClose} onClose={showCancelButton ? this.handleCancel : this.handleClose}
                actions={showCancelButton || showConfirmButton ? <>
                    {showCancelButton && (
                        <DialogCancelButton onClick={this.handleCancel} disabled={actionsDisabled} label={cancelLabel ?? "Abbrechen"}/>
                    )}
                    {showConfirmButton && <Button className={`brauhaus-button ${confirmColor === 'error' ? 'brauhaus-button-danger' : 'brauhaus-button-primary'}`} onClick={this.handleClose} color={confirmColor ?? "primary"} variant={confirmVariant ?? "text"} disabled={actionsDisabled} startIcon={confirmIcon}>
                        {confirmLabel ?? "Ok"}
                    </Button>}
                </> : undefined}>
                <p>{this.contentWithLineBreaks(content)}</p>
            </AppDialog>
        );
    }
}

export default ModalDialog;
