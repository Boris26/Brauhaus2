import React from 'react';
import Accordion, {AccordionProps} from '@mui/material/Accordion';
import AccordionDetails, {AccordionDetailsProps} from '@mui/material/AccordionDetails';
import AccordionSummary, {AccordionSummaryProps} from '@mui/material/AccordionSummary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import './AppAccordion.css';

interface AppAccordionProps extends Omit<AccordionProps, 'children'> {
    /** Allows callers to retain MUI's polymorphic root semantics (for example, a settings section). */
    component?: React.ElementType;
    summary: React.ReactNode;
    children: React.ReactNode;
    summaryProps?: Omit<AccordionSummaryProps, 'children' | 'expandIcon'>;
    detailsProps?: Omit<AccordionDetailsProps, 'children'>;
    expandIcon?: React.ReactNode;
}

const joinClassNames = (...classNames: Array<string | undefined>) => classNames.filter(Boolean).join(' ');

/** Shared visual shell for application accordions. State and event props are passed to MUI unchanged. */
export const AppAccordion = ({
    summary,
    children,
    summaryProps,
    detailsProps,
    expandIcon = <ExpandMoreIcon aria-hidden="true" />,
    className,
    disableGutters = true,
    elevation = 0,
    ...accordionProps
}: AppAccordionProps) => (
    <Accordion
        {...accordionProps}
        disableGutters={disableGutters}
        elevation={elevation}
        className={joinClassNames('app-accordion', className)}
    >
        <AccordionSummary
            {...summaryProps}
            className={joinClassNames('app-accordion-summary', summaryProps?.className)}
            expandIcon={expandIcon}
        >
            {summary}
        </AccordionSummary>
        <AccordionDetails
            {...detailsProps}
            className={joinClassNames('app-accordion-details', detailsProps?.className)}
        >
            {children}
        </AccordionDetails>
    </Accordion>
);

interface AppAccordionHeaderProps {
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    status?: React.ReactNode;
}

/** Flexible standard header; callers can pass arbitrary `summary` content when controls require it. */
export const AppAccordionHeader = ({icon, title, description, status}: AppAccordionHeaderProps) => (
    <>
        {icon && <span className="app-accordion-icon" aria-hidden="true">{icon}</span>}
        <span className="app-accordion-heading">
            <span className="app-accordion-title">{title}</span>
            {description && <span className="app-accordion-description">{description}</span>}
        </span>
        {status && <span className={`app-accordion-status ${icon ? '' : 'app-accordion-status--without-icon'}`.trim()}>{status}</span>}
    </>
);
