import React from 'react';
import './Details.css';
import { Beer } from "../../../model/Beer";

import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import {BeerRecipeScaler, scalingValues} from "../../../utils/BeerScaler/ScalingBeerRecipe";
import {COLOR_BREW_BG} from "../../../colors";
import {AppAccordion, AppAccordionHeader} from "../../../components/AppAccordion/AppAccordion";

interface DetailsProps {
    selectedBeer?: Beer;
    updateRecipeScaling: (aScalingValues: scalingValues) => void;
}

interface DetailsState {
    selectedBeer: Beer | undefined;
    batchSize: number;
    brewhouseEfficiency: number;
}

export class Details extends React.Component<DetailsProps, DetailsState> {

    constructor(props: DetailsProps) {
        super(props);
        this.state = {
            selectedBeer: undefined,
            batchSize: BeerRecipeScaler.getReferenceVolume(props.selectedBeer),
            brewhouseEfficiency: BeerRecipeScaler.DEFAULT_PLANNED_BREWHOUSE_EFFICIENCY
        };
    }

    componentDidMount() {
        this.updateRecipe();
    }

    componentDidUpdate(prevProps: Readonly<DetailsProps>, prevState: Readonly<DetailsState>, snapshot?: any) {
        const {batchSize, brewhouseEfficiency} = this.state
        const {selectedBeer} = this.props
        if(selectedBeer && selectedBeer.id !== prevProps.selectedBeer?.id)
        {
            this.setState({
                batchSize: BeerRecipeScaler.getReferenceVolume(selectedBeer),
                brewhouseEfficiency: BeerRecipeScaler.DEFAULT_PLANNED_BREWHOUSE_EFFICIENCY});
        }


        if(batchSize !== prevState.batchSize || brewhouseEfficiency !== prevState.brewhouseEfficiency)
        {
            this.updateRecipe()
        }
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

        this.props.updateRecipeScaling(values);
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
        const {selectedBeer} = this.props;
        if (!selectedBeer) return null;

        const hasRecipeReference = Boolean(
            selectedBeer.referenceVolume && selectedBeer.referenceVolume > 0 &&
            selectedBeer.referenceBrewhouseEfficiency && selectedBeer.referenceBrewhouseEfficiency > 0
        );
        return (
            <div className="batch-settings">
                <div className="settings-row">
                    <div>
                        <label style={{ color: 'white' }}>Ausschlagmenge:</label>
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
                            className="batch-input brewhouse-efficiency-input"
                        />
                    </div>
                    {hasRecipeReference && (
                        <span className="recipe-reference">
                            Rezeptbasis: {selectedBeer.referenceVolume} l · {selectedBeer.referenceBrewhouseEfficiency} % SHA
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // Accordion: Allgemeine Daten
    // -------------------------------------------------------------
    renderAccordionGeneralData() {
        return (
            <AppAccordion defaultExpanded summary={<AppAccordionHeader title="Allgemeine Daten" />}>
                {this.renderGeneralData()}
            </AppAccordion>
        );
    }

    renderGeneralData() {
        const { selectedBeer } = this.props;

        return (
            <TableContainer component={Paper} style={{ backgroundColor: COLOR_BREW_BG }}>
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
            <AppAccordion summary={<AppAccordionHeader title="Maischplan" />}>
                {this.renderFermentation()}
            </AppAccordion>
        );
    }

    renderFermentation() {
        const { selectedBeer } = this.props;
        if (!selectedBeer?.fermentation) return null;

        return (
            <TableContainer component={Paper} style={{ backgroundColor: COLOR_BREW_BG }}>
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
            <AppAccordion summary={<AppAccordionHeader title="Schüttung" />}>
                {this.renderFilling()}
            </AppAccordion>
        );
    }

    renderFilling() {
        const { selectedBeer } = this.props;
        if (!selectedBeer?.malts) return null;

        return (
            <TableContainer component={Paper} style={{ backgroundColor: COLOR_BREW_BG }}>
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
            <AppAccordion summary={<AppAccordionHeader title="Würzekochen" />}>
                {this.renderWortBoiling()}
            </AppAccordion>
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
            <AppAccordion summary={<AppAccordionHeader title="Gärung und Reifung" />}>
                {this.renderFermentationMaturation()}
            </AppAccordion>
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
            <AppAccordion summary={<AppAccordionHeader title="Wasser" />}>
                {this.renderBrewingWater()}
            </AppAccordion>
        );
    }

    renderBrewingWater() {
        const { selectedBeer } = this.props;

        return (
            <TableContainer component={Paper} style={{ backgroundColor: COLOR_BREW_BG }}>
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
        if (!this.props.selectedBeer) return null;

        return (
            <div className="detailsContainer" >

                {this.renderHeader()}
                {this.renderBatchSettings()}

                {/* ONLY THIS PART SCROLLS */}

                    <div className="app-accordion-group">
                        {this.renderAccordionGeneralData()}
                        {this.renderAccordionFermentation()}
                        {this.renderAccordionFilling()}
                        {this.renderAccordionWortBoiling()}
                        {this.renderAccordionFermentationMaturation()}
                        {this.renderAccordionWater()}
                    </div>


            </div>
        );
    }
}
