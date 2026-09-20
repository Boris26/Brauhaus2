import React from 'react';
import './PageLayout.css';

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
    /** @deprecated Page headers deliberately do not render icons. */
    icon?: React.ReactNode;
}

const classes = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

export const PageHeader = ({title, subtitle, actions, className}: PageHeaderProps) => (
    <header className={classes('brauhaus-page-header', className)}>
        <div className="brauhaus-page-heading">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="brauhaus-page-actions">{actions}</div>
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
