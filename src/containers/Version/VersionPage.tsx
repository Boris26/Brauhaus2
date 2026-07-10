import React from 'react';
import './VersionPage.css';
import {getApplicationVersion} from '../../utils/version/appVersion';

interface VersionPageProps {
    version?: string;
}

class VersionPage extends React.Component<VersionPageProps> {
    getVersion = (): string => {
        const {version} = this.props;
        if (version === undefined || version.trim().length === 0) {
            return getApplicationVersion();
        }

        return version;
    }

    render(): React.ReactNode {
        return (
            <div className="version-page">
                <section className="version-card">
                    <p className="version-eyebrow">Anwendungsinformationen</p>
                    <h2>Version</h2>
                    <p className="version-description">
                        Die angezeigte Version wurde beim Erstellen der Anwendung in das Frontend eingebunden.
                    </p>
                    <div className="version-value-row">
                        <span className="version-label">Frontend-Version</span>
                        <span className="version-value" data-testid="application-version">{this.getVersion()}</span>
                    </div>
                </section>
            </div>
        );
    }
}

export default VersionPage;
