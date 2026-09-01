import React from 'react';
import {AppAccordion, AppAccordionHeader} from '../../components/AppAccordion/AppAccordion';

interface SettingsAccordionProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    status?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

export const SettingsAccordion = ({icon, title, description, status, className = '', children}: SettingsAccordionProps) => (
    <AppAccordion
        component="section"
        className={className}
        summary={<AppAccordionHeader icon={icon} title={title} description={description} status={status} />}
    >
        {children}
    </AppAccordion>
);
