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
    TableRow,
    Paper
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { connect } from 'react-redux';
import SimpleBar from "simplebar-react";

import { Malts } from '../../model/Malt';
import { Hops } from '../../model/Hops';
import { Yeasts } from '../../model/Yeasts';
import { COLOR_ACCENT } from '../../colors';

import './IngredientsFormPage.css';

import { MaltsActions } from "../../actions/malt.actions";
import { HopsActions } from "../../actions/hops.actions";
import { YeastActions } from "../../actions/yeast.actions";


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
            showNewYeastRow: false
        };
    }

    componentDidMount() {
        this.props.getMalt(true);
        this.props.getHop(true);
        this.props.getYeast(true);
    }

    componentDidUpdate() {
        if (this.simpleBarRef && this.simpleBarRef.recalculate) {
            this.simpleBarRef.recalculate();
        }
    }


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


    render() {
        const { malts, hops, yeasts } = this.props;
        const {
            newMalt, newHop, newYeast,
            showNewMaltRow, showNewHopRow, showNewYeastRow
        } = this.state;


        return (
            <SimpleBar
                ref={(ref) => { this.simpleBarRef = ref }}
                style={{ height: "calc(100vh - 0px)" }}
                autoHide={false}
            >
                <div className='containerIngredientsForm'>

                    {/* ----------------------------------- MALZ ----------------------------------- */}
                    <Accordion defaultExpanded sx={{ backgroundColor: "#404040" }}>
                        <AccordionSummary
                            sx={{ backgroundColor: COLOR_ACCENT, borderRadius: "10px 10px 0 0" }}
                            expandIcon={<ExpandMoreIcon />}
                        >
                            <Typography>Malz</Typography>
                        </AccordionSummary>

                        <AccordionDetails sx={{ backgroundColor: "#404040" }}>
                            <div className="filter-container">
                                <button
                                    className="finish-btn"
                                    onClick={() => this.setState({ showNewMaltRow: true })}
                                >
                                    ➕
                                </button>
                            </div>

                            <TableContainer className="FinishedBrewsTable" sx={{ maxHeight: 400 }}>

                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Beschreibung</TableCell>
                                            <TableCell>EBC</TableCell>
                                            <TableCell>Aktion</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {showNewMaltRow && (
                                            <TableRow>
                                                <TableCell>
                                                    <input className="table-edit-field"
                                                           value={newMalt.name || ""}
                                                           onChange={e => this.setState({ newMalt: { ...newMalt, name: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <input className="table-edit-field"
                                                           value={newMalt.description || ""}
                                                           onChange={e => this.setState({ newMalt: { ...newMalt, description: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <input type="number" className="table-edit-field"
                                                           value={newMalt.ebc || ""}
                                                           onChange={e => this.setState({ newMalt: { ...newMalt, ebc: Number(e.target.value) } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
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
                                                <TableCell>
                                                    <div className="action-buttons">
                                                        <button className="cancel-btn">🗑️</button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </AccordionDetails>
                    </Accordion>


                    {/* ----------------------------------- HOPFEN ----------------------------------- */}
                    <Accordion sx={{ backgroundColor: "#404040" }}>
                        <AccordionSummary
                            sx={{ backgroundColor: COLOR_ACCENT }}
                            expandIcon={<ExpandMoreIcon />}
                        >
                            <Typography>Hopfen</Typography>
                        </AccordionSummary>

                        <AccordionDetails sx={{ backgroundColor: "#404040" }}>
                            <button className="finish-btn" onClick={() => this.setState({ showNewHopRow: true })}>➕</button>

                            <TableContainer className="FinishedBrewsTable" sx={{ maxHeight: 400 }}>
                                <Table stickyHeader>

                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Alpha</TableCell>
                                            <TableCell>Typ</TableCell>
                                            <TableCell>Beschreibung</TableCell>
                                            <TableCell>Aktion</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {showNewHopRow && (
                                            <TableRow>
                                                <TableCell>
                                                    <input className="table-edit-field" value={newHop.name || ""}
                                                           onChange={e => this.setState({ newHop: { ...newHop, name: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <input className="table-edit-field" value={newHop.alpha || ""}
                                                           onChange={e => this.setState({ newHop: { ...newHop, alpha: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <input className="table-edit-field" value={newHop.type || ""}
                                                           onChange={e => this.setState({ newHop: { ...newHop, type: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <input className="table-edit-field" value={newHop.description || ""}
                                                           onChange={e => this.setState({ newHop: { ...newHop, description: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
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
                                                <TableCell>
                                                    <div className="action-buttons">
                                                        <button className="cancel-btn">🗑️</button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>

                                </Table>
                            </TableContainer>
                        </AccordionDetails>
                    </Accordion>


                    {/* ----------------------------------- HEFE ----------------------------------- */}
                    <Accordion sx={{ backgroundColor: "#404040" }}>
                        <AccordionSummary
                            sx={{ backgroundColor: COLOR_ACCENT, borderRadius: "0 0 10px 10px" }}
                            expandIcon={<ExpandMoreIcon />}
                        >
                            <Typography>Hefe</Typography>
                        </AccordionSummary>

                        <AccordionDetails sx={{ backgroundColor: "#404040" }}>
                            <button className="finish-btn" onClick={() => this.setState({ showNewYeastRow: true })}>➕</button>

                            <TableContainer className="FinishedBrewsTable" sx={{ maxHeight: 400 }}>
                                <Table stickyHeader>

                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Typ</TableCell>
                                            <TableCell>Temperatur</TableCell>
                                            <TableCell>EVG</TableCell>
                                            <TableCell>Aktion</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {showNewYeastRow && (
                                            <TableRow>
                                                <TableCell>
                                                    <input className="table-edit-field"
                                                           value={newYeast.name || ""}
                                                           onChange={e => this.setState({ newYeast: { ...newYeast, name: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <input className="table-edit-field"
                                                           value={newYeast.type || ""}
                                                           onChange={e => this.setState({ newYeast: { ...newYeast, type: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <input className="table-edit-field"
                                                           value={newYeast.temperature || ""}
                                                           onChange={e => this.setState({ newYeast: { ...newYeast, temperature: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <input className="table-edit-field"
                                                           value={newYeast.evg || ""}
                                                           onChange={e => this.setState({ newYeast: { ...newYeast, evg: e.target.value } })}
                                                    />
                                                </TableCell>

                                                <TableCell>
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
                                                <TableCell>
                                                    <div className="action-buttons">
                                                        <button className="cancel-btn">🗑️</button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>

                                </Table>
                            </TableContainer>
                        </AccordionDetails>
                    </Accordion>

                </div>
            </SimpleBar>
        );
    }
}



/* ====================== Redux Mapper ====================== */

const mapStateToProps = (state: any) => ({
    malts: state.maltsReducer.malts || [],
    hops: state.hopsReducer.hops || [],
    yeasts: state.yeastReducer.yeasts || []
});

const mapDispatchToProps = (dispatch: any) => ({
    getMalt: (isFetching: boolean) => dispatch(MaltsActions.getMalts(isFetching)),
    getHop: (isFetching: boolean) => dispatch(HopsActions.getHops(isFetching)),
    getYeast: (isFetching: boolean) => dispatch(YeastActions.getYeasts(isFetching)),
    submitNewMalt: (malt: Malts) => dispatch(MaltsActions.submitNewMalt(malt)),
    submitNewHop: (hop: Hops) => dispatch(HopsActions.submitNewHop(hop)),
    submitNewYeast: (yeast: Yeasts) => dispatch(YeastActions.submitNewYeast(yeast))
});

export default connect(mapStateToProps, mapDispatchToProps)(IngredientsFormPage);
