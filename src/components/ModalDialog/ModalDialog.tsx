import React from 'react';
import {Button, ButtonProps, Dialog, DialogTitle, DialogContent, DialogActions} from '@mui/material';
import './ModalDialog.css';

export enum DialogType {
    CONFIRM = "confirm",
    ERROR = "error",
    INFO = "info"
}

interface ModalDialogProps {
    onConfirm: (content: string) => void;
    onCancel?: () => void;
    type: DialogType;
    open: boolean;
    content: string;
    header: string;
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
        const {content, header, open, type, confirmLabel, cancelLabel, showCancelButton, confirmColor, confirmVariant,
            actionsDisabled, showConfirmButton = true, disableClose} = this.props;

        return (
            <Dialog open={open} maxWidth={'md'} onClose={disableClose ? undefined : (showCancelButton ? this.handleCancel : this.handleClose)}>
                <DialogTitle className={type}>
                    {header}
                </DialogTitle>
                <DialogContent style={{ width: '300px', minHeight: '80px' }}>
                    <p>{this.contentWithLineBreaks(content)}</p>
                </DialogContent>
                <DialogActions>
                    {showCancelButton && (
                        <Button onClick={this.handleCancel} color="primary" disabled={actionsDisabled}>
                            {cancelLabel ?? "Abbrechen"}
                        </Button>
                    )}
                    {showConfirmButton && <Button onClick={this.handleClose} color={confirmColor ?? "primary"} variant={confirmVariant ?? "text"} disabled={actionsDisabled}>
                        {confirmLabel ?? "Ok"}
                    </Button>}
                </DialogActions>

            </Dialog>
        );
    }
}

export default ModalDialog;
