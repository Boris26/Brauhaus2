import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import './FinishedBrewsTable.css';
import {FinishedBrew} from "../../../model/FinishedBrew";
import {connect} from "react-redux";
import {finishedBrewsTestData} from "../../../model/finishedBrewsTestData";
import {BeerActions} from "../../../actions/actions";
import {isNil} from "lodash";
import { v4 as uuidv4 } from 'uuid';
import { eBrewState, BrewStateGerman } from '../../../enums/eBrewState';
import Panel from '../../Panel/Panel';
import FinishedBrewDetails from './FinishedBrewDetails';


interface FinishedBrewsTableProps {
    brews: FinishedBrew[];
    onSave: (brew: FinishedBrew) => void;
    exportPdf: (brews: FinishedBrew[]) => void;
    getFinishedBrews: (isFetching: boolean) => void;
    beers: { id: string; name: string }[]; // id als string (UUID)
    onDelete: (id: string) => void;
}

interface FinishedBrewsTableState {
    editRows: Record<string, Partial<FinishedBrew>>;
    filterYear: string;
    showOnlyActive: boolean;
    filterOutActive: boolean;
    clickedFinishBtn: Record<string, boolean>;
    newRowActive?: boolean;
    newRowData?: Partial<FinishedBrew>;
    panelBrewId?: string | null;
}

const calcAlcohol = (w1: number, w2: number | null) => {
    if (isNil(w2)) return '-';
    if (isNaN(w1) || isNaN(w2)) return '-';
    return (((w1 - w2) * 0.5).toFixed(2) + ' %');
};

class FinishedBrewsTable extends React.Component<FinishedBrewsTableProps, FinishedBrewsTableState> {
    constructor(props: FinishedBrewsTableProps) {
        super(props);
        this.state = { editRows: {}, filterYear: '', showOnlyActive: false, filterOutActive: false, clickedFinishBtn: {}, panelBrewId: null };
    }

    componentDidMount() {
        const { getFinishedBrews } = this.props;
        getFinishedBrews(true);
    }

    handleChange = (id: string, field: keyof FinishedBrew, value: string) => {
        let parsedValue: any = value;
        if (field === 'liters' || field === 'originalwort') {
            parsedValue = value === '' ? '' : Math.max(0, Number(value));
        } else if (field === 'residual_extract') {
            parsedValue = value === '' ? null : Math.max(0, Number(value));
        }
        this.setState(prevState => ({
            editRows: {
                ...prevState.editRows,
                [id]: {
                    ...prevState.editRows[id],
                    [field]:
                        field === 'liters' || field === 'originalwort' || field === 'residual_extract'
                            ? parsedValue
                            : value
                }
            }
        }));
    };

    handleSave = (id: string) => {
        const brew = this.props.brews.find(b => b.id === id);
        if (!brew) return;
        const updated = { ...brew, beer_id: brew.beer_id,state : brew.state ,...this.state.editRows[id] } as FinishedBrew;
        this.props.onSave(updated);
        this.setState(prevState => {
            const editRows = { ...prevState.editRows };
            delete editRows[id];
            return { editRows };
        });
    };

    handleFilterYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({ filterYear: e.target.value });
    };

    handleActiveFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Wenn "Aktive ausfiltern" aktiv ist, verhindere das Aktivieren von "Nur aktive anzeigen"
        if (this.state.filterOutActive && e.target.checked) {
            return;
        }
        this.setState({ showOnlyActive: e.target.checked });
    };

    handleFilterOutActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        this.setState(prevState => ({
            filterOutActive: checked,
            showOnlyActive: checked ? false : prevState.showOnlyActive
        }));
    };

    getYearsFromBrews = () => {
        const years = new Set<string>();
        (this.props.brews || []).forEach(brew => {
            let dateStr = '';
            if (brew.startDate instanceof Date) {
                dateStr = brew.startDate.getFullYear().toString();
            } else if (typeof brew.startDate === 'string' && brew.startDate.length >= 4) {
                dateStr = brew.startDate.slice(0, 4);
            }
            if (dateStr) years.add(dateStr);
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    };

    handleExportPdf = () => {
        // Filter brews wie in render()
        const { brews, exportPdf } = this.props;
        const { filterYear, showOnlyActive, filterOutActive } = this.state;
        const filteredBrews = this.filterBrewsByYearAndActive(brews, filterYear, showOnlyActive, filterOutActive);
        exportPdf(filteredBrews);
    };

    handleFinishClick = (brew: FinishedBrew) => {
        this.setState(prev => ({
            clickedFinishBtn: { ...prev.clickedFinishBtn, [brew.id]: true }
        }), () => {
            setTimeout(() => {
                this.setState(prev => ({
                    clickedFinishBtn: { ...prev.clickedFinishBtn, [brew.id]: false }
                }));
                const updated = { ...brew, active: false, beer_id: brew.beer_id };
                this.props.onSave(updated);
            }, 150);
        });
    };

    handleDelete = (id: string) => {
        const { onDelete } = this.props;
        onDelete(id);
    };

    handleShowDetails = (brewId: string | null) => {
        this.setState(prev => ({
            panelBrewId: prev.panelBrewId === brewId ? null : brewId
        }));

    }

    private filterBrewsByYearAndActive(aBrews: FinishedBrew[] = [], aFilterYear: string, aShowOnlyActive: boolean, aFilterOutActive: boolean) {
        return (aBrews || []).filter(brew => {
            let year = '';
            if (brew.startDate instanceof Date) {
                year = brew.startDate.getFullYear().toString();
            } else if (typeof brew.startDate === 'string' && brew.startDate.length >= 4) {
                year = brew.startDate.slice(0, 4);
            }
            const yearMatch = aFilterYear ? year === aFilterYear : true;
            const activeMatch = aShowOnlyActive ? brew.active : true;
            const outActiveMatch = aFilterOutActive ? !brew.active : true;
            return yearMatch && activeMatch && outActiveMatch;
        });
    }

    renderFilterControls(years: string[]) {
        const { filterYear, showOnlyActive, filterOutActive } = this.state;
        return (
            <div className="filter-container">
                <label htmlFor="year-filter" className="filter-label">
                    Jahr filtern:
                </label>
                <select
                    id="year-filter"
                    value={filterYear}
                    onChange={this.handleFilterYearChange}
                    className="FinishedBrewsTable-year-filter"
                >
                    <option value="">Alle</option>
                    {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <label className="active-filter-label">
                    <input
                        type="checkbox"
                        checked={showOnlyActive}
                        onChange={this.handleActiveFilterChange}
                        className="active-filter-checkbox"
                        disabled={filterOutActive}
                    />
                    <span>Nur aktive anzeigen</span>
                </label>
                <label className="active-filter-label">
                    <input
                        type="checkbox"
                        checked={filterOutActive}
                        onChange={this.handleFilterOutActiveChange}
                        className="active-filter-checkbox"
                    />
                    <span>Aktive ausfiltern</span>
                </label>
                <button
                    className="finish-btn"
                    style={{ marginLeft: '2rem', height: '2.2rem', display: 'flex', alignItems: 'center' }}
                    onClick={this.handleExportPdf}
                    title="PDF exportieren"
                >
                    <span role="img" aria-label="PDF" style={{ fontSize: 22, verticalAlign: 'middle', marginRight: 4 }}>📄</span>
                    PDF exportieren
                </button>
                <button
                    className="finish-btn"
                    style={{ marginLeft: '2rem', height: '2.2rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => this.setState({ newRowActive: true, newRowData: {} })}
                    title="Neuen Eintrag hinzufügen"
                >
                    <span role="img" aria-label="Plus" style={{ fontSize: 22, verticalAlign: 'middle', marginRight: 4 }}>➕</span>
                    Neuer Eintrag
                </button>
            </div>
        );
    }

    renderNewRow(beers: { id: string; name: string }[]) {
        const { newRowActive, newRowData } = this.state;
        if (!newRowActive) return null;
        return (
            <TableRow className="table-row">
                <TableCell className="table-cell">
                    <select
                        value={newRowData?.name || ''}
                        onChange={e => {
                            const selectedBeer = beers.find(b => b.name === e.target.value);
                            this.setState(prev => ({
                                newRowData: {
                                    ...prev.newRowData,
                                    name: selectedBeer ? selectedBeer.name : '',
                                    beer_id: selectedBeer ? selectedBeer.id : undefined
                                }
                            }));
                        }}
                        className="table-edit-field"
                    >
                        <option value="">Bier wählen</option>
                        {beers.map(beer => (
                            <option key={beer.id} value={beer.name}>{beer.name}</option>
                        ))}
                    </select>
                </TableCell>
                <TableCell className="table-cell">
                    <input
                        type="date"
                        value={newRowData?.startDate
                            ? (newRowData.startDate instanceof Date
                                ? newRowData.startDate.toISOString().slice(0, 10)
                                : newRowData.startDate)
                            : ''}
                        onChange={e => this.setState(prev => ({ newRowData: { ...prev.newRowData, startDate: e.target.value } }))}
                        className="table-edit-field"
                    />
                </TableCell>
                <TableCell className="table-cell">
                    <input
                        type="date"
                        value={newRowData?.endDate
                            ? (newRowData.endDate instanceof Date
                                ? newRowData.endDate.toISOString().slice(0, 10)
                                : newRowData.endDate)
                            : ''}
                        onChange={e => this.setState(prev => ({ newRowData: { ...prev.newRowData, endDate: e.target.value } }))}
                        className="table-edit-field"
                    />
                </TableCell>
                <TableCell className="table-cell liters">
                    <input
                        type="number"
                        value={newRowData?.liters || ''}
                        onChange={e => this.setState(prev => ({ newRowData: { ...prev.newRowData, liters: Number(e.target.value) } }))}
                        className="table-edit-field"
                    />
                </TableCell>
                <TableCell className="table-cell originalwort">
                    <input
                        type="number"
                        value={newRowData?.originalwort || ''}
                        onChange={e => this.setState(prev => ({ newRowData: { ...prev.newRowData, originalwort: Number(e.target.value) } }))}
                        className="table-edit-field"
                    />
                </TableCell>
                <TableCell className="table-cell residualExtract">
                    <input
                        type="number"
                        value={newRowData?.residual_extract || ''}
                        onChange={e => this.setState(prev => ({ newRowData: { ...prev.newRowData, residual_extract: Number(e.target.value) } }))}
                        className="table-edit-field"
                    />
                </TableCell>
                <TableCell className="table-cell">
                    {/* Alkoholspalte bleibt leer in der neuen Zeile */}
                    -
                </TableCell>
                <TableCell className="table-cell">
                    <select
                        value={newRowData?.state || eBrewState.FERMENTATION}
                        onChange={e => this.setState(prev => ({ newRowData: { ...prev.newRowData, state: e.target.value as eBrewState } }))}
                        className="table-edit-field"
                    >
                        {Object.values(eBrewState).map(state => (
                            <option key={state} value={state}>{BrewStateGerman[state]}</option>
                        ))}
                    </select>
                </TableCell>
                <TableCell className="table-cell beschreibung">
                    <input
                        type="text"
                        value={newRowData?.note || ''}
                        onChange={e => this.setState(prev => ({ newRowData: { ...prev.newRowData, note: e.target.value } }))}
                        className="table-edit-field"
                    />
                </TableCell>
                <TableCell className="table-cell">
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className="finish-btn"
                            onClick={() => {
                                const newId = uuidv4();
                                const newBrew: FinishedBrew = { ...newRowData, id: newId, beer_id: newRowData?.beer_id, active: true } as FinishedBrew;
                                this.props.onSave(newBrew);
                                this.setState({ newRowActive: false, newRowData: {} });
                            }}
                            title="Speichern"
                        >
                            <span role="img" aria-label="Speichern" style={{ fontSize: 22, verticalAlign: 'middle',  display: 'inline-block', position: 'relative', top: '3px' }}>💾</span>
                        </button>
                        <button
                            className="cancel-btn"
                            onClick={() => this.setState({ newRowActive: false, newRowData: {} })}
                            title="Abbrechen"
                        >
                            <span role="img" aria-label="Abbrechen" style={{ fontSize: 22, verticalAlign: 'middle',  display: 'inline-block', position: 'relative', top: '3px' }}>✖️</span>
                        </button>
                    </div>
                </TableCell>
            </TableRow>
        );
    }

    renderBrewRow(brew: FinishedBrew, beers: { id: string; name: string }[]) {
        const { editRows, clickedFinishBtn } = this.state;
        const brewId = brew.id;
        const isEdited = !!editRows[brewId];
        const row = { ...brew, ...editRows[brewId] };
        const isActive = brew.active;
        return (
            <TableRow key={brewId} className={`table-row${isActive ? ' active-row' : ''}`}>
                <TableCell className="table-cell">{brew.name}</TableCell>
                <TableCell className="table-cell">
                    <TextField
                        variant="standard"
                        value={row.startDate instanceof Date ? row.startDate.toISOString().slice(0, 10) : row.startDate}
                        type="date"
                        onChange={e => {
                            const target = e.target as HTMLInputElement;
                            this.handleChange(brewId, 'startDate', target.value);
                        }}
                        className="table-edit-field"
                        InputProps={{ style: { color: 'white' }, disableUnderline: true, readOnly: !isActive }}
                    />
                </TableCell>
                <TableCell className="table-cell">
                    <TextField
                        variant="standard"
                        value={row.endDate ? (row.endDate instanceof Date ? row.endDate.toISOString().slice(0, 10) : row.endDate) : ''}
                        type="date"
                        onChange={e => {
                            const target = e.target as HTMLInputElement;
                            this.handleChange(brewId, 'endDate', target.value);
                        }}
                        className="table-edit-field"
                        InputProps={{ style: { color: 'white' }, disableUnderline: true, readOnly: !isActive }}
                    />
                </TableCell>
                <TableCell className="table-cell liters">
                    <TextField
                        variant="standard"
                        value={row.liters === null || row.liters === undefined ? '' : row.liters}
                        type="number"
                        onChange={e => {
                            const target = e.target as HTMLInputElement;
                            this.handleChange(brewId, 'liters', target.value);
                        }}
                        className="table-edit-field"
                        InputProps={{ style: { color: 'white' }, disableUnderline: true, readOnly: !isActive }}
                    />
                </TableCell>
                <TableCell className="table-cell originalwort">
                    <TextField
                        variant="standard"
                        value={row.originalwort === null || row.originalwort === undefined ? '' : row.originalwort}
                        type="number"
                        onChange={e => {
                            const target = e.target as HTMLInputElement;
                            this.handleChange(brewId, 'originalwort', target.value);
                        }}
                        className="table-edit-field"
                        InputProps={{ style: { color: 'white' }, disableUnderline: true, readOnly: !isActive }}
                    />
                </TableCell>
                <TableCell className="table-cell residualExtract">
                    <TextField
                        variant="standard"
                        value={row.residual_extract === null || row.residual_extract === undefined ? '' : row.residual_extract}
                        type="number"
                        onChange={e => {
                            const target = e.target as HTMLInputElement;
                            this.handleChange(brewId, 'residual_extract', target.value);
                        }}
                        className="table-edit-field"
                        InputProps={{ style: { color: 'white' }, disableUnderline: true, readOnly: !isActive }}
                    />
                </TableCell>
                <TableCell className="table-cell alcohol">{calcAlcohol(row.originalwort, row.residual_extract)}</TableCell>
                <TableCell className="table-cell">
                    <select
                        value={row.state}
                        onChange={e => this.handleChange(brewId, 'state', e.target.value as eBrewState)}
                        className="table-edit-field"
                        disabled={!isActive}
                    >
                        {Object.values(eBrewState).map(state => (
                            <option key={state} value={state}>{BrewStateGerman[state]}</option>
                        ))}
                    </select>
                </TableCell>
                <TableCell className="table-cell beschreibung">
                    <TextField
                        variant="standard"
                        value={row.note || ''}
                        onChange={e => this.handleChange(brewId, 'note', e.target.value)}
                        className="table-edit-field"
                        InputProps={{ style: { color: 'white' }, disableUnderline: true, readOnly: !isActive }}
                    />
                </TableCell>
                <TableCell className="table-cell">
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {isEdited && isActive && (
                            <button
                                className="finish-btn"
                                onClick={() => this.handleSave(brewId)}
                                title="Speichern"
                            >
                                <span role="img" aria-label="Speichern" style={{ fontSize: 22, verticalAlign: 'middle',  display: 'inline-block', position: 'relative', top: '3px' }}>💾</span>
                            </button>
                        )}
                        {isActive && (
                            <button
                                className={`finish-btn${clickedFinishBtn[brewId] ? ' clicked' : ''}`}
                                title="Endgültig fertigstellen"
                                onClick={() => this.handleFinishClick(brew)}
                                disabled={row.residual_extract === null || row.residual_extract === undefined}
                            >
                                <span role="img" aria-label="Fertig" style={{ fontSize: 22, verticalAlign: 'middle',  display: 'inline-block', position: 'relative', top: '3px' }}>✅</span>
                            </button>
                        )}
                        <button
                            className="cancel-btn"
                            onClick={() => this.handleDelete(brewId)}
                            title="Löschen"
                        >
                            <span role="img" aria-label="Löschen" style={{ fontSize: 22, verticalAlign: 'middle',  display: 'inline-block', position: 'relative', top: '3px' }}>🗑️</span>

                        </button>
                        <button
                            className="cancel-btn"
                            onClick={() => this.handleShowDetails(brewId)}
                            title="Details"
                        >
                            <span role="img" aria-label="Details" style={{ fontSize: 22, verticalAlign: 'middle',  display: 'inline-block', position: 'relative', top: '3px' }}>🔍</span>
                        </button>
                    </div>
                </TableCell>
            </TableRow>
        );
    }

    renderTable(filteredBrews: FinishedBrew[], beers: { id: string; name: string }[]) {
        return (
            <SimpleBar style={{ maxHeight: 600 }}>
                <TableContainer component={Paper} className="FinishedBrewsTable">
                    <Table className="FinishedBrewsTable">
                        <TableHead className="table-header">
                            <TableRow>
                                <TableCell className="table-header-cell">Name</TableCell>
                                <TableCell className="table-header-cell">Start-Datum</TableCell>
                                <TableCell className="table-header-cell">End-Datum</TableCell>
                                <TableCell className="table-header-cell">Liter</TableCell>
                                <TableCell className="table-header-cell">Stammwürze</TableCell>
                                <TableCell className="table-header-cell">Restextrakt</TableCell>
                                <TableCell className="table-header-cell">Alkohol</TableCell>
                                <TableCell className="table-header-cell">Status</TableCell>
                                <TableCell className="table-header-cell">Beschreibung</TableCell>
                                <TableCell className="table-header-cell">Aktion</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.renderNewRow(beers)}
                            {filteredBrews.map(brew => this.renderBrewRow(brew, beers))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </SimpleBar>
        );
    }

    render() {
        const { brews, beers } = this.props;
        const { filterYear, showOnlyActive, filterOutActive, panelBrewId } = this.state;
        const years = this.getYearsFromBrews();
        const filteredBrews = this.filterBrewsByYearAndActive(brews, filterYear, showOnlyActive, filterOutActive);
        const selectedBrew = panelBrewId ? brews.find(b => b.id === panelBrewId) : null;
        return (
            <>
                {this.renderFilterControls(years)}
                {this.renderTable(filteredBrews, beers)}
                {/* Panel als Overlay am Ende */}
                {selectedBrew && (
                    <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 2000, pointerEvents: 'none' }}>
                        <div style={{ pointerEvents: 'auto' }}>
                            <Panel title={selectedBrew.name || 'Details'} onClose={() => this.setState({ panelBrewId: null })}>
                                <FinishedBrewDetails brew={selectedBrew} />
                            </Panel>
                        </div>
                    </div>
                )}
            </>
        );
    }
}

const mapStateToProps = (state: any) => ({
    brews: state.beerDataReducer.finishedBrews || finishedBrewsTestData,
    beers: state.beerDataReducer.beers
});

const mapDispatchToProps = (dispatch: any) => ({
    onSave: (brew: FinishedBrew) => {
        dispatch(BeerActions.updateActiveBeer(brew));
    },
    exportPdf: (brews: FinishedBrew[]) => {
        dispatch(BeerActions.generateFinishedBrewsPdf(brews));
    },
    getFinishedBrews: (isFetching: boolean) => {
        dispatch(BeerActions.getFinishedBeers(isFetching));
    },
    onDelete: (id: string) => {
        dispatch(BeerActions.deleteFinishedBeer(id));
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(FinishedBrewsTable);
