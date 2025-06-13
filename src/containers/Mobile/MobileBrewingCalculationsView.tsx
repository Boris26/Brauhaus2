import React, { Component } from 'react';
import './MobileBrewingCalculationsView.css';
import { brixToPlato, platoToBrix, temperatureCorrection } from '../../utils/Calculations/calculationsUtils';
import { eSugarTypes } from '../../enums/eSugerTypes';

const ML_TO_L_CONVERSION = 1000;
const SUCROSE_YIELD_FACTOR = 0.512;
const GLUCOSE_YIELD_FACTOR = 0.443;
const DEFAULT_REST_CO2 = 1.7;

interface State {
    brix: string;
    plato: string;
    temp: string;
    carbTemp: string;
    carbTarget: string;
    carbLiters: string;
    waterForSolutionML: string;
}

class MobileBrewingCalculationsView extends Component<{}, State> {
    state: State = {
        brix: '',
        plato: '',
        temp: '20',
        carbTemp: '',
        carbTarget: '',
        carbLiters: '',
        waterForSolutionML: '1000',
    };

    setBrix = (value: string) => this.setState({ brix: value });
    setPlato = (value: string) => this.setState({ plato: value });
    setTemp = (value: string) => this.setState({ temp: value });
    setCarbTemp = (value: string) => this.setState({ carbTemp: value });
    setCarbTarget = (value: string) => this.setState({ carbTarget: value });
    setCarbLiters = (value: string) => this.setState({ carbLiters: value });
    setWaterForSolutionML = (value: string) => this.setState({ waterForSolutionML: value });

    calculateSugarAmount(aSugarType: eSugarTypes): number {
        const volumeBeerL = parseFloat(this.state.carbLiters);
        const targetCO2_gL = parseFloat(this.state.carbTarget);
        const waterVolumeMl = parseFloat(this.state.waterForSolutionML);
        const volumeWaterL = waterVolumeMl / ML_TO_L_CONVERSION;
        const totalVolumeL = volumeBeerL + volumeWaterL;
        const deltaCO2 = targetCO2_gL * totalVolumeL - DEFAULT_REST_CO2 * volumeBeerL;
        if (isNaN(deltaCO2) || deltaCO2 <= 0) return 0;
        const factor = aSugarType === eSugarTypes.Sucrose ? 1 / SUCROSE_YIELD_FACTOR : 1 / GLUCOSE_YIELD_FACTOR;
        const sugarGrams = deltaCO2 * factor;
        return Math.round(sugarGrams * 100) / 100;
    }

    render() {
        const { brix, plato, temp, carbTemp, carbTarget, carbLiters, waterForSolutionML } = this.state;
        const sucroseSugar = this.calculateSugarAmount(eSugarTypes.Sucrose);
        const glucoseSugar = this.calculateSugarAmount(eSugarTypes.Glucose);
        return (
            <div className="mobile-brewing-calc-container">
                <h2>Bierbrau-Berechnungen</h2>
                <div className="mobile-calc-block">
                    <label>Brix → Plato</label>
                    <input
                        type="number"
                        min="0"
                        value={brix}
                        onChange={e => this.setBrix(e.target.value)}
                        placeholder="Brix"
                    />
                    <span>= {brix !== '' ? brixToPlato(parseFloat(brix)).toFixed(2) : ''} °P</span>
                </div>
                <div className="mobile-calc-block">
                    <label>Plato → Brix</label>
                    <input
                        type="number"
                        min="0"
                        value={plato}
                        onChange={e => this.setPlato(e.target.value)}
                        placeholder="Plato"
                    />
                    <span>= {plato !== '' ? platoToBrix(parseFloat(plato)).toFixed(2) : ''} Brix</span>
                </div>
                <div className="mobile-calc-block">
                    <label>Temperaturkorrektur</label>
                    <input
                        type="number"
                        min="0"
                        value={temp}
                        onChange={e => this.setTemp(e.target.value)}
                        placeholder="Temp (°C)"
                    />
                    <span>Brix korrigiert: {brix !== '' && temp !== '' ? temperatureCorrection(parseFloat(brix), parseFloat(temp)).toFixed(2) : ''}</span>
                    <span>Plato korrigiert: {plato !== '' && temp !== '' ? temperatureCorrection(parseFloat(plato), parseFloat(temp)).toFixed(2) : ''}</span>
                </div>
                <div className="mobile-calc-block">
                    <label>Karbonisierung</label>
                    <input
                        type="number"
                        min="0"
                        value={carbTemp}
                        onChange={e => this.setCarbTemp(e.target.value)}
                        placeholder="Jungbiertemperatur (°C)"
                        style={{marginBottom: 6}}
                    />
                    <input
                        type="number"
                        min="0"
                        value={carbTarget}
                        onChange={e => this.setCarbTarget(e.target.value)}
                        placeholder="Ziel-CO₂ (g/L)"
                        style={{marginBottom: 6}}
                    />
                    <input
                        type="number"
                        min="0"
                        value={carbLiters}
                        onChange={e => this.setCarbLiters(e.target.value)}
                        placeholder="Liter Bier"
                        style={{marginBottom: 6}}
                    />
                    <input
                        type="number"
                        min="0"
                        step="100"
                        value={waterForSolutionML}
                        onChange={e => this.setWaterForSolutionML(e.target.value)}
                        placeholder="Wasser für Lösung (ml)"
                        style={{marginBottom: 6}}
                    />
                    <span>Haushaltszucker (g): <b>{sucroseSugar > 0 ? sucroseSugar.toFixed(2) : ''}</b></span>
                    <span>Traubenzucker (g): <b>{glucoseSugar > 0 ? glucoseSugar.toFixed(2) : ''}</b></span>
                </div>
            </div>
        );
    }
}

export default MobileBrewingCalculationsView;
