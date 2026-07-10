import React from 'react';
import './VersionPage.css';
import {getApplicationVersion} from '../../utils/version/appVersion';
import {ComponentVersionService} from '../../utils/version/componentVersions';

const unavailableVersion = 'Unavailable';
const loadingVersion = 'Loading…';

interface VersionPageProps {
    version?: string;
    loadControlVersion?: () => Promise<string>;
    loadDatabaseVersion?: () => Promise<string>;
}

interface VersionPageState {
    controlVersion: string;
    databaseVersion: string;
    isControlLoading: boolean;
    isDatabaseLoading: boolean;
}

class VersionPage extends React.Component<VersionPageProps, VersionPageState> {
    constructor(aProps: VersionPageProps) {
        super(aProps);
        this.state = {
            controlVersion: loadingVersion,
            databaseVersion: loadingVersion,
            isControlLoading: true,
            isDatabaseLoading: true,
        };
    }

    componentDidMount(): void {
        this.loadControlVersion();
        this.loadDatabaseVersion();
    }

    getVersion = (): string => {
        const {version} = this.props;
        if (version === undefined || version.trim().length === 0) {
            return getApplicationVersion();
        }

        return version;
    }

    private loadControlVersion = (): void => {
        const loader = this.props.loadControlVersion || ComponentVersionService.getControlVersion;
        loader()
            .then((aVersion: string): void => {
                this.setState({controlVersion: aVersion, isControlLoading: false});
            })
            .catch((): void => {
                this.setState({controlVersion: unavailableVersion, isControlLoading: false});
            });
    }

    private loadDatabaseVersion = (): void => {
        const loader = this.props.loadDatabaseVersion || ComponentVersionService.getDatabaseVersion;
        loader()
            .then((aVersion: string): void => {
                this.setState({databaseVersion: aVersion, isDatabaseLoading: false});
            })
            .catch((): void => {
                this.setState({databaseVersion: unavailableVersion, isDatabaseLoading: false});
            });
    }

    private renderVersionRow(aLabel: string, aValue: string, aTestId: string, aIsLoading: boolean): React.ReactNode {
        return (
            <div className="version-value-row">
                <span className="version-label">{aLabel}</span>
                <span
                    className={`version-value ${aIsLoading ? 'version-value-loading' : ''}`}
                    data-testid={aTestId}
                >
                    {aValue}
                </span>
            </div>
        );
    }

    render(): React.ReactNode {
        const {controlVersion, databaseVersion, isControlLoading, isDatabaseLoading} = this.state;
        return (
            <div className="version-page">
                <section className="version-card">
                    <p className="version-eyebrow">Anwendungsinformationen</p>
                    <h2>Version</h2>
                    <p className="version-description">
                        Versionsinformationen für die Benutzeroberfläche, die Steuerung und die Datenbankanwendung.
                    </p>
                    {this.renderVersionRow('UI', this.getVersion(), 'application-version', false)}
                    {this.renderVersionRow('Control', controlVersion, 'control-version', isControlLoading)}
                    {this.renderVersionRow('Database', databaseVersion, 'database-version', isDatabaseLoading)}
                </section>
            </div>
        );
    }
}

export default VersionPage;
