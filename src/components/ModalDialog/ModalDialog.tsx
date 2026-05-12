import React from 'react';
import {Button, Dialog, DialogTitle, DialogContent, DialogActions} from '@mui/material';
import './ModalDialog.css';
import {connect} from 'react-redux';

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
        const {content, header, open, type, confirmLabel, cancelLabel, showCancelButton} = this.props;

        return (
            <Dialog open={open} maxWidth={'md'} onClose={showCancelButton ? this.handleCancel : this.handleClose}>
                <DialogTitle className={type}>
                    {header}
                </DialogTitle>
                <DialogContent style={{ width: '300px', minHeight: '80px' }}>
                    <p>{this.contentWithLineBreaks(content)}</p>
                </DialogContent>
                <DialogActions>
                    {showCancelButton && (
                        <Button onClick={this.handleCancel} color="primary">
                            {cancelLabel ?? "Abbrechen"}
                        </Button>
                    )}
                    <Button onClick={this.handleClose} color="primary">
                        {confirmLabel ?? "Ok"}
                    </Button>
                </DialogActions>

            </Dialog>
        );
    }
}

export default ModalDialog;
