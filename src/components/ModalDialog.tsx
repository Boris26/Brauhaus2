import React from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { connect } from 'react-redux';

interface ModalDialogProps  {
    onConfirm: () => void;
    open: boolean;
    content: string;
    header: string
};

interface ModalDialogState {
    open: boolean;
}




class ModalDialog extends React.Component<ModalDialogProps,ModalDialogState>
{    constructor(props: ModalDialogProps) {
        super(props);
        this.handleClose = this.handleClose.bind(this);
        this.state = {  open: false };
    }

    componentDidMount() {
        this.setState({ open: this.props.open });
    }

    componentDidUpdate(prevProps: Readonly<ModalDialogProps>, prevState: Readonly<{}>, snapshot?: any) {
        if (prevProps.open !== this.props.open) {
            console.log("open has changed");
        }
    }

    handleClose() {
    const { onConfirm } = this.props;
        this.setState({ open: false });
        onConfirm();
    };
render() {
    const {content,header,open} = this.props

    return (
        <Dialog open={open} onClose={this.handleClose}>
            <DialogTitle>{header}</DialogTitle>
            <DialogContent>
                <p>{content}</p>
            </DialogContent>
            <DialogActions>
                <Button onClick={this.handleClose}>Schließen</Button>
            </DialogActions>
        </Dialog>
    );
}
};

const mapStateToProps = (state: any) => ({
    open: state.beerDataReducer.isSubmitMaltSuccessful,
    content: state.applicationReducer.content,
    header: state.applicationReducer.header
    });

export default ModalDialog;

