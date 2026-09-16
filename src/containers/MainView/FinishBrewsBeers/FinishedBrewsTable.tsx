import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SimpleBar from 'simplebar-react';
import './FinishedBrewsTable.css';
import {FinishedBrew, FinishedBrewCreatePayload} from "../../../model/FinishedBrew";
import {isNil} from "lodash";
import { eBrewState, BrewStateGerman, brewStateLabel } from '../../../enums/eBrewState';
import Panel from '../../Panel/Panel';
import FinishedBrewDetails from './FinishedBrewDetails';
import {createFinishedBrewId} from '../../../utils/finishedBrewCreateId';
import ModalDialog, {DialogType} from '../../../components/ModalDialog/ModalDialog';


interface FinishedBrewsTableProps {
    brews: FinishedBrew[];
    onSave: (brew: FinishedBrew) => void;
    onCreate: (brew: FinishedBrewCreatePayload) => void;
    exportPdf: (brews: FinishedBrew[]) => void;
    getFinishedBrews: (isFetching: boolean) => void;
    beers: { id: string; name: string }[]; // id als string (UUID)
    onDelete: (id: string) => void;
    savingFinishedBrewIds: string[];
    finishedBrewUpdateErrors: Record<string, string>;
    isAddingFinishedBrew: boolean;
    addFinishedBrewError?: string;
    deletingFinishedBrewIds: string[];
    openMeasurements: (id: string) => void;
}

interface FinishedBrewsTableState {
    filterYear: string;
    showOnlyActive: boolean;
    filterOutActive: boolean;
    newRowActive?: boolean;
    newRowData?: Partial<FinishedBrew>;
    panelBrewId?: string | null;
    newRowSubmitting: boolean;
    brewPendingDelete?: FinishedBrew;
}

const calcAlcohol = (w1: number | null | undefined, w2: number | null | undefined) => {
    if (isNil(w2)) return '-';
    if (isNil(w1) || isNaN(w1) || isNaN(w2)) return '-';
    return (((w1 - w2) * 0.5).toFixed(2) + ' %');
};

const formatDate = (value?: Date | string) => {
    if (!value) return '–';
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? '–' : value.toLocaleDateString('de-DE');
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) return `${dateOnly[3]}.${dateOnly[2]}.${dateOnly[1]}`;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '–' : parsed.toLocaleDateString('de-DE');
};

const formatValue = (value: number | null | undefined, unit: string) =>
    isNil(value) || !Number.isFinite(value) ? '–' : `${value} ${unit}`;

export class FinishedBrewsTable extends React.Component<FinishedBrewsTableProps, FinishedBrewsTableState> {
    constructor(props: FinishedBrewsTableProps) {
        super(props);
        this.state = {filterYear: '', showOnlyActive: false, filterOutActive: false, panelBrewId: null, newRowSubmitting: false};
    }

    componentDidMount() {
        const { getFinishedBrews } = this.props;
        getFinishedBrews(true);
    }

    componentDidUpdate(prevProps: FinishedBrewsTableProps) {
        if (this.state.brewPendingDelete && prevProps.brews.some(brew => brew.id === this.state.brewPendingDelete?.id) && !this.props.brews.some(brew => brew.id === this.state.brewPendingDelete?.id)) {
            this.setState({brewPendingDelete: undefined});
        }
        if (prevProps.isAddingFinishedBrew && !this.props.isAddingFinishedBrew) {
            this.setState(this.props.addFinishedBrewError
                ? {newRowSubmitting: false}
                : {newRowActive: false, newRowData: {}, newRowSubmitting: false});
        }
    }

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

    handleDelete = (id: string) => {
        if (this.props.deletingFinishedBrewIds.includes(id)) return;
        this.setState({brewPendingDelete: this.props.brews.find(brew => brew.id === id)});
    };

    confirmDelete = () => {
        const brew = this.state.brewPendingDelete;
        if (!brew || this.props.deletingFinishedBrewIds.includes(brew.id)) return;
        this.props.onDelete(brew.id);
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
                    aria-label="PDF exportieren"
                >
                    <PictureAsPdfIcon sx={{fontSize: 22, marginRight: '4px'}} />
                    PDF exportieren
                </button>
                <button
                    className="finish-btn"
                    style={{ marginLeft: '2rem', height: '2.2rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => this.setState({ newRowActive: true, newRowData: {id: createFinishedBrewId()} })}
                    title="Neuen Eintrag hinzufügen"
                    aria-label="Neuen Eintrag hinzufügen"
                >
                    <AddIcon sx={{fontSize: 22, marginRight: '4px'}} />
                    Neuer Eintrag
                </button>
            </div>
        );
    }

    renderNewBrewForm(beers: { id: string; name: string }[]) {
        const {newRowActive, newRowData, newRowSubmitting} = this.state;
        if (!newRowActive) return null;
        const updateNewRow = (changes: Partial<FinishedBrew>) => this.setState(prev => ({newRowData: {...prev.newRowData, ...changes}}));
        return (
            <section className="finished-brews-create-form" aria-label="Neuen Eintrag anlegen">
                <label>Name
                    <select value={newRowData?.name || ''} onChange={event => {
                        const selectedBeer = beers.find(beer => beer.name === event.target.value);
                        updateNewRow({name: selectedBeer?.name || '', beer_id: selectedBeer?.id});
                    }} className="table-edit-field">
                        <option value="">Bier wählen</option>
                        {beers.map(beer => <option key={beer.id} value={beer.name}>{beer.name}</option>)}
                    </select>
                </label>
                <label>Startdatum
                    <input type="date" value={newRowData?.startDate ? (newRowData.startDate instanceof Date ? newRowData.startDate.toISOString().slice(0, 10) : newRowData.startDate) : ''} onChange={event => updateNewRow({startDate: event.target.value})} className="table-edit-field" />
                </label>
                <label>Enddatum
                    <input type="date" value={newRowData?.endDate ? (newRowData.endDate instanceof Date ? newRowData.endDate.toISOString().slice(0, 10) : newRowData.endDate) : ''} onChange={event => updateNewRow({endDate: event.target.value})} className="table-edit-field" />
                </label>
                <label>Volumen (l)
                    <input type="number" value={newRowData?.liters ?? ''} onChange={event => updateNewRow({liters: Number(event.target.value)})} className="table-edit-field" />
                </label>
                <label>Stammwürze (°P)
                    <input type="number" value={newRowData?.originalwort ?? ''} onChange={event => updateNewRow({originalwort: Number(event.target.value)})} className="table-edit-field" />
                </label>
                <label>Restextrakt (°P)
                    <input type="number" value={newRowData?.residual_extract ?? ''} onChange={event => updateNewRow({residual_extract: Number(event.target.value)})} className="table-edit-field" />
                </label>
                <label>Administrativer Status
                    <select value={newRowData?.state || eBrewState.FERMENTATION} onChange={event => updateNewRow({state: event.target.value as eBrewState})} className="table-edit-field">
                        {Object.values(eBrewState).map(state => <option key={state} value={state}>{BrewStateGerman[state]}</option>)}
                    </select>
                </label>
                <label className="finished-brews-create-description">Beschreibung
                    <input type="text" value={newRowData?.note || ''} onChange={event => updateNewRow({note: event.target.value})} className="table-edit-field" />
                </label>
                <div className="finished-brews-create-actions">
                    <button className="finish-btn" onClick={() => {
                        if (newRowSubmitting || this.props.isAddingFinishedBrew) return;
                        const newBrew = {...newRowData, beer_id: newRowData?.beer_id, state: newRowData?.state || eBrewState.FERMENTATION, note: newRowData?.note || '', active: true} as FinishedBrewCreatePayload;
                        this.setState({newRowSubmitting: true}, () => this.props.onCreate(newBrew));
                    }} disabled={newRowSubmitting || this.props.isAddingFinishedBrew} title="Speichern" aria-label="Speichern">
                        <SaveIcon sx={{fontSize: 22}} />
                    </button>
                    <button className="cancel-btn" onClick={() => this.setState({newRowActive: false, newRowData: {}})} disabled={newRowSubmitting || this.props.isAddingFinishedBrew} title="Abbrechen" aria-label="Abbrechen">
                        <CloseIcon sx={{fontSize: 22}} />
                    </button>
                    {this.props.addFinishedBrewError && <p role="alert">Speichern fehlgeschlagen: {this.props.addFinishedBrewError}</p>}
                </div>
            </section>
        );
    }

    renderBrewRow(brew: FinishedBrew, _beers: { id: string; name: string }[]) {
        const brewId = brew.id;
        const isActive = brew.active;
        return (
            <TableRow key={brewId} className={`table-row${isActive ? ' active-row' : ''}`}>
                <TableCell className="table-cell brew-name-cell">
                    {isActive && <span className="active-brew-dot" title="Aktives Bier" aria-label="Aktives Bier" />}
                    <span>{brew.name || '–'}</span>
                </TableCell>
                <TableCell className="table-cell brew-period">{formatDate(brew.startDate)} <span aria-hidden="true">–</span> {formatDate(brew.endDate)}</TableCell>
                <TableCell className="table-cell">{formatValue(brew.liters, 'l')}</TableCell>
                <TableCell className="table-cell">{formatValue(brew.originalwort, '°P')}</TableCell>
                <TableCell className="table-cell alcohol">{calcAlcohol(brew.originalwort, brew.residual_extract)}</TableCell>
                <TableCell className="table-cell">
                    <span className={`brew-status-badge${isActive ? ' is-active' : ''}`}>{brewStateLabel(brew.state)}</span>
                </TableCell>
                <TableCell className="table-cell beschreibung">{brew.note || '–'}</TableCell>
                <TableCell className="table-cell actions-cell">
                    <div className="finished-brews-row-actions">
                        <button className="cancel-btn" onClick={() => this.handleDelete(brewId)} title="Löschen" aria-label="Löschen"><DeleteOutlineIcon sx={{fontSize: 22}} /></button>
                        <button className="cancel-btn" onClick={() => this.handleShowDetails(brewId)} title="Details" aria-label="Details"><VisibilityIcon sx={{fontSize: 22}} /></button>
                        <button className="cancel-btn" onClick={() => this.props.openMeasurements(brewId)} title="Messdaten" aria-label={`Messdaten für ${brew.name}`}><ShowChartIcon sx={{fontSize: 22}} /></button>
                    </div>
                </TableCell>
            </TableRow>
        );
    }

    renderTable(filteredBrews: FinishedBrew[], beers: { id: string; name: string }[]) {
        return (
            <SimpleBar className="finished-brews-table-scroll">
                <TableContainer component={Paper} className="finished-brews-table-container">
                    <Table className="FinishedBrewsTable">
                        <TableHead className="table-header">
                            <TableRow>
                                <TableCell className="table-header-cell">Name</TableCell>
                                <TableCell className="table-header-cell">Zeitraum</TableCell>
                                <TableCell className="table-header-cell">Volumen</TableCell>
                                <TableCell className="table-header-cell">Stammwürze</TableCell>
                                <TableCell className="table-header-cell">Alkohol</TableCell>
                                <TableCell className="table-header-cell">Status</TableCell>
                                <TableCell className="table-header-cell">Beschreibung</TableCell>
                                <TableCell className="table-header-cell">Aktionen</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>{filteredBrews.map(brew => this.renderBrewRow(brew, beers))}</TableBody>
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
            <ModalDialog type={DialogType.CONFIRM} open={Boolean(this.state.brewPendingDelete)} header="Sud löschen" content={`Soll ${this.state.brewPendingDelete?.name ?? 'dieser Sud'} endgültig gelöscht werden?`} onConfirm={this.confirmDelete} onCancel={() => this.setState({brewPendingDelete: undefined})} showCancelButton={true} actionsDisabled={Boolean(this.state.brewPendingDelete && this.props.deletingFinishedBrewIds.includes(this.state.brewPendingDelete.id))} />
            <main className="finished-brews-page">
                {this.renderFilterControls(years)}
                {this.renderNewBrewForm(beers)}
                <div className="finished-brews-table-area">{this.renderTable(filteredBrews, beers)}</div>
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
            </main>
            </>
        );
    }
}
