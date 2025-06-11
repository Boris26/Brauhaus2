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


interface FinishedBrewsTableProps {
    brews: FinishedBrew[];
    onSave: (brew: FinishedBrew) => void;
    exportPdf: (brews: FinishedBrew[]) => void;
}

interface FinishedBrewsTableState {
    editRows: { [id: number]: Partial<FinishedBrew> };
    filterYear: string;
    showOnlyActive: boolean;
    filterOutActive: boolean;
    clickedFinishBtn: { [id: number]: boolean };
}

const calcAlcohol = (w1: number, w2: number | null) => {
    if (isNil(w2)) return '-';
    if (isNaN(w1) || isNaN(w2)) return '-';
    return (((w1 - w2) * 0.5).toFixed(2) + ' %');
};

class FinishedBrewsTable extends React.Component<FinishedBrewsTableProps, FinishedBrewsTableState> {
    constructor(props: FinishedBrewsTableProps) {
        super(props);
        this.state = { editRows: {}, filterYear: '', showOnlyActive: false, filterOutActive: false, clickedFinishBtn: {} };
    }

    handleChange = (id: number, field: keyof FinishedBrew, value: string) => {
        let parsedValue: any = value;
        if (field === 'liters' || field === 'originalwort') {
            parsedValue = value === '' ? '' : Math.max(0, Number(value));
        } else if (field === 'residualExtract') {
            parsedValue = value === '' ? null : Math.max(0, Number(value));
        }
        this.setState(prevState => ({
            editRows: {
                ...prevState.editRows,
                [id]: {
                    ...prevState.editRows[id],
                    [field]:
                        field === 'liters' || field === 'originalwort' || field === 'residualExtract'
                            ? parsedValue
                            : value
                }
            }
        }));
    };

    handleSave = (id: number) => {
        const brew = this.props.brews.find(b => b.id === id);
        if (!brew) return;
        const updated = { ...brew, ...this.state.editRows[id] };
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
        this.props.brews.forEach(brew => {
            let dateStr = '';
            if (brew.startDate instanceof Date) {
                dateStr = brew.startDate.getFullYear().toString();
            } else if (brew.startDate.length >= 4) {
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
        console.log("Handling finish click for brew:", brew);
        this.setState(prev => ({
            clickedFinishBtn: { ...prev.clickedFinishBtn, [brew.id]: true }
        }), () => {
            setTimeout(() => {
                this.setState(prev => ({
                    clickedFinishBtn: { ...prev.clickedFinishBtn, [brew.id]: false }
                }));
                const updated = { ...brew, aktiv: false };
                this.props.onSave(updated);
            }, 150);
        });
    };


    private filterBrewsByYearAndActive(aBrews: FinishedBrew[], aFilterYear: string, aShowOnlyActive: boolean, aFilterOutActive: boolean) {
        return  aBrews.filter(brew => {
            let year = '';
            if (brew.startDate instanceof Date) {
                year = brew.startDate.getFullYear().toString();
            } else if (brew.startDate.length >= 4) {
                year = brew.startDate.slice(0, 4);
            }
            const yearMatch = aFilterYear ? year === aFilterYear : true;
            const activeMatch = aShowOnlyActive ? brew.aktiv : true;
            const outActiveMatch = aFilterOutActive ? !brew.aktiv : true;
            return yearMatch && activeMatch && outActiveMatch;
        });
    }




    render() {
        const { brews } = this.props;
        const { editRows, filterYear, showOnlyActive, filterOutActive } = this.state;
        const years = this.getYearsFromBrews();

        // Filter brews nach Jahr und Aktiv-Status
        const filteredBrews = this.filterBrewsByYearAndActive(brews, filterYear, showOnlyActive, filterOutActive);

        return (
            <>
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
                            disabled={this.state.filterOutActive}
                        />
                        <span>Nur aktive anzeigen</span>
                    </label>
                    <label className="active-filter-label">
                        <input
                            type="checkbox"
                            checked={this.state.filterOutActive}
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
                </div>
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
                                    <TableCell className="table-header-cell">Beschreibung</TableCell>
                                    <TableCell className="table-header-cell">Aktion</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredBrews.map(brew => {
                                    const isEdited = !!editRows[brew.id];
                                    const row = { ...brew, ...editRows[brew.id] };
                                    const isActive = brew.aktiv;
                                    return (
                                        <TableRow key={brew.id} className={`table-row${isActive ? ' active-row' : ''}`}>
                                            <TableCell className="table-cell">{brew.name}</TableCell>
                                            <TableCell className="table-cell">
                                                <TextField
                                                    variant="standard"
                                                    value={row.startDate instanceof Date ? row.startDate.toISOString().slice(0, 10) : row.startDate}
                                                    type="date"
                                                    onChange={e => {
                                                        const target = e.target as HTMLInputElement;
                                                        this.handleChange(brew.id, 'startDate', target.value);
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
                                                        this.handleChange(brew.id, 'endDate', target.value);
                                                    }}
                                                    className="table-edit-field"
                                                    InputProps={{ style: { color: 'white' }, disableUnderline: true, readOnly: !isActive }}
                                                />
                                            </TableCell>
                                            <TableCell className="table-cell liters">{/* Liter */}
                                              <TextField
                                                  variant="standard"
                                                  value={row.liters}
                                                  type="number"
                                                  onChange={e => this.handleChange(brew.id, 'liters', e.target.value)}
                                                  className="table-edit-field"
                                                  InputProps={{
                                                      style: { color: 'white' },
                                                      disableUnderline: true,
                                                      readOnly: !isActive,
                                                      inputProps: {
                                                          readOnly: !isActive,
                                                          ...(isActive ? {} : { inputMode: 'none', style: { MozAppearance: 'textfield' } })
                                                      },
                                                      ...(isActive ? {} : { sx: { '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } } })
                                                  }}
                                              />
                                            </TableCell>
                                            <TableCell className="table-cell originalwort">{/* Stammwürze */}
                                              <TextField
                                                  variant="standard"
                                                  value={row.originalwort}
                                                  type="number"
                                                  onChange={e => this.handleChange(brew.id, 'originalwort', e.target.value)}
                                                  className="table-edit-field"
                                                  InputProps={{
                                                      style: { color: 'white' },
                                                      disableUnderline: true,
                                                      readOnly: !isActive,
                                                      inputProps: {
                                                          readOnly: !isActive,
                                                          step: 0.1,
                                                          ...(isActive ? {} : { inputMode: 'none', style: { MozAppearance: 'textfield' } })
                                                      },
                                                      ...(isActive ? {} : { sx: { '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } } })
                                                  }}
                                                  onWheel={isActive ? (e => {
                                                    e.preventDefault();
                                                    const input = e.target as HTMLInputElement;
                                                    let value = parseFloat(input.value) || 0;
                                                    if (e.deltaY < 0) value += 0.1;
                                                    else value -= 0.1;
                                                    value = Math.round(value * 100) / 100;
                                                    this.handleChange(brew.id, 'originalwort', value.toString());
                                                  }) : undefined}
                                              />
                                            </TableCell>
                                            <TableCell className="table-cell residualExtract">{/* Restextrakt */}
                                              {isActive ? (
                                                  <TextField
                                                      variant="standard"
                                                      value={row.residualExtract === undefined || row.residualExtract === null ? '' : row.residualExtract}
                                                      type="number"
                                                      onChange={e => this.handleChange(brew.id, 'residualExtract', e.target.value)}
                                                      className="table-edit-field"
                                                      InputProps={{
                                                          style: { color: 'white' },
                                                          disableUnderline: true,
                                                          readOnly: !isActive,
                                                          inputProps: {
                                                              readOnly: !isActive,
                                                              step: 0.1,
                                                              ...(isActive ? {} : { inputMode: 'none', style: { MozAppearance: 'textfield' } })
                                                          },
                                                          ...(isActive ? {} : { sx: { '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } } })
                                                      }}
                                                      onWheel={e => {
                                                        e.preventDefault();
                                                        const input = e.target as HTMLInputElement;
                                                        let value = parseFloat(input.value) || 0;
                                                        if (e.deltaY < 0) value += 0.1;
                                                        else value -= 0.1;
                                                        value = Math.round(value * 100) / 100;
                                                        this.handleChange(brew.id, 'residualExtract', value.toString());
                                                      }}
                                                  />
                                              ) : (
                                                  row.residualExtract === undefined || row.residualExtract === null ? '-' : row.residualExtract
                                              )}
                                            </TableCell>
                                            <TableCell className="table-cell">{calcAlcohol(row.originalwort, row.residualExtract)}</TableCell>
                                            <TableCell className="table-cell beschreibung">
                                                <TextField
                                                    variant="standard"
                                                    value={row.description}
                                                    onChange={e => this.handleChange(brew.id, 'description', e.target.value)}
                                                    className="table-edit-field"
                                                    InputProps={{ style: { color: 'white' }, disableUnderline: true, readOnly: !isActive }}
                                                />
                                            </TableCell>
                                            <TableCell className="table-cell">
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {isEdited && isActive && (
                                                        <button
                                                            className="finish-btn"
                                                            onClick={() => this.handleSave(brew.id)}
                                                            title="Speichern"
                                                        >
                                                            <span role="img" aria-label="Speichern" style={{ fontSize: 22, verticalAlign: 'middle', marginRight: 4 }}>💾</span>
                                                            Speichern
                                                        </button>
                                                    )}
                                                    {isActive && (
                                                        <button
                                                            className={`finish-btn${this.state.clickedFinishBtn[brew.id] ? ' clicked' : ''}`}
                                                            title="Endgültig fertigstellen"
                                                            onClick={() => this.handleFinishClick(brew)}
                                                            disabled={row.residualExtract === null || row.residualExtract === undefined}
                                                        >
                                                            <span role="img" aria-label="Fertig" style={{ fontSize: 22, verticalAlign: 'middle', marginRight: 4 }}>✅</span>
                                                            Fertig
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </SimpleBar>
            </>
        );
    }
}

const mapStateToProps = () => ({
    brews: finishedBrewsTestData  as FinishedBrew[],
});

const mapDispatchToProps = (dispatch: any) => ({
    onSave: (brew: FinishedBrew) => {
        dispatch(BeerActions.updateActiveBeer(brew));
    },
    exportPdf: (brews: FinishedBrew[]) => {
        dispatch(BeerActions.exportFinishedBrewsToPdf(brews));
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(FinishedBrewsTable);
