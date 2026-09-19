import React from 'react';
import './PageLayout.css';

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    eyebrow?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

const classes = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

export const PageHeader = ({title, subtitle, eyebrow, actions, className}: PageHeaderProps) => (
    <header className={classes('brauhaus-page-header', className)}>
        <div className="brauhaus-page-heading">
            {eyebrow && <span className="brauhaus-page-eyebrow">{eyebrow}</span>}
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="brauhaus-page-actions">{actions}</div>}
    </header>
);

interface PageLayoutProps extends PageHeaderProps {
    children: React.ReactNode;
    contentClassName?: string;
    scroll?: boolean;
}

/** Opt-in page shell. Production deliberately does not use this component. */
export const PageLayout = ({children, contentClassName, scroll = true, ...header}: PageLayoutProps) => (
    <main className={classes('brauhaus-page', scroll ? 'brauhaus-page--scroll' : 'brauhaus-page--contained')}>
        <PageHeader {...header} />
        <div className={classes('brauhaus-page-content', contentClassName)}>{children}</div>
    </main>
);
