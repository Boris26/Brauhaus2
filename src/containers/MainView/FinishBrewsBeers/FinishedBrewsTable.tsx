import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import '../BeerRecipes/Table.css';

export interface FinishedBrew {
    id: number;
    name: string;
    date: string;
    liters: number;
    wort1: number;
    wort2: number;
    description: string;
}

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
                    [field]: field === 'liters' || field === 'wort1' || field === 'wort2' ? Number(value) : value
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
            <TableContainer component={Paper} className="Table">
                <Table className="Table">
                    <TableHead className="table-header">
                        <TableRow>
                            <TableCell className="table-header-cell">Name</TableCell>
                            <TableCell className="table-header-cell">Datum</TableCell>
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
                            return (
                                <TableRow key={brew.id} className="table-row">
                                    <TableCell className="table-cell">{brew.name}</TableCell>
                                    <TableCell className="table-cell">{brew.date}</TableCell>
                                    <TableCell className="table-cell">
                                        <TextField
                                            variant="standard"
                                            value={row.liters}
                                            type="number"
                                            onChange={e => this.handleChange(brew.id, 'liters', e.target.value)}
                                            className="table-edit-field"
                                            InputProps={{ disableUnderline: true }}
                                        />
                                    </TableCell>
                                    <TableCell className="table-cell">
                                        <TextField
                                            variant="standard"
                                            value={row.wort1}
                                            type="number"
                                            onChange={e => this.handleChange(brew.id, 'wort1', e.target.value)}
                                            className="table-edit-field"
                                            InputProps={{ disableUnderline: true }}
                                        />
                                    </TableCell>
                                    <TableCell className="table-cell">
                                        <TextField
                                            variant="standard"
                                            value={row.wort2}
                                            type="number"
                                            onChange={e => this.handleChange(brew.id, 'wort2', e.target.value)}
                                            className="table-edit-field"
                                            InputProps={{ disableUnderline: true }}
                                        />
                                    </TableCell>
                                    <TableCell className="table-cell">{calcAlcohol(row.wort1, row.wort2)}</TableCell>
                                    <TableCell className="table-cell">
                                        <TextField
                                            variant="standard"
                                            value={row.description}
                                            onChange={e => this.handleChange(brew.id, 'description', e.target.value)}
                                            className="table-edit-field"
                                            InputProps={{ disableUnderline: true }}
                                        />
                                    </TableCell>
                                    <TableCell className="table-cell">
                                        {isEdited && (
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
        );
    }
}
