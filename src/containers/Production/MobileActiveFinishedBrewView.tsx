import React from 'react';
import { connect } from 'react-redux';
import { FinishedBrew } from '../../model/FinishedBrew';
import './MobileProductionView.css';
import { finishedBrewsTestData } from '../../model/finishedBrewsTestData';

interface Props {
    finishedBrew?: FinishedBrew;
}

interface State {
    editMode: boolean;
    editedBrew: FinishedBrew | undefined;
}

class MobileActiveFinishedBrewView extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            editMode: false,
            editedBrew: props.finishedBrew ? { ...props.finishedBrew } : undefined
        };
    }

    componentDidUpdate(prevProps: Props) {
        if (prevProps.finishedBrew?.id !== this.props.finishedBrew?.id) {
            this.setState({
                editedBrew: this.props.finishedBrew ? { ...this.props.finishedBrew } : undefined,
                editMode: false
            });
        }
    }

    handleEdit = () => {
        this.setState({ editMode: true });
    };

    handleSave = () => {
        // TODO: Dispatch Save-Action für editedBrew
        this.setState({ editMode: false });
    };

    handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        this.setState(prevState => ({
            editedBrew: prevState.editedBrew
                ? { ...prevState.editedBrew, [name]: value }
                : undefined
        }));
    };

    render() {
        const { finishedBrew } = this.props;
        const { editMode, editedBrew } = this.state;
        if (!finishedBrew || !editedBrew) {
            return <div className="mobile-production-container"><p>Kein aktiver Sud gefunden.</p></div>;
        }
        return (
            <div
                className="mobile-production-container"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    height: 'auto',
                    minHeight: '50vh',
                    width: '100vw',
                    padding: '.5rem',
                    margin: '0.1rem',
                    boxShadow: 'none',
                }}
            >
                <h2>
                    {editMode ? (
                        <input
                            name="name"
                            value={editedBrew.name}
                            onChange={this.handleChange}
                            className="mobile-edit-input"
                        />
                    ) : (
                        editedBrew.name
                    )}
                </h2>
                <div className="mobile-info-list">
                    <div className="mobile-info-block">
                        <span className="mobile-label">Start-Datum:</span>
                        {editMode ? (
                            <input
                                name="startDate"
                                type="date"
                                value={
                                    typeof editedBrew.startDate === 'string'
                                        ? editedBrew.startDate.slice(0, 10)
                                        : editedBrew.startDate instanceof Date
                                        ? editedBrew.startDate.toISOString().slice(0, 10)
                                        : ''
                                }
                                onChange={this.handleChange}
                                className="mobile-edit-input"
                            />
                        ) : (
                            <span className="mobile-value">
                                {editedBrew.startDate instanceof Date
                                    ? editedBrew.startDate.toLocaleDateString()
                                    : editedBrew.startDate}
                            </span>
                        )}
                    </div>
                    <div className="mobile-info-block">
                        <span className="mobile-label">End-Datum:</span>
                        {editMode ? (
                            <input
                                name="endDate"
                                type="date"
                                value={
                                    typeof editedBrew.endDate === 'string'
                                        ? editedBrew.endDate.slice(0, 10)
                                        : editedBrew.endDate instanceof Date
                                        ? editedBrew.endDate.toISOString().slice(0, 10)
                                        : ''
                                }
                                onChange={this.handleChange}
                                className="mobile-edit-input"
                            />
                        ) : (
                            <span className="mobile-value">
                                {editedBrew.endDate instanceof Date
                                    ? editedBrew.endDate.toLocaleDateString()
                                    : editedBrew.endDate}
                            </span>
                        )}
                    </div>
                    <div className="mobile-info-block">
                        <span className="mobile-label">Stammwürze:</span>
                        {editMode ? (
                            <input
                                name="originalwort"
                                type="number"
                                value={editedBrew.originalwort}
                                onChange={this.handleChange}
                                className="mobile-edit-input"
                            />
                        ) : (
                            <span className="mobile-value">{editedBrew.originalwort}</span>
                        )}
                    </div>
                    <div className="mobile-info-block">
                        <span className="mobile-label">Restextrakt:</span>
                        {editMode ? (
                            <input
                                name="residualExtract"
                                type="number"
                                value={editedBrew.residualExtract}
                                onChange={this.handleChange}
                                className="mobile-edit-input"
                            />
                        ) : (
                            <span className="mobile-value">{editedBrew.residualExtract}</span>
                        )}
                    </div>
                    <div className="mobile-info-block">
                        <span className="mobile-label">Liter:</span>
                        {editMode ? (
                            <input
                                name="liters"
                                type="number"
                                value={editedBrew.liters}
                                onChange={this.handleChange}
                                className="mobile-edit-input"
                            />
                        ) : (
                            <span className="mobile-value">{editedBrew.liters}</span>
                        )}
                    </div>
                </div>
                <div className="mobile-info-block">
                    <span className="mobile-label">Notizen:</span>
                    {editMode ? (
                        <textarea
                            name="description"
                            value={editedBrew.description}
                            onChange={this.handleChange}
                            rows={4}
                            style={{ width: '100%' }}
                        />
                    ) : (
                        <div className="mobile-value">{editedBrew.description || '-'}</div>
                    )}
                </div>
                <button className="mobile-polling-btn" onClick={editMode ? this.handleSave : this.handleEdit}>
                    {editMode ? 'Speichern' : 'Bearbeiten'}
                </button>
            </div>
        );
    }
}

const mapStateToProps = (state: any) => ({
    finishedBrew: (finishedBrewsTestData && finishedBrewsTestData.length > 0) ? finishedBrewsTestData[0] : undefined
});

export default connect(mapStateToProps)(MobileActiveFinishedBrewView);
