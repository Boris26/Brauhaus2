import React from 'react';
import {
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SimpleBar from "simplebar-react";

import { Malts } from '../../model/Malt';
import { Hops } from '../../model/Hops';
import { Yeasts } from '../../model/Yeasts';

import './IngredientsFormPage.css';

import { AdditionalIngredient } from "../../model/AdditionalIngredient";
import EditIcon from "@mui/icons-material/Edit";
import {AppAccordion, AppAccordionHeader} from "../../components/AppAccordion/AppAccordion";
import {IngredientEditDialog, IngredientEditValue, IngredientKind} from "./IngredientEditDialog";


export class IngredientsFormPage extends React.Component<any, any> {

    simpleBarRef: any = null;

    constructor(props: any) {
        super(props);

        this.state = {
            newMalt: {},
            newHop: {},
            newYeast: {},
            showNewMaltRow: false,
            showNewHopRow: false,
            showNewYeastRow: false,
            newAdditionalIngredient: { name: "", description: "" },
            showNewAdditionalIngredientRow: false,
            additionalIngredientError: "",
            expandedAccordion: "malz",
            editingKind: null,
            editingValue: null
        };
    }

    componentDidMount() {
        this.props.getMalt(true);
        this.props.getHop(true);
        this.props.getYeast(true);
        this.props.getAdditionalIngredients(true);
    }

    componentDidUpdate(aPrevProps: any) {
        const kind = this.state.editingKind as IngredientKind | null;
        if (kind && aPrevProps.updateStates[kind].isUpdating && !this.props.updateStates[kind].isUpdating && !this.props.updateStates[kind].error) {
            this.setState({editingKind: null, editingValue: null});
        }
        if (this.simpleBarRef && this.simpleBarRef.recalculate) {
            this.simpleBarRef.recalculate();
        }
    }

    handleAccordionChange = (aAccordionKey: string) => (_aEvent: React.SyntheticEvent, aIsExpanded: boolean) => {
        // Es bleibt immer genau ein Bereich geöffnet.
        if (aIsExpanded) {
            this.setState({ expandedAccordion: aAccordionKey });
        }
    };

    renderIngredientAccordion = (aAccordionKey: string, aTitle: string, aContent: React.ReactNode) => {
        const { expandedAccordion } = this.state;

        return (
            <AppAccordion
                expanded={expandedAccordion === aAccordionKey}
                onChange={this.handleAccordionChange(aAccordionKey)}
                className="ingredients-accordion"
                summary={<AppAccordionHeader title={aTitle} />}
                detailsProps={{className: 'ingredients-accordion-details'}}
            >
                {aContent}
            </AppAccordion>
        );
    };

    handleAddMalt = () => {
        const { newMalt } = this.state;
        if (newMalt.name) {
            this.props.submitNewMalt(newMalt);
            this.setState({ newMalt: {}, showNewMaltRow: false });
        }
    };

    handleAddHop = () => {
        const { newHop } = this.state;
        if (newHop.name) {
            const hop = {
                id: 0,
                name: newHop.name,
                type: newHop.type,
                alpha: Number(newHop.alpha),
                description: newHop.description
            };
            this.props.submitNewHop(hop);
            this.setState({ newHop: {}, showNewHopRow: false });
        }
    };

    handleAddYeast = () => {
        const { newYeast } = this.state;
        if (newYeast.name) {
            const yeast = {
                id: 0,
                name: newYeast.name,
                type: newYeast.type,
                temperature: Number(newYeast.temperature),
                evg: Number(newYeast.evg),
                description: newYeast.description
            };
            this.props.submitNewYeast(yeast);
            this.setState({ newYeast: {}, showNewYeastRow: false });
        }
    };

    handleAddAdditionalIngredient = () => {
        const { newAdditionalIngredient } = this.state;
        const aTrimmedName = (newAdditionalIngredient.name || "").trim();

        if (!aTrimmedName) {
            // Name darf nicht leer sein, damit kein ungültiger API-Request gesendet wird.
            this.setState({ additionalIngredientError: "Name ist erforderlich." });
            return;
        }

        this.props.submitNewAdditionalIngredient({
            name: aTrimmedName,
            description: newAdditionalIngredient.description || ""
        });

        this.setState({
            newAdditionalIngredient: { name: "", description: "" },
            showNewAdditionalIngredientRow: false,
            additionalIngredientError: ""
        });
    };


    handleOpenEdit = (kind: IngredientKind, value: IngredientEditValue) => {
        this.props.resetIngredientUpdate(kind);
        this.setState({editingKind: kind, editingValue: value});
    };

    handleSaveEdit = (value: IngredientEditValue) => {
        this.props.updateIngredient(this.state.editingKind, value.id, value);
    };

    handleCancelEdit = () => {
        if (!this.props.updateStates[this.state.editingKind]?.isUpdating) this.setState({editingKind: null, editingValue: null});
    };

    handleDeleteMalt = (aMalt: Malts) => {
        this.props.deleteMaltById(String(aMalt.id));
    };

    handleDeleteHop = (aHop: Hops) => {
        this.props.deleteHopById(String(aHop.id));
    };

    handleDeleteYeast = (aYeast: Yeasts) => {
        this.props.deleteYeastById(String(aYeast.id));
    };

    handleDeleteAdditionalIngredient = (aIngredient: AdditionalIngredient) => {
        this.props.deleteAdditionalIngredientById(String(aIngredient.id));
    };

    renderMaltContent = () => {
        const { malts } = this.props;
        const { newMalt, showNewMaltRow } = this.state;

        return (
            <>
                <div className="filter-container">
                    <button className="finish-btn" onClick={() => this.setState({ showNewMaltRow: true })} title="Malz hinzufügen" aria-label="Malz hinzufügen"><AddIcon fontSize="small" /></button>
                </div>
                <TableContainer className="FinishedBrewsTable" sx={{ maxHeight: 400 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Beschreibung</TableCell>
                                <TableCell>EBC</TableCell>
                                <TableCell className="action-cell">Aktion</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {showNewMaltRow && (
                                <TableRow>
                                    <TableCell><input className="table-edit-field" value={newMalt.name || ""} onChange={e => this.setState({ newMalt: { ...newMalt, name: e.target.value } })} /></TableCell>
                                    <TableCell><input className="table-edit-field" value={newMalt.description || ""} onChange={e => this.setState({ newMalt: { ...newMalt, description: e.target.value } })} /></TableCell>
                                    <TableCell><input type="number" className="table-edit-field" value={newMalt.ebc || ""} onChange={e => this.setState({ newMalt: { ...newMalt, ebc: Number(e.target.value) } })} /></TableCell>
                                    <TableCell className="action-cell">
                                        <div className="action-buttons">
                                            <button className="finish-btn" onClick={this.handleAddMalt} title="Speichern" aria-label="Speichern"><SaveIcon fontSize="small" /></button>
                                            <button className="cancel-btn" onClick={() => this.setState({ showNewMaltRow: false })} title="Abbrechen" aria-label="Abbrechen"><CloseIcon fontSize="small" /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {malts.map((m: any) => (
                                <TableRow key={m.id}>
                                    <TableCell>{m.name}</TableCell>
                                    <TableCell>{m.description}</TableCell>
                                    <TableCell>{m.ebc}</TableCell>
                                    <TableCell className="action-cell"><div className="action-buttons"><button className="edit-btn" aria-label={m.name + " bearbeiten"} onClick={() => this.handleOpenEdit("malt", m)}><EditIcon fontSize="small" /></button><button className="cancel-btn" onClick={() => this.handleDeleteMalt(m)} title="Malz löschen" aria-label={m.name + " löschen"}><DeleteOutlineIcon fontSize="small" /></button></div></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    renderHopContent = () => {
        const { hops } = this.props;
        const { newHop, showNewHopRow } = this.state;

        return (
            <>
                <div className="filter-container">
                    <button className="finish-btn" onClick={() => this.setState({ showNewHopRow: true })} title="Hopfen hinzufügen" aria-label="Hopfen hinzufügen"><AddIcon fontSize="small" /></button>
                </div>
                <TableContainer className="FinishedBrewsTable" sx={{ maxHeight: 400 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Alpha</TableCell>
                                <TableCell>Typ</TableCell>
                                <TableCell>Beschreibung</TableCell>
                                <TableCell className="action-cell">Aktion</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {showNewHopRow && (
                                <TableRow>
                                    <TableCell><input className="table-edit-field" value={newHop.name || ""} onChange={e => this.setState({ newHop: { ...newHop, name: e.target.value } })} /></TableCell>
                                    <TableCell><input className="table-edit-field" value={newHop.alpha || ""} onChange={e => this.setState({ newHop: { ...newHop, alpha: e.target.value } })} /></TableCell>
                                    <TableCell><input className="table-edit-field" value={newHop.type || ""} onChange={e => this.setState({ newHop: { ...newHop, type: e.target.value } })} /></TableCell>
                                    <TableCell><input className="table-edit-field" value={newHop.description || ""} onChange={e => this.setState({ newHop: { ...newHop, description: e.target.value } })} /></TableCell>
                                    <TableCell className="action-cell">
                                        <div className="action-buttons">
                                            <button className="finish-btn" onClick={this.handleAddHop} title="Speichern" aria-label="Speichern"><SaveIcon fontSize="small" /></button>
                                            <button className="cancel-btn" onClick={() => this.setState({ showNewHopRow: false })} title="Abbrechen" aria-label="Abbrechen"><CloseIcon fontSize="small" /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {hops.map((h: any) => (
                                <TableRow key={h.id}>
                                    <TableCell>{h.name}</TableCell>
                                    <TableCell>{h.alpha}</TableCell>
                                    <TableCell>{h.type}</TableCell>
                                    <TableCell>{h.description}</TableCell>
                                    <TableCell className="action-cell"><div className="action-buttons"><button className="edit-btn" aria-label={h.name + " bearbeiten"} onClick={() => this.handleOpenEdit("hop", h)}><EditIcon fontSize="small" /></button><button className="cancel-btn" onClick={() => this.handleDeleteHop(h)} title="Hopfen löschen" aria-label={h.name + " löschen"}><DeleteOutlineIcon fontSize="small" /></button></div></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    renderYeastContent = () => {
        const { yeasts } = this.props;
        const { newYeast, showNewYeastRow } = this.state;

        return (
            <>
                <div className="filter-container">
                    <button className="finish-btn" onClick={() => this.setState({ showNewYeastRow: true })} title="Hefe hinzufügen" aria-label="Hefe hinzufügen"><AddIcon fontSize="small" /></button>
                </div>
                <TableContainer className="FinishedBrewsTable" sx={{ maxHeight: 400 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Typ</TableCell>
                                <TableCell>Temperatur</TableCell>
                                <TableCell>EVG</TableCell>
                                <TableCell className="action-cell">Aktion</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {showNewYeastRow && (
                                <TableRow>
                                    <TableCell><input className="table-edit-field" value={newYeast.name || ""} onChange={e => this.setState({ newYeast: { ...newYeast, name: e.target.value } })} /></TableCell>
                                    <TableCell><input className="table-edit-field" value={newYeast.type || ""} onChange={e => this.setState({ newYeast: { ...newYeast, type: e.target.value } })} /></TableCell>
                                    <TableCell><input className="table-edit-field" value={newYeast.temperature || ""} onChange={e => this.setState({ newYeast: { ...newYeast, temperature: e.target.value } })} /></TableCell>
                                    <TableCell><input className="table-edit-field" value={newYeast.evg || ""} onChange={e => this.setState({ newYeast: { ...newYeast, evg: e.target.value } })} /></TableCell>
                                    <TableCell className="action-cell">
                                        <div className="action-buttons">
                                            <button className="finish-btn" onClick={this.handleAddYeast} title="Speichern" aria-label="Speichern"><SaveIcon fontSize="small" /></button>
                                            <button className="cancel-btn" onClick={() => this.setState({ showNewYeastRow: false })} title="Abbrechen" aria-label="Abbrechen"><CloseIcon fontSize="small" /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {yeasts.map((y: any) => (
                                <TableRow key={y.id}>
                                    <TableCell>{y.name}</TableCell>
                                    <TableCell>{y.type}</TableCell>
                                    <TableCell>{y.temperature}</TableCell>
                                    <TableCell>{y.evg}</TableCell>
                                    <TableCell className="action-cell"><div className="action-buttons"><button className="edit-btn" aria-label={y.name + " bearbeiten"} onClick={() => this.handleOpenEdit("yeast", y)}><EditIcon fontSize="small" /></button><button className="cancel-btn" onClick={() => this.handleDeleteYeast(y)} title="Hefe löschen" aria-label={y.name + " löschen"}><DeleteOutlineIcon fontSize="small" /></button></div></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    renderAdditionalIngredientsContent = () => {
        const { additionalIngredients } = this.props;
        const { newAdditionalIngredient, showNewAdditionalIngredientRow, additionalIngredientError } = this.state;

        return (
            <>
                <div className="filter-container">
                    <button className="finish-btn" onClick={() => this.setState({ showNewAdditionalIngredientRow: true, additionalIngredientError: "" })} title="Zutat hinzufügen" aria-label="Zutat hinzufügen"><AddIcon fontSize="small" /></button>
                </div>
                <TableContainer className="FinishedBrewsTable" sx={{ maxHeight: 400 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Beschreibung</TableCell>
                                <TableCell className="action-cell">Aktion</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {showNewAdditionalIngredientRow && (
                                <TableRow>
                                    <TableCell>
                                        <input className="table-edit-field" value={newAdditionalIngredient.name || ""} onChange={e => this.setState({ newAdditionalIngredient: { ...newAdditionalIngredient, name: e.target.value }, additionalIngredientError: "" })} />
                                        {additionalIngredientError && <div className="ingredient-error">{additionalIngredientError}</div>}
                                    </TableCell>
                                    <TableCell><input className="table-edit-field" value={newAdditionalIngredient.description || ""} onChange={e => this.setState({ newAdditionalIngredient: { ...newAdditionalIngredient, description: e.target.value } })} /></TableCell>
                                    <TableCell className="action-cell">
                                        <div className="action-buttons">
                                            <button className="finish-btn" onClick={this.handleAddAdditionalIngredient} title="Speichern" aria-label="Speichern"><SaveIcon fontSize="small" /></button>
                                            <button className="cancel-btn" onClick={() => this.setState({ showNewAdditionalIngredientRow: false, additionalIngredientError: "" })} title="Abbrechen" aria-label="Abbrechen"><CloseIcon fontSize="small" /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {additionalIngredients.map((aIngredient: AdditionalIngredient) => (
                                <TableRow key={aIngredient.id}>
                                    <TableCell>{aIngredient.name}</TableCell>
                                    <TableCell>{aIngredient.description}</TableCell>
                                    <TableCell className="action-cell"><div className="action-buttons"><button className="edit-btn" aria-label={aIngredient.name + " bearbeiten"} onClick={() => this.handleOpenEdit("additional", aIngredient)}><EditIcon fontSize="small" /></button><button className="cancel-btn" onClick={() => this.handleDeleteAdditionalIngredient(aIngredient)} title="Zutat löschen" aria-label={aIngredient.name + " löschen"}><DeleteOutlineIcon fontSize="small" /></button></div></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    render() {
        return (
            <SimpleBar
                className="ingredients-page-scroll"
                ref={(ref) => { this.simpleBarRef = ref }}
                style={{ height: "calc(100vh - 0px)" }}
                autoHide={false}
            >
                <div className='containerIngredientsForm app-accordion-group'>
                    {this.renderIngredientAccordion("malz", "Malz", this.renderMaltContent())}
                    {this.renderIngredientAccordion("hopfen", "Hopfen", this.renderHopContent())}
                    {this.renderIngredientAccordion("hefe", "Hefe", this.renderYeastContent())}
                    {this.renderIngredientAccordion("weitere-zutaten", "Weitere Zutaten", this.renderAdditionalIngredientsContent())}
                </div>
                <IngredientEditDialog
                    kind={this.state.editingKind || "malt"}
                    value={this.state.editingValue}
                    open={Boolean(this.state.editingKind)}
                    loading={this.state.editingKind ? this.props.updateStates[this.state.editingKind].isUpdating : false}
                    backendError={this.state.editingKind ? this.props.updateStates[this.state.editingKind].error : undefined}
                    onCancel={this.handleCancelEdit}
                    onSave={this.handleSaveEdit}
                />
            </SimpleBar>
        );
    }
}

/* ====================== Redux Mapper ====================== */
