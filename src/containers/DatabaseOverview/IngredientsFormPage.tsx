import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { connect } from 'react-redux';
import SimpleBar from "simplebar-react";

import { Malts } from '../../model/Malt';
import { Hops } from '../../model/Hops';
import { Yeasts } from '../../model/Yeasts';

import './IngredientsFormPage.css';

import { MaltsActions } from "../../actions/malt.actions";
import { HopsActions } from "../../actions/hops.actions";
import { YeastActions } from "../../actions/yeast.actions";
import { AdditionalIngredientsActions } from "../../actions/additionalIngredients.actions";
import { AdditionalIngredient } from "../../model/AdditionalIngredient";


class IngredientsFormPage extends React.Component<any, any> {

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
            expandedAccordion: "malz"
        };
    }

    componentDidMount() {
        this.props.getMalt(true);
        this.props.getHop(true);
        this.props.getYeast(true);
        this.props.getAdditionalIngredients(true);
    }

    componentDidUpdate() {
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
            <Accordion
                expanded={expandedAccordion === aAccordionKey}
                onChange={this.handleAccordionChange(aAccordionKey)}
                className="ingredients-accordion"
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="ingredients-accordion-summary">
                    <Typography>{aTitle}</Typography>
                </AccordionSummary>
                <AccordionDetails className="ingredients-accordion-details">
                    {aContent}
                </AccordionDetails>
            </Accordion>
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
                alpha: String(newHop.alpha),
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
                temperature: String(newYeast.temperature),
                evg: String(newYeast.evg),
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
                    <button className="finish-btn" onClick={() => this.setState({ showNewMaltRow: true })}>➕</button>
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
                                            <button className="finish-btn" onClick={this.handleAddMalt}>💾</button>
                                            <button className="cancel-btn" onClick={() => this.setState({ showNewMaltRow: false })}>✖️</button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {malts.map((m: any) => (
                                <TableRow key={m.id}>
                                    <TableCell>{m.name}</TableCell>
                                    <TableCell>{m.description}</TableCell>
                                    <TableCell>{m.ebc}</TableCell>
                                    <TableCell className="action-cell"><div className="action-buttons"><button className="cancel-btn" onClick={() => this.handleDeleteMalt(m)}>🗑️</button></div></TableCell>
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
                    <button className="finish-btn" onClick={() => this.setState({ showNewHopRow: true })}>➕</button>
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
                                            <button className="finish-btn" onClick={this.handleAddHop}>💾</button>
                                            <button className="cancel-btn" onClick={() => this.setState({ showNewHopRow: false })}>✖️</button>
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
                                    <TableCell className="action-cell"><div className="action-buttons"><button className="cancel-btn" onClick={() => this.handleDeleteHop(h)}>🗑️</button></div></TableCell>
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
                    <button className="finish-btn" onClick={() => this.setState({ showNewYeastRow: true })}>➕</button>
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
                                            <button className="finish-btn" onClick={this.handleAddYeast}>💾</button>
                                            <button className="cancel-btn" onClick={() => this.setState({ showNewYeastRow: false })}>✖️</button>
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
                                    <TableCell className="action-cell"><div className="action-buttons"><button className="cancel-btn" onClick={() => this.handleDeleteYeast(y)}>🗑️</button></div></TableCell>
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
                    <button className="finish-btn" onClick={() => this.setState({ showNewAdditionalIngredientRow: true, additionalIngredientError: "" })}>➕</button>
                    <button className="finish-btn" onClick={() => this.props.getAdditionalIngredients(true)}>↻</button>
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
                                            <button className="finish-btn" onClick={this.handleAddAdditionalIngredient}>💾</button>
                                            <button className="cancel-btn" onClick={() => this.setState({ showNewAdditionalIngredientRow: false, additionalIngredientError: "" })}>✖️</button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {additionalIngredients.map((aIngredient: AdditionalIngredient) => (
                                <TableRow key={aIngredient.id}>
                                    <TableCell>{aIngredient.name}</TableCell>
                                    <TableCell>{aIngredient.description}</TableCell>
                                    <TableCell className="action-cell"><div className="action-buttons"><button className="cancel-btn" onClick={() => this.handleDeleteAdditionalIngredient(aIngredient)}>🗑️</button></div></TableCell>
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
                ref={(ref) => { this.simpleBarRef = ref }}
                style={{ height: "calc(100vh - 0px)" }}
                autoHide={false}
            >
                <div className='containerIngredientsForm'>
                    {this.renderIngredientAccordion("malz", "Malz", this.renderMaltContent())}
                    {this.renderIngredientAccordion("hopfen", "Hopfen", this.renderHopContent())}
                    {this.renderIngredientAccordion("hefe", "Hefe", this.renderYeastContent())}
                    {this.renderIngredientAccordion("weitere-zutaten", "Weitere Zutaten", this.renderAdditionalIngredientsContent())}
                </div>
            </SimpleBar>
        );
    }
}

/* ====================== Redux Mapper ====================== */

const mapStateToProps = (state: any) => ({
    malts: state.maltsReducer.malts || [],
    hops: state.hopsReducer.hops || [],
    yeasts: state.yeastReducer.yeasts || [],
    additionalIngredients: state.additionalIngredientsReducer.additionalIngredients || []
});

const mapDispatchToProps = (dispatch: any) => ({
    getMalt: (isFetching: boolean) => dispatch(MaltsActions.getMalts(isFetching)),
    getHop: (isFetching: boolean) => dispatch(HopsActions.getHops(isFetching)),
    getYeast: (isFetching: boolean) => dispatch(YeastActions.getYeasts(isFetching)),
    submitNewMalt: (malt: Malts) => dispatch(MaltsActions.submitNewMalt(malt)),
    submitNewHop: (hop: Hops) => dispatch(HopsActions.submitNewHop(hop)),
    submitNewYeast: (yeast: Yeasts) => dispatch(YeastActions.submitNewYeast(yeast)),
    deleteMaltById: (aId: string) => dispatch(MaltsActions.deleteMaltsById(aId)),
    deleteHopById: (aId: string) => dispatch(HopsActions.deleteHopById(aId)),
    deleteYeastById: (aId: string) => dispatch(YeastActions.deleteYeastById(aId)),
    getAdditionalIngredients: (isFetching: boolean) => dispatch(AdditionalIngredientsActions.getAdditionalIngredients(isFetching)),
    submitNewAdditionalIngredient: (aIngredient: { name: string; description?: string }) => dispatch(AdditionalIngredientsActions.submitNewAdditionalIngredient(aIngredient)),
    deleteAdditionalIngredientById: (aId: string) => dispatch(AdditionalIngredientsActions.deleteAdditionalIngredientById(aId))
});

export default connect(mapStateToProps, mapDispatchToProps)(IngredientsFormPage);
