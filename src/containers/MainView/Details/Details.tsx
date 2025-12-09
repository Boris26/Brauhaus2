import React from 'react';
import { connect } from 'react-redux';
import './Details.css';
import { Beer } from "../../../model/Beer";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

import {
    Accordion, AccordionDetails, AccordionSummary,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {scalingValues} from "../../../utils/BeerScaler/ScalingBeerRecipe";
import {BeerActions} from "../../../actions/actions";

interface DetailsProps {
    selectedBeer: Beer;
    updateRecipeScaling: (aScalingValues: scalingValues) => void;
}

interface DetailsState {
    selectedBeer: Beer | undefined;
    batchSize: number;
    brewhouseEfficiency: number;
}

class Details extends React.Component<DetailsProps, DetailsState> {

    constructor(props: DetailsProps) {
        super(props);
        this.state = {
            selectedBeer: undefined,
            batchSize: 10,
            brewhouseEfficiency: 52
        };
    }

    componentDidUpdate(prevProps: Readonly<DetailsProps>, prevState: Readonly<DetailsState>, snapshot?: any) {
        const {batchSize, brewhouseEfficiency} = this.state
        const {selectedBeer} = this.props
        if(selectedBeer && prevProps.selectedBeer)
        {
            if(selectedBeer?.id !== prevProps?.selectedBeer.id)
            {
                this.setState({
                    batchSize: 10,
                    brewhouseEfficiency:52});
            }
        }


        if(batchSize !== prevState.batchSize || brewhouseEfficiency !== prevState.brewhouseEfficiency)
        {
            this.updateRecipe()
        }
    }

    private aDebounceHandle: any = null;

    debounceUpdateRecipe(values: scalingValues) {
        if (this.aDebounceHandle) {
            clearTimeout(this.aDebounceHandle);
        }

        this.aDebounceHandle = setTimeout(() => {
            this.props.updateRecipeScaling(values);
        }, 300);
    }


    updateRecipe() {
        const { batchSize, brewhouseEfficiency } = this.state;
        const { selectedBeer } = this.props;

        if (!selectedBeer) return;

        const values: scalingValues = {
            beer: selectedBeer,
            volume: batchSize,
            brewhouseEfficiency: brewhouseEfficiency
        };

        this.debounceUpdateRecipe(values);
    }




    // -------------------------------------------------------------
    // Header
    // -------------------------------------------------------------
    renderHeader() {
        return (
            <div className="header">
                <span className="header-text">Details</span>
            </div>
        );
    }

    // -------------------------------------------------------------
    // Batch Settings
    // -------------------------------------------------------------
    renderBatchSettings() {
        return (
            <div className="batch-settings">
                <div className="settings-row">
                    <div>
                        <label style={{ color: 'white' }}>Liter:</label>
                        <select
                            value={this.state.batchSize}
                            onChange={(e) => this.setState({ batchSize: Number(e.target.value) })}
                            className="batch-select"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                            <option value={40}>40</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ color: 'white' }}>Sudhausausbeute:</label>
                        <input
                            type="number"
                            min={40}
                            max={100}
                            step={1}
                            value={this.state.brewhouseEfficiency}
                            onChange={(e) => this.setState({ brewhouseEfficiency: Number(e.target.value) })}
                            className="batch-input"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // Accordion: Allgemeine Daten
    // -------------------------------------------------------------
    renderAccordionGeneralData() {
        return (
            <Accordion defaultExpanded>
                <AccordionSummary
                    sx={{
                        backgroundColor: 'darkorange',
                        color: 'white',
                        '& .MuiTypography-root': { color: 'white' }
                    }}
                    expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                >
                    <Typography>Allgemeine Daten</Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                    {this.renderGeneralData()}
                </AccordionDetails>
            </Accordion>
        );
    }

    renderGeneralData() {
        const { selectedBeer } = this.props;

        return (
            <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
                <Table className="wortBoiling-table">
                    <TableBody>
                        <TableRow><TableCell>Name</TableCell><TableCell>{selectedBeer?.name}</TableCell></TableRow>
                        <TableRow><TableCell>Type</TableCell><TableCell>{selectedBeer?.type}</TableCell></TableRow>
                        <TableRow><TableCell>Bitterheit</TableCell><TableCell>{selectedBeer?.bitterness}</TableCell></TableRow>
                        <TableRow><TableCell>Farbe</TableCell><TableCell>{selectedBeer?.color}</TableCell></TableRow>
                        <TableRow><TableCell>Alkohol</TableCell><TableCell>{selectedBeer?.alcohol}</TableCell></TableRow>
                        <TableRow><TableCell>Stammwürze</TableCell><TableCell>{selectedBeer?.originalwort}</TableCell></TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    // -------------------------------------------------------------
    // Accordion: Maischplan
    // -------------------------------------------------------------
    renderAccordionFermentation() {
        return (
            <Accordion>
                <AccordionSummary
                    sx={{
                        backgroundColor: 'darkorange',
                        color: 'white',
                        '& .MuiTypography-root': { color: 'white' }
                    }}
                    expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                >
                    <Typography>Maischplan</Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                    {this.renderFermentation()}
                </AccordionDetails>
            </Accordion>
        );
    }

    renderFermentation() {
        const { selectedBeer } = this.props;
        if (!selectedBeer?.fermentation) return null;

        return (
            <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
                <Table className="wortBoiling-table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Zeit</TableCell>
                            <TableCell>Temp</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {selectedBeer.fermentation.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{item.type}</TableCell>
                                <TableCell>{item.time}</TableCell>
                                <TableCell>{item.temperature}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    // -------------------------------------------------------------
    // Accordion: Schüttung
    // -------------------------------------------------------------
    renderAccordionFilling() {
        return (
            <Accordion>
                <AccordionSummary
                    sx={{
                        backgroundColor: 'darkorange',
                        color: 'white',
                        '& .MuiTypography-root': { color: 'white' }
                    }}
                    expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                >
                    <Typography>Schüttung</Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                    {this.renderFilling()}
                </AccordionDetails>
            </Accordion>
        );
    }

    renderFilling() {
        const { selectedBeer } = this.props;
        if (!selectedBeer?.malts) return null;

        return (
            <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
                <Table className="wortBoiling-table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Menge / g</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {selectedBeer.malts.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    // -------------------------------------------------------------
    // Accordion: Würzekochen
    // -------------------------------------------------------------
    renderAccordionWortBoiling() {
        return (
            <Accordion>
                <AccordionSummary
                    sx={{
                        backgroundColor: 'darkorange',
                        color: 'white',
                        '& .MuiTypography-root': { color: 'white' }
                    }}
                    expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                >
                    <Typography>Würzekochen</Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                    {this.renderWortBoiling()}
                </AccordionDetails>
            </Accordion>
        );
    }

    renderWortBoiling() {
        const { selectedBeer } = this.props;
        if (!selectedBeer?.wortBoiling) return null;

        return (
            <div>
                <div className="wortBoiling-header">
                    <label className="wortBoiling-header-text">Zeit: {selectedBeer.cookingTime} Min.</label>
                    <label className="wortBoiling-header-text">Temperatur: {selectedBeer.cookingTemperatur}°C</label>
                </div>

                <TableContainer component={Paper}>
                    <Table className="wortBoiling-table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Zeit</TableCell>
                                <TableCell>Menge</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {selectedBeer.wortBoiling.hops.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.time}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        );
    }

    // -------------------------------------------------------------
    // Accordion: Gärung & Reifung
    // -------------------------------------------------------------
    renderAccordionFermentationMaturation() {
        return (
            <Accordion>
                <AccordionSummary
                    sx={{
                        backgroundColor: 'darkorange',
                        color: 'white',
                        '& .MuiTypography-root': { color: 'white' }
                    }}
                    expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                >
                    <Typography>Gärung und Reifung</Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                    {this.renderFermentationMaturation()}
                </AccordionDetails>
            </Accordion>
        );
    }

    renderFermentationMaturation() {
        const { selectedBeer } = this.props;
        const fm = selectedBeer?.fermentationMaturation;

        if (!fm) return null;

        // Hefe-Liste sicher holen
        const yeasts = Array.isArray(fm.yeast) ? fm.yeast : [];

        return (
            <div>
                <div className='label'>Temperatur:</div>
                <span className="inputTextGeneral">
                {fm.fermentationTemperature ?? '—'}
            </span>

                <div className='label'>Karbonisierung:</div>
                <span className="inputTextGeneral">
                {fm.carbonation ?? '—'}
            </span>

                <div className='label'>Hefe:</div>
                {yeasts.length > 0 ? (
                    <ul className="inputTextGeneral">
                        {yeasts.map((y, index) => (
                            <li key={index}>
                                {y?.name ?? 'Unbekannte Hefe'}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <span className="inputTextGeneral">Keine Hefe</span>
                )}
            </div>
        );
    }

    // -------------------------------------------------------------
    // Accordion: Wasser
    // -------------------------------------------------------------
    renderAccordionWater() {
        return (
            <Accordion>
                <AccordionSummary
                    sx={{
                        backgroundColor: 'darkorange',
                        color: 'white',
                        '& .MuiTypography-root': { color: 'white' }
                    }}
                    expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                >
                    <Typography>Wasser</Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
                    {this.renderBrewingWater()}
                </AccordionDetails>
            </Accordion>
        );
    }

    renderBrewingWater() {
        const { selectedBeer } = this.props;

        return (
            <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
                <Table className="wortBoiling-table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Hauptguss</TableCell>
                            <TableCell>Nachguss</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>{selectedBeer?.mashVolume}</TableCell>
                            <TableCell>{selectedBeer?.spargeVolume}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    // -------------------------------------------------------------
    // MAIN RENDER
    // -------------------------------------------------------------
    render() {
        return (
            <div className="detailsContainer" >

                {this.renderHeader()}
                {this.renderBatchSettings()}

                {/* ONLY THIS PART SCROLLS */}

                    {this.renderAccordionGeneralData()}
                    {this.renderAccordionFermentation()}
                    {this.renderAccordionFilling()}
                    {this.renderAccordionWortBoiling()}
                    {this.renderAccordionFermentationMaturation()}
                    {this.renderAccordionWater()}


            </div>
        );
    }
}

const mapStateToProps = (state: any) => ({
    selectedBeer: state.beerDataReducer.selectedBeer,
});

const mapDispatchToProps = (dispatch: any) => ({
    updateRecipeScaling: (aScalingValues: scalingValues) =>
        dispatch(BeerActions.updateRecipeScaling(aScalingValues)),
});


export default connect(mapStateToProps, mapDispatchToProps)(Details);
