import React from 'react';
import {Dialog, DialogActions, DialogContent, DialogTitle} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import './AppDialog.css';

export type AppDialogVariant = 'info' | 'warning' | 'error' | 'success' | 'progress' | 'recovery' | 'confirm';

export interface AppDialogProps {
    open: boolean;
    title: string;
    variant?: AppDialogVariant;
    description?: React.ReactNode;
    children?: React.ReactNode;
    actions?: React.ReactNode;
    icon?: React.ReactNode;
    onClose?: () => void;
    disableClose?: boolean;
    maxWidth?: 'xs' | 'sm' | 'md';
    className?: string;
}

const icons: Record<AppDialogVariant, React.ReactNode> = {
    info: <InfoOutlinedIcon/>, warning: <WarningAmberRoundedIcon/>, error: <ErrorOutlineRoundedIcon/>,
    success: <CheckCircleOutlineRoundedIcon/>, progress: <AutorenewRoundedIcon className="app-dialog__spinning"/>,
    recovery: <HistoryRoundedIcon/>, confirm: <HelpOutlineRoundedIcon/>,
};

export const AppDialog: React.FC<AppDialogProps> = ({open, title, variant = 'info', description, children,
    actions, icon, onClose, disableClose = false, maxWidth = 'sm', className = ''}) => {
    const titleId = React.useId();
    return <Dialog open={open} maxWidth={maxWidth} fullWidth disableEscapeKeyDown={disableClose}
        onClose={disableClose ? undefined : onClose}
        PaperProps={{className: `app-dialog app-dialog--${variant} ${className}`.trim()}}
        aria-labelledby={titleId}>
        <DialogTitle id={titleId} className="app-dialog__header">
            <span className="app-dialog__icon" aria-hidden="true">{icon ?? icons[variant]}</span>
            <span className="app-dialog__heading">
                <span className="app-dialog__title">{title}</span>
                {description && <span className="app-dialog__description">{description}</span>}
            </span>
        </DialogTitle>
        {children && <DialogContent className="app-dialog__content">{children}</DialogContent>}
        {actions && <DialogActions className="app-dialog__actions">{actions}</DialogActions>}
    </Dialog>;
};

export default AppDialog;
