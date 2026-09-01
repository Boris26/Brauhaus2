import React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface SettingsAccordionProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    status?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

export const SettingsAccordion = ({icon, title, description, status, className = '', children}: SettingsAccordionProps) => (
    <Accordion component="section" disableGutters elevation={0} className={`settings-accordion ${className}`.trim()}>
        <AccordionSummary className="settings-accordion-summary" expandIcon={<ExpandMoreIcon aria-hidden="true" />}>
            <span className="settings-accordion-icon" aria-hidden="true">{icon}</span>
            <span className="settings-accordion-heading">
                <span className="settings-accordion-title">{title}</span>
                <span className="settings-accordion-description">{description}</span>
            </span>
            {status && <span className="settings-accordion-status">{status}</span>}
        </AccordionSummary>
        <AccordionDetails className="settings-accordion-details">{children}</AccordionDetails>
    </Accordion>
);
