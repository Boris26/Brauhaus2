import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import './FinishedBrewsTable.css';
import {FinishedBrew} from "../../../model/FinishedBrew";


interface FinishedBrewsTableProps {
    brews: FinishedBrew[];
    onSave: (brew: FinishedBrew) => void;
}

interface FinishedBrewsTableState {
    editRows: { [id: number]: Partial<FinishedBrew> };
}

const calcAlcohol = (w1: number, w2: number) => {
    if (isNaN(w1) || isNaN(w2)) return '-';
    return (((w1 - w2) * 0.5).toFixed(2) + ' %');
};

export class FinishedBrewsTable extends React.Component<FinishedBrewsTableProps, FinishedBrewsTableState> {
    constructor(props: FinishedBrewsTableProps) {
        super(props);
        this.state = { editRows: {} };
    }

    handleChange = (id: number, field: keyof FinishedBrew, value: string) => {
        this.setState(prevState => ({
            editRows: {
                ...prevState.editRows,
                [id]: {
                    ...prevState.editRows[id],
                    [field]: field === 'liters' || field === 'originalwort' || field === 'residualExtract' ? Number(value) : value
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

    render() {
        const { brews } = this.props;
        const { editRows } = this.state;
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
                                <TableCell className="table-header-cell">Stammwürze 1</TableCell>
                                <TableCell className="table-header-cell">Restextrakt</TableCell>
                                <TableCell className="table-header-cell">Alkohol</TableCell>
                                <TableCell className="table-header-cell">Beschreibung</TableCell>
                                <TableCell className="table-header-cell">Aktion</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {brews.map(brew => {
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
                                                    this.handleChange(brew.id, 'startDate',  target.value);
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
                                        <TableCell className="table-cell">
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
                                        <TableCell className="table-cell">
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
                                                        ...(isActive ? {} : { inputMode: 'none', style: { MozAppearance: 'textfield' } })
                                                    },
                                                    ...(isActive ? {} : { sx: { '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } } })
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="table-cell">
                                            <TextField
                                                variant="standard"
                                                value={row.residualExtract}
                                                type="number"
                                                onChange={e => this.handleChange(brew.id, 'residualExtract', e.target.value)}
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
                                        <TableCell className="table-cell">{calcAlcohol(row.originalwort, row.residualExtract)}</TableCell>
                                        <TableCell className="table-cell">
                                            <TextField
                                                variant="standard"
                                                value={row.description}
                                                onChange={e => this.handleChange(brew.id, 'description', e.target.value)}
                                                className="table-edit-field"
                                                InputProps={{ style: { color: 'white' }, disableUnderline: true, readOnly: !isActive }}
                                            />
                                        </TableCell>
                                        <TableCell className="table-cell">
                                            {isEdited && isActive && (
                                                <button
                                                    className="select-btn"
                                                    onClick={() => this.handleSave(brew.id)}
                                                >
                                                    Speichern
                                                </button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </SimpleBar>
        );
    }
}
