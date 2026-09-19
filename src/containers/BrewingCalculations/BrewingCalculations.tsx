import React from 'react';
import { TextField } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import LocalDrinkOutlinedIcon from '@mui/icons-material/LocalDrinkOutlined';
import './BrewingCalculations.css';
import {PageLayout} from '../../components/PageLayout/PageLayout';
import {
    brixToPlato, calculateFromRefractometer,
    platoToBrix,
    temperatureCorrection,

} from '../../utils/Calculations/calculationsUtils';
import { eSugarTypes } from '../../enums/eSugerTypes';


const ML_TO_L_CONVERSION = 1000; // Umrechnung von Milliliter zu Liter
const SUCROSE_YIELD_FACTOR = 0.512; // g CO₂ pro g Haushaltszucker
const GLUCOSE_YIELD_FACTOR = 0.443; // g CO₂ pro g Traubenzucker
const DEFAULT_REST_CO2 = 1.7; // Standardwert für Rest-CO₂ im Jungbier

interface BrewingCalculationsState {
    brix: string;
    plato: string;
    temp: string;
    carbTemp: string;
    carbTarget: string;
    carbLiters: string;
    waterForSolutionML: string;
    ogBrix?: string; // Stammwürze in Brix
    fgBrix?: string; // Restextrakt in Brix
}

class BrewingCalculations extends React.Component<{}, BrewingCalculationsState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            brix: '',
            plato: '',
            temp: '20',
            carbTemp: '',
            carbTarget: '',
            carbLiters: '',
            waterForSolutionML: '1000',
            ogBrix: '',
            fgBrix: '',
        };
    }

    handleBrixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ brix: e.target.value });
    };

    handlePlatoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ plato: e.target.value });
    };

    handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ temp: e.target.value });
    };

    handleCarbTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ carbTemp: e.target.value });
    };
    handleCarbTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ carbTarget: e.target.value });
    };
    handleCarbLitersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ carbLiters: e.target.value });
    };
    handleKlarwasserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ waterForSolutionML: e.target.value });
    };
    handleOgBrixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ ogBrix: e.target.value });
    };
    handleFgBrixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ fgBrix: e.target.value });
    };

     calculateSugarAmount(
         aSugarType: eSugarTypes,
     ): number {
         const {carbTarget, carbLiters } = this.state;
         const volumeBeerL = parseFloat(carbLiters);
         const targetCO2_gL = parseFloat(carbTarget);
         const waterVolumeMl = parseFloat(this.state.waterForSolutionML);
         const volumeWaterL = waterVolumeMl / ML_TO_L_CONVERSION;
         const totalVolumeL = volumeBeerL + volumeWaterL;

         const deltaCO2 = targetCO2_gL * totalVolumeL - DEFAULT_REST_CO2 * volumeBeerL;
         if (deltaCO2 <= 0) return 0;

         const factor = aSugarType === eSugarTypes.Sucrose ? 1 / SUCROSE_YIELD_FACTOR : 1 / GLUCOSE_YIELD_FACTOR;
         const sugarGrams = deltaCO2 * factor;

         return Math.round(sugarGrams);
    }

    private field = (label: string, value: string, onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void, options: {readOnly?: boolean; min?: number; step?: number} = {}) => (
        <TextField
            label={label}
            value={value}
            onChange={onChange}
            type="number"
            inputProps={{min: options.min, step: options.step}}
            InputProps={{readOnly: options.readOnly}}
            size="small"
            fullWidth
            variant="outlined"
            className={options.readOnly ? 'calculator-result-field' : undefined}
        />
    );

    private nonNegative = (handler: (event: React.ChangeEvent<HTMLInputElement>) => void) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            if (value === '' || parseFloat(value) >= 0) handler(event);
        };

    renderBrixPlatoBlock = () => {
        const {brix, plato} = this.state;
        return <section className="calculator-card brauhaus-card">
            <div className="calculator-card-header"><SwapHorizIcon aria-hidden="true"/><h2>Brix ↔ Plato</h2></div>
            <div className="calculator-conversion-row">
                {this.field('Brix', brix, this.nonNegative(this.handleBrixChange), {min: 0})}
                <span className="calculator-arrow" aria-hidden="true">→</span>
                {this.field('Plato', brix !== '' ? brixToPlato(parseFloat(brix)).toFixed(2) : '', undefined, {readOnly: true})}
            </div>
            <div className="calculator-conversion-row">
                {this.field('Plato', plato, this.nonNegative(this.handlePlatoChange), {min: 0})}
                <span className="calculator-arrow" aria-hidden="true">→</span>
                {this.field('Brix', plato !== '' ? platoToBrix(parseFloat(plato)).toFixed(2) : '', undefined, {readOnly: true})}
            </div>
        </section>;
    };

    renderTemperatureCorrectionBlock = () => {
        const {brix, plato, temp} = this.state;
        const brixNum = parseFloat(brix);
        const platoNum = parseFloat(plato);
        const tempNum = parseFloat(temp);
        return <section className="calculator-card brauhaus-card">
            <div className="calculator-card-header"><ThermostatIcon aria-hidden="true"/><h2>Temperaturkorrektur</h2></div>
            <div className="calculator-group">
                <h3>Gemessene Temperatur</h3>
                <div className="calculator-single-field">{this.field('Temperatur (°C)', temp, this.nonNegative(this.handleTempChange), {min: 0})}</div>
            </div>
            <div className="calculator-group">
                <h3>Ergebnis</h3>
                <div className="calculator-field-grid">
                    {this.field('Brix korrigiert', brix !== '' && temp !== '' ? temperatureCorrection(brixNum, tempNum).toFixed(2) : '', undefined, {readOnly: true})}
                    {this.field('Plato korrigiert', plato !== '' && temp !== '' ? temperatureCorrection(platoNum, tempNum).toFixed(2) : '', undefined, {readOnly: true})}
                </div>
            </div>
        </section>;
    };

    renderCarbonationBlock = () => {
        const {carbTemp, carbTarget, carbLiters, waterForSolutionML} = this.state;
        const sucroseSugar = this.calculateSugarAmount(eSugarTypes.Sucrose);
        const glucoseSugar = this.calculateSugarAmount(eSugarTypes.Glucose);
        return <section className="calculator-card brauhaus-card calculator-card--carbonation">
            <div className="calculator-card-header"><LocalDrinkOutlinedIcon aria-hidden="true"/><h2>Karbonisierung</h2></div>
            <div className="calculator-group">
                <h3>Eingaben</h3>
                <div className="calculator-input-grid">
                    {this.field('Jungbier Temp. (°C)', carbTemp, this.nonNegative(this.handleCarbTempChange), {min: 0})}
                    {this.field('Ziel CO₂ (g/L)', carbTarget, this.nonNegative(this.handleCarbTargetChange), {min: 0})}
                    {this.field('Volumen (L)', carbLiters, this.nonNegative(this.handleCarbLitersChange), {min: 0})}
                    {this.field('Wasser (ml)', waterForSolutionML, this.nonNegative(this.handleKlarwasserChange), {min: 0, step: 100})}
                </div>
            </div>
            <div className="calculator-group">
                <h3>Ergebnis</h3>
                <div className="calculator-field-grid">
                    {this.field('Haushaltszucker (g)', sucroseSugar ? sucroseSugar.toFixed(2) : '', undefined, {readOnly: true})}
                    {this.field('Traubenzucker (g)', glucoseSugar ? glucoseSugar.toFixed(2) : '', undefined, {readOnly: true})}
                </div>
            </div>
        </section>;
    };

    renderTerrillBlock = () => {
        const {ogBrix, fgBrix} = this.state;
        const ogBrixNum = parseFloat(ogBrix || '');
        const fgBrixNum = parseFloat(fgBrix || '');
        const terrillResult = ogBrix !== '' && fgBrix !== '' && !isNaN(ogBrixNum) && !isNaN(fgBrixNum)
            ? calculateFromRefractometer(ogBrixNum, fgBrixNum).apparentExtractPlato.toFixed(2) : '';
        return <section className="calculator-card brauhaus-card">
            <div className="calculator-card-header"><ScienceOutlinedIcon aria-hidden="true"/><h2>Scheinbarer Restextrakt</h2></div>
            <div className="calculator-group">
                <h3>Terrill-Korrektur</h3>
                <div className="calculator-field-grid calculator-field-grid--three">
                    {this.field('Stammwürze (Brix)', ogBrix || '', this.handleOgBrixChange, {min: 0})}
                    {this.field('Restextrakt (Brix)', fgBrix || '', this.handleFgBrixChange, {min: 0})}
                    {this.field('Restextrakt (°P)', terrillResult, undefined, {readOnly: true})}
                </div>
            </div>
        </section>;
    };

    render() {
        return (
            <PageLayout
                title="Bierbrau-Berechnungen"
                subtitle="Umrechnungen und Hilfsrechner für den Brauprozess."
                contentClassName="BrewingCalculations-outer"
            >
                    <div className="calculator-grid">
                        {this.renderBrixPlatoBlock()}
                        {this.renderTemperatureCorrectionBlock()}
                        {this.renderTerrillBlock()}
                        {this.renderCarbonationBlock()}
                    </div>
            </PageLayout>
        );
    }
}
export default BrewingCalculations;
