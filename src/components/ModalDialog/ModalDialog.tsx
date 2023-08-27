import React from 'react';
import {Button, Dialog, DialogTitle, DialogContent, DialogActions} from '@mui/material';
import './ModalDialog.css';
import {connect} from 'react-redux';

export enum DialogType {
    CONFIRM = "confirm",
    ERROR = "error",
    INFO = "info",
}

interface ModalDialogProps {
    onConfirm: (content: string) => void;
    type: DialogType;
    open: boolean;
    content: string;
    header: string;
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
    handleClose() {
        const {onConfirm, content} = this.props;

        onConfirm(content);
    };
    render() {
        const {content, header, open, type} = this.props;

        return (
            <Dialog open={open} maxWidth={'md'} onClose={this.handleClose}>
                <DialogTitle className={type}>
                    {header}
                </DialogTitle>
                <DialogContent style={{ width: '300px', minHeight: '80px' }}>
                    <p>{this.contentWithLineBreaks(content)}</p>
                </DialogContent>

            </Dialog>
        );
    }
}

export default ModalDialog;
