import React from 'react';
import {isUndefined} from 'lodash';
import {Beer} from "../../model/Beer";
import 'bootstrap/dist/css/bootstrap.min.css';
import {v4 as uuidv4} from 'uuid';
import '@fortawesome/fontawesome-free/css/all.css'; // Stile
import './Production.css'

import WaterControl, {WaterStatus} from "../../components/Controlls/WaterControll/WaterControl";
import Flame from "../../components/Flame/Flame";
import Gauge from "../../components/Controlls/Gauge/Gauge";
import {ToggleState} from "../../enums/eToggleState";
import {MashAgitatorStates} from "../../model/MashAgitator";
import QuantityPicker from '../../components/Controlls/QuantityPicker/QuantityPicker';
import {BrewingData} from "../../model/BrewingData";
import {mapBeerToBrewingData} from "../../utils/productionRecipe";

import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState} from "../../model/brewingStatus.types";
import {TimeFormatter} from "../../utils/TimeFormatter";


import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faRepeat} from '@fortawesome/free-solid-svg-icons';
import Switch from "react-switch";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {FinishedBrew} from "../../model/FinishedBrew";
import {eBrewState} from "../../enums/eBrewState";
import {BackendAvailable} from "../../reducers/productionReducer";
import {ProcessList} from "./ProcessList/ProcessList";
import { dataCollector } from '../../utils/DataCollector/dataCollector';
import {isBrewingProcessActive, isProcessActive} from "../../utils/brewingStatus/selectors";
import {getVesselContentType} from "../../utils/brewingStatus/vesselContent";
import {calculateHopSchedule, getDueHopAddition, HopAddition} from "./utils/hopSchedule";
import {getRemainingSecondsFromStatus, shouldCountdownLocally, tickRemainingSeconds} from "./utils/productionCountdown";
import {isAgitatorActive, isControllerAvailable as getIsControllerAvailable, isHeaterActive} from "./utils/productionStatus";
import {RecipeWaterFill, RecipeWaterFillStatus} from "./waterFill/recipeWaterFill.types";
import {completeWaterFill, createInitialRecipeWaterFillStatus, failWaterFill, markValveOpened, resetWaterFill, startWaterFill} from "./waterFill/recipeWaterFillState";
import {ProductionDialogs} from "./components/ProductionDialogs";
import {getDisplayedWaterLiters as selectDisplayedWaterLiters, getWaterLabel, getWaterTargetLiters, isRecipeWaterButtonDisabled as selectRecipeWaterButtonDisabled, isWaterFillingActive as selectWaterFillingActive, shouldIncludeSpargeAfterMashingOut as selectShouldIncludeSpargeAfterMashingOut, sanitizeLiters} from "./waterFill/recipeWaterFillSelectors";

export interface ProductionProps {
    selectedBeer?: Beer;
    temperature: number;
    currentAgitatorState: ToggleState;
    currentAgitatorSpeed: number;
    agitatorSpeed: number;
    agitatorIsRunning: ToggleState;
    getTemperatures: () => void;
    toggleAgitator: (agitatorState: MashAgitatorStates) => void;
    setAgitatorSpeed: (agitatorSpeed: number) => void;
    startWaterFilling: (liters: number) => void;
    isWaterFillingSuccessful: boolean;
    isToggleAgitatorSuccess: boolean;
    sendBrewingData: (brewingData: BrewingData) => void;
    brewingStatus?: BrewingStatus;
    startPolling: () => void;
    stopPolling: () => void;
    isBackenAvailable: BackendAvailable | boolean;
    waterStatus: WaterStatus;
    addFinishedBrew: (finishedBrew: FinishedBrew) => void;
    nextProcedureStep: () => void;
    isPollingRunning: boolean;
}

interface ProductionState {
    agitatorState: ToggleState;
    agitatorSpeed: number;
    heatingAndStirringSwitchState: boolean
    intervalSwitchState: boolean
    mainSwitchState: boolean
    waterSwitchState: boolean
    runningTime: number
    breakTime: number
    liters: number
    waterFillingError: boolean
    mainAgitatorError: boolean
    isWaterSwitchBlinking: boolean
    isMainSwitchBlinking: boolean
    hopSchedule: HopAddition[]
    hopName: string
    showHopsDialog: boolean
    showFinishDialog: boolean
    brewingFinished: boolean
    indexOfCurrentStep: number;
    brewingIsRunning: boolean;
    announcedHopTimes: number[];
    recipeWaterFill: RecipeWaterFillStatus;
    displayedRemainingSeconds: number | undefined;
}

export class Production extends React.Component<ProductionProps, ProductionState> {
    private isBrewingStartRequestPending = false;
    private readonly MAX_AGITATOR_SPEED = 40;
    private readonly MAX_WATER_LEVEL = 70;
    private readonly MAX_BREAK_TIME = 10;
    private readonly MAX_RUNNING_TIME = 10;
    private remainingTimeInterval: NodeJS.Timeout | null = null;
    private errorTimeouts: NodeJS.Timeout[] = [];
    private isMountedComponent = false;

    constructor(props: ProductionProps) {
        super(props);
        this.state = {
            agitatorState: ToggleState.OFF,
            agitatorSpeed: 5,
            heatingAndStirringSwitchState: false,
            intervalSwitchState: false,
            mainSwitchState: false,
            waterSwitchState: false,
            runningTime: 0,
            breakTime: 0,
            liters: 0,
            waterFillingError: false,
            mainAgitatorError: false,
            isWaterSwitchBlinking: false,
            isMainSwitchBlinking: false,
            hopSchedule: [],
            hopName: '',
            showHopsDialog: false,
            showFinishDialog: false,
            brewingFinished: false,
            indexOfCurrentStep: 0,
            brewingIsRunning: false,
            announcedHopTimes: [],
            recipeWaterFill: createInitialRecipeWaterFillStatus(),
            displayedRemainingSeconds: undefined
        }
    }

    componentDidMount() {
        this.isMountedComponent = true;
        const {getTemperatures, selectedBeer} = this.props;
        if (!isUndefined(selectedBeer)) {
            this.calculateTheHopTimes();
        }
        getTemperatures();
        this.syncRemainingTimeFromStatus();
        this.remainingTimeInterval = setInterval(this.tickRemainingTime, 1000);
    }

    componentWillUnmount() {
        this.isMountedComponent = false;
        if (this.remainingTimeInterval !== null) {
            clearInterval(this.remainingTimeInterval);
            this.remainingTimeInterval = null;
        }
        this.errorTimeouts.forEach(clearTimeout);
        this.errorTimeouts = [];
    }


    componentDidUpdate(prevProps: Readonly<ProductionProps>, prevState: Readonly<ProductionState>) {
        const {toggleAgitator, brewingStatus,isToggleAgitatorSuccess,isWaterFillingSuccessful, waterStatus} = this.props;
        const {intervalSwitchState, mainSwitchState, waterSwitchState,heatingAndStirringSwitchState,showHopsDialog,showFinishDialog, indexOfCurrentStep} = this.state;


        if (prevProps.brewingStatus !== brewingStatus) {
            this.syncRemainingTimeFromStatus();
        }

        if (prevProps.selectedBeer !== this.props.selectedBeer) {
            this.resetRecipeWaterFillState({indexOfCurrentStep: 0});
        }

        const aBrewingProcessChangedToInactive = prevProps.brewingStatus?.process?.state !== brewingStatus?.process?.state && brewingStatus?.process?.state !== ProcessState.ACTIVE;
        if (aBrewingProcessChangedToInactive) {
            this.resetRecipeWaterFillState();
        }

        const aStartRequestCompleted = prevProps.isPollingRunning && !this.props.isPollingRunning;
        if ((this.state.brewingIsRunning || this.isBrewingStartRequestPending) && (aStartRequestCompleted || aBrewingProcessChangedToInactive)) {
            this.isBrewingStartRequestPending = false;
            this.setState({brewingIsRunning: false});
        }

        if (this.state.recipeWaterFill.activeFillType !== undefined && waterStatus?.openClose === true && !prevProps.waterStatus?.openClose) {
            this.setState((prevState) => ({recipeWaterFill: markValveOpened(prevState.recipeWaterFill)}));
        }

        if (prevProps.waterStatus?.openClose === true && waterStatus?.openClose === false) {
            this.completePendingRecipeWaterFill(prevProps.waterStatus?.filledLiters);
        }

        if (!this.state.recipeWaterFill.isSpargeIncluded && this.shouldIncludeSpargeAfterMashingOut(prevProps.brewingStatus, brewingStatus)) {
            this.setState((prevState) => ({recipeWaterFill: {...prevState.recipeWaterFill, isSpargeIncluded: true}}));
        }


        if (!isToggleAgitatorSuccess && mainSwitchState) {
            const timeoutId = setTimeout(() => {
                if (this.isMountedComponent) {
                    this.setState({mainSwitchState: false, mainAgitatorError: true});
                }
            }, 300);
            this.errorTimeouts.push(timeoutId);
        }

        if (prevState.intervalSwitchState !== intervalSwitchState && mainSwitchState) {
            toggleAgitator(this.setAgitatorStates(mainSwitchState));
        }

        if (prevState.heatingAndStirringSwitchState !== heatingAndStirringSwitchState && mainSwitchState) {
            toggleAgitator(this.setAgitatorStates(mainSwitchState));
        }

        if (!isWaterFillingSuccessful && waterSwitchState) {
            const timeoutId = setTimeout(() => {
                if (this.isMountedComponent) {
                    this.failActiveRecipeWaterFill();
                }
            }, 300);
            this.errorTimeouts.push(timeoutId);
        }
        if (typeof brewingStatus?.currentStep?.index === "number" && brewingStatus.currentStep.index !== prevProps?.brewingStatus?.currentStep?.index) {
            this.setState({indexOfCurrentStep: brewingStatus.currentStep.index});
        }


        if (brewingStatus?.currentStep?.phase === ProcessPhase.COOKING && !showHopsDialog) {
            this.checkForHopAddition()
        }
        if (brewingStatus?.process?.state === ProcessState.FINISHED && !showFinishDialog && !this.state.brewingFinished)
        {
            this.setState({showFinishDialog: true})
        }

    }


    syncRemainingTimeFromStatus = (): void => {
        const remainingSeconds = this.getRemainingSecondsFromStatus();
        if (remainingSeconds !== this.state.displayedRemainingSeconds) {
            this.setState({displayedRemainingSeconds: remainingSeconds});
        }
    }

    tickRemainingTime = (): void => {
        const {brewingStatus} = this.props;
        if (!this.shouldCountdownLocally(brewingStatus)) {
            return;
        }
        this.setState((prevState) => {
            if (typeof prevState.displayedRemainingSeconds !== 'number') {
                return null;
            }
            return {displayedRemainingSeconds: tickRemainingSeconds(prevState.displayedRemainingSeconds)};
        });
    }

    shouldCountdownLocally = (aBrewingStatus?: BrewingStatus): boolean => {
        return shouldCountdownLocally(aBrewingStatus);
    }

    getRemainingSecondsFromStatus = (): number | undefined => {
        return getRemainingSecondsFromStatus(this.props.brewingStatus);
    }
    checkForHopAddition() {
        const {hopSchedule, announcedHopTimes} = this.state;
        const aCookingElapsed = Math.floor(this.props.brewingStatus?.currentStep?.elapsedTime ?? 0);
        const dueAddition = getDueHopAddition(hopSchedule, aCookingElapsed, announcedHopTimes);
        if (dueAddition === undefined) {
            return;
        }
        this.setState((aPrevState) => ({
            showHopsDialog: true,
            hopName: dueAddition.names.join(', '),
            announcedHopTimes: [...aPrevState.announcedHopTimes, dueAddition.timeSeconds]
        }));
    }

    calculateTheHopTimes() {
        const {selectedBeer} = this.props;
        this.setState({hopSchedule: selectedBeer ? calculateHopSchedule(selectedBeer) : [], announcedHopTimes: []});
    }

    setAgitatorStates(mainSwitchState: boolean) {
        const {agitatorSpeed, runningTime, breakTime, intervalSwitchState, heatingAndStirringSwitchState} = this.state;
        const mashAgitatorStates: MashAgitatorStates = {
            isTurnOn: mainSwitchState,
            rotationsPerMinute: agitatorSpeed,
            runningTime: runningTime,
            breakTime: breakTime,
            isIntervalTurnOn: intervalSwitchState,
            isHeatingAndStirringTurnOn: heatingAndStirringSwitchState,
        };
        return mashAgitatorStates;
    }

    toggleAgitator = () => {
        const {toggleAgitator} = this.props;
        const {mainSwitchState} = this.state;
        if (!mainSwitchState) {
            toggleAgitator(this.setAgitatorStates(true));
            this.setState({mainSwitchState: true});
        } else {
            toggleAgitator(this.setAgitatorStates(false));
            this.setState({mainSwitchState: false});
        }
    }

    toggleInterval = () => {
        const {intervalSwitchState, mainSwitchState, agitatorSpeed} = this.state;

        if (!intervalSwitchState) {
            this.setState({intervalSwitchState: true});

        } else {
            this.setState({intervalSwitchState: false});
        }
    }
    toggleHeatingAndStirring = () => {
        const {heatingAndStirringSwitchState} = this.state;
        if (!heatingAndStirringSwitchState) {
            this.setState({heatingAndStirringSwitchState: true});
        } else {
            this.setState({heatingAndStirringSwitchState: false});
        }
    }
    onAgitatorSpeedChange = (value: number) => {
        const {setAgitatorSpeed} = this.props
        this.setState({agitatorSpeed: value});
        setAgitatorSpeed(value);
    }

    onIntervalChangeBreakTime = (value: number) => {
        this.setState({breakTime: value});
    }

    onIntervalChangeRunningTime = (value: number) => {
        this.setState({runningTime: value});
    }

    onSetWaterChangeQuantity = (value: number) => {
        this.setState({liters: value});
    }

    resetRecipeWaterFillState = (aAdditionalState?: Pick<ProductionState, 'indexOfCurrentStep'>): void => {
        const resetState = {recipeWaterFill: resetWaterFill()};
        this.setState(aAdditionalState === undefined ? resetState : {...resetState, ...aAdditionalState});
    }

    completePendingRecipeWaterFill = (aPreviousFilledLiters?: number): void => {
        const {recipeWaterFill} = this.state;
        if ((!recipeWaterFill.activeFillWasOpened && aPreviousFilledLiters === undefined) || recipeWaterFill.activeFillType === undefined) {
            this.setState((prevState) => ({waterSwitchState: false, recipeWaterFill: {...prevState.recipeWaterFill, activeFillWasOpened: false}}));
            return;
        }
        const currentFilledLiters = this.getSafeWaterStatusFilledLiters();
        const previousFilledLiters = Number(aPreviousFilledLiters);
        const completedLiters = currentFilledLiters > 0 || !Number.isFinite(previousFilledLiters) ? currentFilledLiters : previousFilledLiters;
        this.setState((prevState) => ({
            waterSwitchState: false,
            recipeWaterFill: completeWaterFill(prevState.recipeWaterFill, completedLiters)
        }));
    }

    failActiveRecipeWaterFill = (): void => {
        this.setState((prevState) => ({
            waterSwitchState: false,
            waterFillingError: true,
            recipeWaterFill: failWaterFill(prevState.recipeWaterFill)
        }));
    }

    getRecipeWaterVolume = (aRecipeWaterFill: RecipeWaterFill): number | undefined => {
        const {selectedBeer} = this.props;
        if (isUndefined(selectedBeer)) {
            return undefined;
        }
        const volume = aRecipeWaterFill === 'mash' ? Number(selectedBeer.mashVolume) : Number(selectedBeer.spargeVolume);
        return Number.isFinite(volume) && volume > 0 ? volume : undefined;
    }

    isWaterFillingActive = (): boolean => {
        return selectWaterFillingActive(this.state.recipeWaterFill, this.state.waterSwitchState, this.props.waterStatus);
    }

    isControllerAvailable = (): boolean => {
        return getIsControllerAvailable(this.props.isBackenAvailable);
    }

    startRecipeWaterFilling = (aRecipeWaterFill: RecipeWaterFill): void => {
        const volume = this.getRecipeWaterVolume(aRecipeWaterFill);
        if (volume === undefined || this.isRecipeWaterButtonDisabled(aRecipeWaterFill)) {
            return;
        }
        this.setState((prevState) => ({
            waterSwitchState: true,
            liters: volume,
            waterFillingError: false,
            recipeWaterFill: startWaterFill(prevState.recipeWaterFill, aRecipeWaterFill)
        }));
        this.props.startWaterFilling(volume);
    }

    getSafeWaterStatusFilledLiters = (): number => {
        return sanitizeLiters(this.props.waterStatus?.filledLiters);
    }

    getCurrentWaterFillTargetLiters = (): number => {
        return getWaterTargetLiters(this.state.recipeWaterFill, this.state.liters, this.props.waterStatus);
    }

    getDisplayedWaterLiters = (): number => {
        return selectDisplayedWaterLiters(this.state.recipeWaterFill, this.props.waterStatus);
    }

    getDisplayedWaterLabel = (): string => {
        return getWaterLabel(this.state.recipeWaterFill);
    }

    shouldIncludeSpargeAfterMashingOut = (aPreviousStatus?: BrewingStatus, aCurrentStatus?: BrewingStatus): boolean => {
        return selectShouldIncludeSpargeAfterMashingOut(this.state.recipeWaterFill, aPreviousStatus, aCurrentStatus);
    }

    isRecipeWaterButtonDisabled = (aRecipeWaterFill: RecipeWaterFill): boolean => {
        const volume = this.getRecipeWaterVolume(aRecipeWaterFill);
        return selectRecipeWaterButtonDisabled(aRecipeWaterFill, this.state.recipeWaterFill, volume, this.isControllerAvailable(), this.isWaterFillingActive());
    }

    getRecipeWaterButtonLabel = (aRecipeWaterFill: RecipeWaterFill): string => {
        if (aRecipeWaterFill === 'sparge' && this.state.recipeWaterFill.spargeState === 'COMPLETED') {
            return '✓ Nachguss fertig';
        }
        if (aRecipeWaterFill === 'mash' && this.state.recipeWaterFill.mashState === 'COMPLETED') {
            return '✓ Hauptguss fertig';
        }
        return aRecipeWaterFill === 'sparge' ? 'Nachguss einfüllen' : 'Hauptguss einfüllen';
    }

    startMashWaterFilling = (): void => {
        this.startRecipeWaterFilling('mash');
    }

    startSpargeWaterFilling = (): void => {
        this.startRecipeWaterFilling('sparge');
    }

    toggleWaterSwitchState = () => {
        const {waterSwitchState, liters,} = this.state;
        const {startWaterFilling} = this.props;
        if (!waterSwitchState) {
            this.setState({waterSwitchState: true});
            startWaterFilling(liters);
        } else {
            this.setState({waterSwitchState: false});
        }
    }
    isControlBrewingStartAvailable = (): boolean => {
        const {brewingStatus, isPollingRunning} = this.props;
        return !isPollingRunning && !isProcessActive(brewingStatus);
    }

    isStartButtonDisabled = (): boolean => {
        const {selectedBeer} = this.props;
        return isUndefined(selectedBeer) || this.state.brewingIsRunning || this.isBrewingStartRequestPending || !this.isControlBrewingStartAvailable();
    }

    startBrewing = (): void => {
        const {selectedBeer, sendBrewingData} = this.props;
        if (selectedBeer === undefined || this.isStartButtonDisabled()) {
            return;
        }
        this.resetRecipeWaterFillState();
        this.isBrewingStartRequestPending = true;
        dataCollector.reset();
        const result = mapBeerToBrewingData(selectedBeer);
        if (!result.ok || !result.brewingData) {
            this.isBrewingStartRequestPending = false;
            return;
        }
        this.setState({brewingIsRunning: true});
        sendBrewingData(result.brewingData);
    }

    startPolling = () => {
        const {startPolling} = this.props;
        startPolling();
    }

    isNextProcedureStepAvailable = (): boolean => {
        return isBrewingProcessActive(this.props.brewingStatus);
    }

    handleNextProcedureStep = (): void => {
        if (!this.isNextProcedureStepAvailable()) {
            return;
        }
        this.props.nextProcedureStep();
    }

    formatTime = (time: number) => {
        return TimeFormatter.formatSecondsToHMS(time);
    }

    renderFlames() {
        const {brewingStatus} = this.props;

        return (
            <div className='Flame'>
              {isHeaterActive(brewingStatus) && (
                    <div className="flame-strip" aria-label="Heizung aktiv">
                        <Flame/>
                        <Flame/>
                        <Flame/>
                    </div>
              )}
            </div>
        );
    }

    renderInfo() {
        return <div className="Info Info--empty" aria-label="Freier Produktionsbereich" />;
    }

    renderTemperature() {
        const {brewingStatus, temperature} = this.props;
        let value: number;
        if (brewingStatus?.temperature?.current === undefined || Number(brewingStatus?.temperature?.current) === 0) {
            value = temperature;
        } else {
            value = isNaN(Number(brewingStatus?.temperature?.current)) ? 0 : Number(brewingStatus?.temperature?.current);
        }
        const targetValue = isNaN(Number(brewingStatus?.temperature?.target)) ? 0 : Number(brewingStatus?.temperature?.target);
        return (<div className="Temp">
            <Gauge showAreas={true} value={value} targetValue={targetValue}
                   height={220}
                   offset={1} minValue={0} maxValue={100} label={"°C"}/>
        </div>);
    }

    renderSettings() {
        const {
            mainSwitchState,
            intervalSwitchState,
            heatingAndStirringSwitchState,
            waterSwitchState
        } = this.state;
        const mashWaterDisabled = this.isRecipeWaterButtonDisabled('mash');
        const spargeWaterDisabled = this.isRecipeWaterButtonDisabled('sparge');
        return (
            <div className="Settings">
                <h3>Settings</h3>
                <div className="settingsRow">
                    <div className="leftAligned" id="formControl">
                      <label>
                        <span>Hauptschalter Rührwerk</span>
                        </label>
                        <Switch onChange={this.toggleAgitator} checked={mainSwitchState} height={40} width={100} />
                        <label>
                        <span>Interval</span>
                        </label>
                        <Switch onChange={this.toggleInterval} checked={intervalSwitchState} height={40} width={100}/>
                        <label>
                        <span>Heizphase</span>
                        </label>
                        <Switch onChange={this.toggleHeatingAndStirring} checked={heatingAndStirringSwitchState} height={40} width={100} />
                    </div>
                    <div className="rightAligned" id="quantityPicker">
                        <QuantityPicker initialValue={1} min={1} max={this.MAX_AGITATOR_SPEED} onChange={this.onAgitatorSpeedChange}
                                        isDisabled={false} label="Geschwindigkeit" labelPosition="above"/>
                        <div className="quantityPickerItem">

                        </div>
                        <QuantityPicker initialValue={1} min={1} max={this.MAX_BREAK_TIME} onChange={this.onIntervalChangeBreakTime}
                                        isDisabled={false} label="Pausenzeit" labelPosition="above"/>
                        <div className="quantityPickerItem">

                        </div>
                        <QuantityPicker initialValue={1} min={1} max={this.MAX_RUNNING_TIME} onChange={this.onIntervalChangeRunningTime}
                                        isDisabled={false} label="Laufzeit" labelPosition="above"/>
                    </div>
                </div>

                <div className="settingsRowWater">
                    <div className="leftAligned">
                    <label>
                        <span>Wasser</span>
                    </label>
                    <Switch onChange={this.toggleWaterSwitchState} checked={waterSwitchState} height={40} width={100} />
                    </div>
                    <div className="rightAligned">
                        <QuantityPicker initialValue={1} min={1} max={this.MAX_WATER_LEVEL} onChange={this.onSetWaterChangeQuantity}
                                        isDisabled={waterSwitchState} label="Liter" labelPosition="above"/>
                    </div>


                </div>
                <div className="recipeWaterButtons">
                    <button className="recipeWaterBtn" disabled={spargeWaterDisabled} onClick={this.startSpargeWaterFilling}>{this.getRecipeWaterButtonLabel('sparge')}</button>
                    <button className="recipeWaterBtn" disabled={mashWaterDisabled} onClick={this.startMashWaterFilling}>{this.getRecipeWaterButtonLabel('mash')}</button>
                </div>
                <div className="startBtnDiv">
                    <button className="startBtn" disabled={this.isStartButtonDisabled()} onClick={this.startBrewing}>Start</button>
                </div>
                <div className="startPollingBtnDiv">
                    <button className="startPollingBtn" disabled={this.props.isPollingRunning} onClick={this.startPolling}>
                        <FontAwesomeIcon icon={faRepeat as IconProp} />
                    </button>
                </div>
            </div>);
    }

    renderAgitator() {
        const infinitySymbol = '\u221E';
        const {currentAgitatorSpeed, agitatorSpeed} = this.props;
        // Werte absichern
        const gaugeValue = isNaN(Number(agitatorSpeed)) ? 0 : Number(agitatorSpeed);
        const gaugeTarget = isNaN(Number(currentAgitatorSpeed)) ? 0 : Number(currentAgitatorSpeed);
        const currentFillLiters = this.getDisplayedWaterLiters();
        const currentTargetLiters = this.getCurrentWaterFillTargetLiters();
        return (<div className="Agitator">

            <div className="GaugeContainer">
                <Gauge showAreas={true} value={gaugeValue} targetValue={gaugeTarget} height={200} offset={1}
                       minValue={0}
                       maxValue={this.MAX_AGITATOR_SPEED} label={infinitySymbol}/>
            </div>
            <div className="GaugeContainer">
                <Gauge showAreas={false} value={currentFillLiters} targetValue={currentTargetLiters} height={200}
                       offset={0.5} minValue={0} maxValue={this.MAX_WATER_LEVEL} label={"Liter"}/>
            </div>
        </div>);
    }

    renderWater() {
        const {currentAgitatorSpeed, brewingStatus} = this.props;
        const displayedWaterLiters = this.getDisplayedWaterLiters();

        return (

            <div className="Water">
                <WaterControl filledLiters={displayedWaterLiters} label={this.getDisplayedWaterLabel()} agitatorSpeed={currentAgitatorSpeed}
                              agitatorState={isAgitatorActive(brewingStatus)}
                              contentType={getVesselContentType(brewingStatus)}></WaterControl>

            </div>);
    }

    renderHeader() {
        const {selectedBeer} = this.props;

        return (<div className="HeaderProduction">
            <div className='HeaderText'>
                {selectedBeer?.name}
            </div>
        </div>);
    }

    confirmHopDialog = () => {
        this.setState({showHopsDialog: false});
    }


    confirmFinishDialog = async () => {
        const { stopPolling, selectedBeer, addFinishedBrew } = this.props;
        this.setState({ showFinishDialog: false, brewingFinished: true });
        stopPolling();
        // Messdaten als Blob holen
        const jsonString = dataCollector.getAllDataAsJSONString();
        // FinishedBrew erzeugen und speichern
        if (selectedBeer) {
            const finishedBrew : FinishedBrew = {
                id: uuidv4(),
                name: selectedBeer.name || 'Unknown Beer',
                liters: 0,
                originalwort:  0,
                residual_extract:  0, // Default value added
                note: '', // Default value added
                startDate: new Date().toISOString().slice(0, 10),
                beer_id: selectedBeer.id.toString(), // Assuming beer_id is a string
                active: true,
                state: eBrewState.FERMENTATION,
                brewValues: jsonString // Attach measurement data
            };
            addFinishedBrew(finishedBrew);
        }
    };
    renderProcessList() {
        const { selectedBeer, brewingStatus } = this.props;
        if (selectedBeer === undefined) {
            return null;
        }
        return (
            <ProcessList selectedBeer={selectedBeer} currentStepIndex={brewingStatus?.currentStep?.index ?? 0} currentStep={brewingStatus?.currentStep} brewingStatus={brewingStatus} remainingSeconds={this.state.displayedRemainingSeconds} onNextStep={this.handleNextProcedureStep} isNextStepDisabled={!this.isNextProcedureStepAvailable()} />
        );
    }


    render() {
        const {showHopsDialog, showFinishDialog} = this.state;
        return (
            <div className="containerProduction ">
                <ProductionDialogs
                    showHopsDialog={showHopsDialog}
                    hopName={this.state.hopName}
                    showFinishDialog={showFinishDialog}
                    onConfirmHop={this.confirmHopDialog}
                    onConfirmFinish={this.confirmFinishDialog}
                />

                {this.renderHeader()}
                <div className="Left">
                    {this.renderWater()}
                    {this.renderFlames()}
                </div>
                <div className="List">
                    {this.renderProcessList()}  {/* Hier deine List-Renderfunktion */}
                </div>
                <div className="Meters">
                    {this.renderAgitator()}
                    {this.renderTemperature()}
                </div>
                {this.renderSettings()}
                {this.renderInfo()}


            </div>
        )
    }


}
