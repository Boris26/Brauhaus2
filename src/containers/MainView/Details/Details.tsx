import React from 'react';
import {Tab, Tabs} from '@mui/material';
import './Details.css';
import {Beer, FermentationSteps} from '../../../model/Beer';
import {BeerRecipeScaler, scalingValues} from '../../../utils/BeerScaler/ScalingBeerRecipe';

interface DetailsProps {
    selectedBeer?: Beer;
    updateRecipeScaling: (values: scalingValues) => void;
    getMalt?: (isFetching: boolean) => void;
    getHop?: (isFetching: boolean) => void;
    getYeast?: (isFetching: boolean) => void;
    malts?: Array<{id: string | number; name: string}>;
    hops?: Array<{id: string | number; name: string}>;
    yeasts?: Array<{id: string | number; name: string}>;
}

type RecipeTab = 'general' | 'mashing' | 'malts' | 'boiling' | 'fermentation' | 'water';
interface DetailsState { batchSize: number; brewhouseEfficiency: number; activeTab: RecipeTab; }

const tabs: Array<{value: RecipeTab; label: string}> = [
    {value: 'general', label: 'Allgemein'}, {value: 'mashing', label: 'Maischen'},
    {value: 'malts', label: 'Schüttung'}, {value: 'boiling', label: 'Würzekochen'},
    {value: 'fermentation', label: 'Gärung & Reifung'}, {value: 'water', label: 'Wasser'},
];

export class Details extends React.Component<DetailsProps, DetailsState> {
    ingredientName = (items: Array<{id: string | number; name: string}> | undefined, id: string | number, kind: string, recipeName?: string) =>
        recipeName?.trim() || items?.find(item => String(item.id) === String(id))?.name?.trim() || `Unbekannte ${kind} (ID ${id})`;

    constructor(props: DetailsProps) {
        super(props);
        this.state = {batchSize: BeerRecipeScaler.getReferenceVolume(props.selectedBeer), brewhouseEfficiency: BeerRecipeScaler.DEFAULT_PLANNED_BREWHOUSE_EFFICIENCY, activeTab: 'general'};
    }

    componentDidMount() {
        this.props.getMalt?.(true); this.props.getHop?.(true); this.props.getYeast?.(true); this.updateRecipe();
    }

    componentDidUpdate(prevProps: Readonly<DetailsProps>, prevState: Readonly<DetailsState>) {
        const {batchSize, brewhouseEfficiency} = this.state;
        const {selectedBeer} = this.props;
        if (selectedBeer && selectedBeer.id !== prevProps.selectedBeer?.id) {
            this.setState({batchSize: BeerRecipeScaler.getReferenceVolume(selectedBeer), brewhouseEfficiency: BeerRecipeScaler.DEFAULT_PLANNED_BREWHOUSE_EFFICIENCY});
        }
        if (batchSize !== prevState.batchSize || brewhouseEfficiency !== prevState.brewhouseEfficiency) this.updateRecipe();
    }

    updateRecipe() {
        const {selectedBeer} = this.props;
        if (selectedBeer) this.props.updateRecipeScaling({beer: selectedBeer, volume: this.state.batchSize, brewhouseEfficiency: this.state.brewhouseEfficiency});
    }

    renderRecipeHeader() {
        const beer = this.props.selectedBeer;
        if (!beer) return null;
        return <header className="recipe-detail-header">
            <div className="recipe-detail-heading"><h1>{beer.name}</h1><p>{beer.type}</p></div>
            <div className="recipe-metrics" aria-label="Rezeptkennzahlen">
                <span>{beer.alcohol} % <small>Alkohol</small></span><span>{beer.color} EBC</span>
                <span>{beer.bitterness} IBU</span><span>{beer.originalwort} °P</span>
            </div>
        </header>;
    }

    renderBatchSettings() {
        const beer = this.props.selectedBeer;
        if (!beer) return null;
        const hasReference = Boolean(beer.referenceVolume && beer.referenceVolume > 0 && beer.referenceBrewhouseEfficiency && beer.referenceBrewhouseEfficiency > 0);
        return <section className="recipe-settings" aria-label="Rezeptskalierung"><div className="recipe-settings-inner">
            <label className="recipe-setting"><span>Ausschlagmenge:</span><span className="recipe-setting-control">
                <select value={this.state.batchSize} onChange={event => this.setState({batchSize: Number(event.target.value)})} className="brauhaus-form-control">
                    {[10, 20, 30, 40, 50].map(volume => <option key={volume} value={volume}>{volume}</option>)}
                </select><span>Liter</span>
            </span></label>
            <label className="recipe-setting"><span>Sudhausausbeute:</span><span className="recipe-setting-control">
                <input type="number" min={40} max={100} step={1} value={this.state.brewhouseEfficiency} onChange={event => this.setState({brewhouseEfficiency: Number(event.target.value)})} className="brauhaus-form-control brewhouse-efficiency-input"/><span>%</span>
            </span></label>
            {hasReference && <span className="recipe-reference">Rezeptbasis: {beer.referenceVolume} l · {beer.referenceBrewhouseEfficiency} % SHA</span>}
        </div></section>;
    }

    renderGeneralData() {
        const beer = this.props.selectedBeer;
        if (!beer) return null;
        const values = [['Name', beer.name], ['Sorte', beer.type], ['Bitterkeit', `${beer.bitterness} IBU`], ['Farbe', `${beer.color} EBC`], ['Alkohol', `${beer.alcohol} %`], ['Stammwürze', `${beer.originalwort} °P`]];
        return <section className="recipe-section recipe-card"><h2>Allgemeine Daten</h2><dl className="recipe-data-grid">
            {values.map(([label, value]) => <div className="recipe-data-item" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl></section>;
    }

    mashingStepLabel(step: FermentationSteps) {
        if (step.procedureType === 'DECOCTION') return 'Dekoktion';
        return ({MASH_IN: 'Einmaischen', MASH_OUT: 'Abmaischen', RAST: 'Rast', REST: 'Rast'} as Record<string, string>)[step.type] || step.type;
    }

    renderMashing() {
        const steps = this.props.selectedBeer?.fermentation || [];
        return <section className="recipe-section recipe-card recipe-card--mashing"><h2>Maischplan</h2>{steps.length ? <ol className="mash-step-grid">{steps.map((step, index) =>
            <li key={step.stepId || index} className="mash-step-card"><div className="mash-step-heading"><span className="mash-step-number" aria-hidden="true">{index + 1}</span>
                <strong>{this.mashingStepLabel(step)}</strong></div><div className="process-values">
                    {step.procedureType !== 'DECOCTION' && step.temperature != null && <span>{step.temperature} °C</span>}{step.procedureType !== 'DECOCTION' && step.time != null && <span>{step.time} min</span>}
                    {step.executionMode === 'CONFIRMATION_HOLD' && <span>Bis Bestätigung</span>}
                </div></li>)}</ol> : <p className="recipe-empty">Keine Maischschritte hinterlegt.</p>}</section>;
    }

    renderMalts() {
        const malts = this.props.selectedBeer?.malts || [];
        return <section className="recipe-section recipe-card"><h2>Schüttung</h2>{malts.length ? <ul className="ingredient-list">{malts.map((malt, index) =>
            <li key={`${malt.id}-${index}`}><strong>{this.ingredientName(this.props.malts, malt.id, 'Zutat', malt.name)}</strong><span>{malt.quantity} g</span></li>)}</ul> : <p className="recipe-empty">Keine Malze hinterlegt.</p>}</section>;
    }

    renderBoiling() {
        const beer = this.props.selectedBeer;
        if (!beer) return null;
        const hops = beer.wortBoiling?.hops || [];
        return <section className="recipe-section recipe-card"><h2>Würzekochen</h2><dl className="recipe-data-grid recipe-data-grid--compact">
            <div className="recipe-data-item"><dt>Kochdauer</dt><dd>{beer.cookingTime} min</dd></div><div className="recipe-data-item"><dt>Zieltemperatur</dt><dd>{beer.cookingTemperatur} °C</dd></div>
        </dl><div className="recipe-subsection"><h3>Hopfengaben</h3>{hops.length ? <ul className="ingredient-list">{hops.map((hop, index) => <li key={`${hop.id}-${index}`}>
            <strong>{this.ingredientName(this.props.hops, hop.id, 'Zutat', hop.name)}</strong><span>{[`${hop.quantity} g`, hop.additionTime != null ? `${hop.additionTime} min` : undefined, hop.usage].filter(Boolean).join(' · ')}</span>
        </li>)}</ul> : <p className="recipe-empty">Keine Hopfengaben hinterlegt.</p>}</div></section>;
    }

    renderFermentationMaturation() {
        const fm = this.props.selectedBeer?.fermentationMaturation;
        if (!fm) return null;
        const yeasts = Array.isArray(fm.yeast) ? fm.yeast : [];
        return <section className="recipe-section recipe-card"><h2>Gärung &amp; Reifung</h2><dl className="recipe-data-grid recipe-data-grid--compact">
            <div className="recipe-data-item"><dt>Gärtemperatur</dt><dd>{fm.fermentationTemperature != null ? `${fm.fermentationTemperature} °C` : '—'}</dd></div><div className="recipe-data-item"><dt>Karbonisierung</dt><dd>{fm.carbonation ?? '—'}</dd></div>
        </dl><div className="recipe-subsection"><h3>Hefe</h3>{yeasts.length ? <ul className="ingredient-list">{yeasts.map((yeast, index) => <li key={`${yeast.id}-${index}`}>
            <strong>{this.ingredientName(this.props.yeasts, yeast.id, 'Hefe', yeast.name)}</strong><span>{yeast.quantity}</span>
        </li>)}</ul> : <p className="recipe-empty">Keine Hefe hinterlegt.</p>}</div></section>;
    }

    renderWater() {
        const beer = this.props.selectedBeer;
        if (!beer) return null;
        return <section className="recipe-section recipe-card"><h2>Wasser</h2><dl className="recipe-data-grid recipe-data-grid--compact">
            <div className="recipe-data-item"><dt>Hauptguss</dt><dd>{beer.mashVolume} l</dd></div><div className="recipe-data-item"><dt>Nachguss</dt><dd>{beer.spargeVolume} l</dd></div>
        </dl></section>;
    }

    renderActiveTab() {
        switch (this.state.activeTab) {
            case 'mashing': return this.renderMashing(); case 'malts': return this.renderMalts(); case 'boiling': return this.renderBoiling();
            case 'fermentation': return this.renderFermentationMaturation(); case 'water': return this.renderWater(); default: return this.renderGeneralData();
        }
    }

    render() {
        if (!this.props.selectedBeer) return null;
        return <article className="detailsContainer">{this.renderRecipeHeader()}{this.renderBatchSettings()}
            <Tabs value={this.state.activeTab} onChange={(_event, value: RecipeTab) => this.setState({activeTab: value})} variant="scrollable" scrollButtons="auto" className="recipe-tabs" aria-label="Rezeptbereiche">
                {tabs.map(tab => <Tab key={tab.value} value={tab.value} label={tab.label}/>)}
            </Tabs>
            <div className="recipe-tab-content" role="tabpanel">{this.renderActiveTab()}</div>
        </article>;
    }
}
