import React, { Component } from 'react';
import './MobileBrewingCalculationsView.css';
import {
    brixToPlato,
    platoToBrix,
    temperatureCorrection,

    calculateSugarAmount, calculateFromRefractometer,

} from '../../../utils/Calculations/calculationsUtils';
import { eSugarTypes } from '../../../enums/eSugerTypes';

interface State {
    brix: string;
    plato: string;
    temp: string;
    carbTemp: string;
    carbTarget: string;
    carbLiters: string;
    waterForSolutionML: string;
    terrillOgBrix: string;
    terrillFgBrix: string;
}

class MobileBrewingCalculationsView extends Component<{}, State> {
    state: State = {
        brix: '',
        plato: '',
        temp: '20',
        carbTemp: '',
        carbTarget: '',
        carbLiters: '',
        waterForSolutionML: '', // leer lassen, damit placeholder angezeigt wird
        terrillOgBrix: '',
        terrillFgBrix: '',
    };

    setBrix = (value: string) => this.setState({ brix: value === '0' ? '' : value });
    setPlato = (value: string) => this.setState({ plato: value === '0' ? '' : value });
    setTemp = (value: string) => this.setState({ temp: value === '0' ? '' : value });
    setCarbTemp = (value: string) => this.setState({ carbTemp: value === '0' ? '' : value });
    setCarbTarget = (value: string) => this.setState({ carbTarget: value === '0' ? '' : value });
    setCarbLiters = (value: string) => this.setState({ carbLiters: value === '0' ? '' : value });
    setWaterForSolutionML = (value: string) => {
        this.setState({ waterForSolutionML: value === '' || value === '0' ? '' : value });
    };
    setTerrillOgBrix = (value: string) => this.setState({ terrillOgBrix: value === '0' ? '' : value });
    setTerrillFgBrix = (value: string) => this.setState({ terrillFgBrix: value === '0' ? '' : value });



    handleWheel = (field: keyof State) => (e: React.WheelEvent<HTMLInputElement>) => {
        e.preventDefault();
        let value = parseFloat(this.state[field] as string) || 0;
        let step = 0.1;
        if (field === 'temp') step = 0.5;
        if (e.deltaY < 0) value += step;
        else value -= step;
        value = Math.max(0, Math.round(value * 10) / 10);
        const strValue = value === 0 ? '' : value.toString();
        switch (field) {
            case 'brix': this.setBrix(strValue); break;
            case 'plato': this.setPlato(strValue); break;
            case 'carbTarget': this.setCarbTarget(strValue); break;
            case 'temp': this.setTemp(strValue); break;
            default: break;
        }
    };

    renderBrixToPlatoBlock() {
        const { brix } = this.state;
        return (
            <div className="mobile-calc-block">
                <div className="calc-title" style={{fontSize: '1.35em', display: 'flex', alignItems: 'center', gap: 12}}>
                    Brix
                    <span style={{fontSize: '2.2em', color: '#b8860b', display: 'flex', alignItems: 'center', fontWeight: 900, lineHeight: 1, position: 'relative', top: '-6px'}} aria-label="arrow" role="img">&#8594;</span>
                    Plato
                </div>
                <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={brix}
                    onChange={e => this.setBrix(e.target.value)}
                    placeholder="Brix"
                    onWheel={this.handleWheel('brix')}
                />
                <span>= {brix !== '' ? brixToPlato(parseFloat(brix)).toFixed(2) : ''} °P</span>
            </div>
        );
    }

    renderPlatoToBrixBlock() {
        const { plato } = this.state;
        return (
            <div className="mobile-calc-block">
                <div className="calc-title" style={{fontSize: '1.35em', display: 'flex', alignItems: 'center', gap: 12}}>
                    Plato
                    <span style={{fontSize: '2.2em', color: '#b8860b', display: 'flex', alignItems: 'center', fontWeight: 900, lineHeight: 1, position: 'relative', top: '-6px'}} aria-label="arrow" role="img">&#8594;</span>
                    Brix
                </div>
                <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={plato}
                    onChange={e => this.setPlato(e.target.value)}
                    placeholder="Plato"
                    onWheel={this.handleWheel('plato')}
                />
                <span>= {plato !== '' ? platoToBrix(parseFloat(plato)).toFixed(2) : ''} Brix</span>
            </div>
        );
    }

    renderTemperatureCorrectionBlock() {
        const { brix, plato, temp } = this.state;
        return (
            <div className="mobile-calc-block">
                <div className="calc-title" style={{fontSize: '1.2em'}}>
                    Temperaturkorrektur (°C)
                </div>
                <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={temp}
                    onChange={e => this.setTemp(e.target.value)}
                    placeholder="Temp (°C)"
                    onWheel={this.handleWheel('temp')}
                />
                <span>Brix korrigiert: {brix !== '' && temp !== '' ? temperatureCorrection(parseFloat(brix), parseFloat(temp)).toFixed(2) : ''}</span>
                <span>Plato korrigiert: {plato !== '' && temp !== '' ? temperatureCorrection(parseFloat(plato), parseFloat(temp)).toFixed(2) : ''}</span>
            </div>
        );
    }

    renderCarbonationBlock() {
        const { carbTemp, carbTarget, carbLiters, waterForSolutionML } = this.state;
        const sucroseSugar = calculateSugarAmount(
            parseFloat(carbLiters),
            parseFloat(carbTarget),
            waterForSolutionML === '' ? 1000 : parseFloat(waterForSolutionML),
            eSugarTypes.Sucrose
        );
        const glucoseSugar = calculateSugarAmount(
            parseFloat(carbLiters),
            parseFloat(carbTarget),
            waterForSolutionML === '' ? 1000 : parseFloat(waterForSolutionML),
            eSugarTypes.Glucose
        );
        return (
            <div className="mobile-calc-block">
                <div className="calc-title" style={{fontSize: '1.2em'}}>
                    Karbonisierung
                </div>
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
                    onWheel={this.handleWheel('carbTarget')}
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
                    placeholder="Klarwasser (1000ml)"
                    style={{marginBottom: 6}}
                />
                <span>Haushaltszucker (g): <b>{sucroseSugar > 0 ? Math.round(sucroseSugar) : ''}</b></span>
                <span>Traubenzucker (g): <b>{glucoseSugar > 0 ? Math.round(glucoseSugar) : ''}</b></span>
            </div>
        );
    }

    renderTerrillBlock() {
        const { terrillOgBrix, terrillFgBrix } = this.state;
        let terrillResult = '';
        if (terrillOgBrix !== '' && terrillFgBrix !== '') {
            const og = parseFloat(terrillOgBrix);
            const fg = parseFloat(terrillFgBrix);
            if (!isNaN(og) && !isNaN(fg)) {
                terrillResult = calculateFromRefractometer(og, fg).realExtractPlato.toFixed(2);
            }
        }
        return (
            <div className="mobile-calc-block">
                <div className="calc-title" style={{fontSize: '1.2em'}}>
                    Scheinbarer Restextrakt (Terrill-Korrektur)
                </div>
                <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={terrillOgBrix}
                    onChange={e => this.setTerrillOgBrix(e.target.value)}
                    placeholder="Stammwürze (Brix)"
                    style={{marginBottom: 6}}
                />
                <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={terrillFgBrix}
                    onChange={e => this.setTerrillFgBrix(e.target.value)}
                    placeholder="Restextrakt (Brix)"
                    style={{marginBottom: 6}}
                />
                <span>Scheinbarer Restextrakt (Brix, Terrill): <b>{terrillResult}</b></span>
            </div>
        );
    }

    render() {
        return (
            <div className="mobile-brewing-calc-container" style={{overflowY: 'auto', maxHeight: '100vh'}}>
                <h2>Bierbrau-Berechnungen</h2>
                {this.renderBrixToPlatoBlock()}
                {this.renderPlatoToBrixBlock()}
                {this.renderTemperatureCorrectionBlock()}
                {this.renderTerrillBlock()}
                {this.renderCarbonationBlock()}
            </div>
        );
    }
}

export default MobileBrewingCalculationsView;
