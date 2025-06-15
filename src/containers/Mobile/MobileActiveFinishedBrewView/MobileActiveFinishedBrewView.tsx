import React from 'react';
import { connect } from 'react-redux';
import { FinishedBrew } from '../../../model/FinishedBrew';
import '../MobileStatusView/MobileProductionView.css';
import { finishedBrewsTestData } from '../../../model/finishedBrewsTestData';
import { BeerActions } from '../../../actions/actions';

interface Props {
    finishedBrews?: FinishedBrew[];
    getFinishedBrews?: (isFetching: boolean) => void;
    saveFinishedBrew?: (brew: FinishedBrew) => void;
}

interface State {
    editMode: boolean;
    currentIndex: number;
    editedBrew: FinishedBrew | undefined;
}

class MobileActiveFinishedBrewView extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            editMode: false,
            currentIndex: 0,
            editedBrew: props.finishedBrews && props.finishedBrews.length > 0 ? { ...props.finishedBrews[0] } : undefined
        };
    }

    componentDidMount() {
        if (this.props.getFinishedBrews) {
            this.props.getFinishedBrews(true);
        }
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        if (prevProps.finishedBrews !== this.props.finishedBrews) {
            this.setState({
                currentIndex: 0,
                editedBrew: this.props.finishedBrews && this.props.finishedBrews.length > 0 ? { ...this.props.finishedBrews[0] } : undefined,
                editMode: false
            });
        }
        if (prevState.currentIndex !== this.state.currentIndex && this.props.finishedBrews) {
            this.setState({
                editedBrew: { ...this.props.finishedBrews[this.state.currentIndex] },
                editMode: false
            });
        }
    }

    handleEdit = () => {
        this.setState({ editMode: true });
    };

    handleSave = () => {
        const { editedBrew } = this.state;
        if (editedBrew) {
            // Redux-Action zum Speichern des Suds
            if (this.props.saveFinishedBrew) {
                this.props.saveFinishedBrew(editedBrew);
            }
            console.log('Sud gespeichert:', editedBrew);
        }
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

    handlePrev = () => {
        this.setState(prevState => ({
            currentIndex: Math.max(0, prevState.currentIndex - 1),
            editMode: false
        }));
    };

    handleNext = () => {
        if (!this.props.finishedBrews) return;
        this.setState(prevState => ({
            currentIndex: Math.min(this.props.finishedBrews!.length - 1, prevState.currentIndex + 1),
            editMode: false
        }));
    };

    render() {
        const { finishedBrews } = this.props;
        const { editMode, editedBrew, currentIndex } = this.state;
        if (!finishedBrews || finishedBrews.length === 0 || !editedBrew) {
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
                    {editedBrew.name}
                </h2>
                {finishedBrews.length > 1 && (
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button className="mobile-pagination-btn" onClick={this.handlePrev} disabled={currentIndex === 0}>Zurück</button>
                        <span className="mobile-pagination-numbers">{currentIndex + 1} / {finishedBrews.length}</span>
                        <button className="mobile-pagination-btn" onClick={this.handleNext} disabled={currentIndex === finishedBrews.length - 1}>Weiter</button>
                    </div>
                )}
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
                                name="residual_extract"
                                type="number"
                                value={editedBrew.residual_extract ?? 0}
                                onChange={this.handleChange}
                                className="mobile-edit-input"
                            />
                        ) : (
                            <span className="mobile-value">{editedBrew.residual_extract}</span>
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
                            name="note"
                            value={editedBrew.note}
                            onChange={this.handleChange}
                            rows={4}
                            style={{ width: '100%' }}
                        />
                    ) : (
                        <div className="mobile-value">{editedBrew.note || '-'}</div>
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
    finishedBrews: state.beerDataReducer?.finishedBrews?.filter((brew: FinishedBrew) => brew.active) || finishedBrewsTestData.filter((brew: FinishedBrew) => brew.active)
});

const mapDispatchToProps = (dispatch: any) => ({
    getFinishedBrews: (isFetching: boolean) => {
        dispatch(BeerActions.getFinishedBeers(isFetching));
    },
    saveFinishedBrew: (brew: FinishedBrew) => {
        dispatch(BeerActions.updateActiveBeer(brew));
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(MobileActiveFinishedBrewView);

