import React from 'react';
import _, {isUndefined} from 'lodash';
import {Beer} from "../../model/Beer";
import {connect} from "react-redux";
import 'bootstrap/dist/css/bootstrap.min.css';
import {v4 as uuidv4} from 'uuid';
import '@fortawesome/fontawesome-free/css/all.css'; // Stile
import './Production.css'
import Timeline, {TimelineData} from "./Timeline/Timeline";
import WaterControl, {WaterStatus} from "../../components/Controlls/WaterControll/WaterControl";
import Flame from "../../components/Flame/Flame";
import {BeerActions, ProductionActions} from "../../actions/actions";
import Gauge from "../../components/Controlls/Gauge/Gauge";
import {ToggleState} from "../../enums/eToggleState";
import {MashAgitatorStates} from "../../model/MashAgitator";
import QuantityPicker from '../../components/Controlls/QuantityPicker/QuantityPicker';
import {BrewingData} from "../../model/BrewingData";
import {mapBeerToBrewingData} from "../../utils/productionRecipe";
import {HeatingStates} from "../../model/BrewingStatus";
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from "../../model/brewingStatus.types";
import {TimeFormatter} from "../../utils/TimeFormatter";
import ModalDialog, {DialogType} from "../../components/ModalDialog/ModalDialog";
import {ProgressBar} from "react-bootstrap";
import {MashingType} from "../../enums/eMashingType";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faRepeat} from '@fortawesome/free-solid-svg-icons';
import Switch from "react-switch";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {FinishedBrew} from "../../model/FinishedBrew";
import {eBrewState} from "../../enums/eBrewState";
import {BackendAvailable} from "../../reducers/productionReducer";
import {ProcessList, createProcessSteps} from "./ProcessList/ProcessList";
import { dataCollector } from '../../utils/DataCollector/dataCollector';
import {getBrewingStatusLabel, isBrewingProcessActive, isProcessActive} from "../../utils/brewingStatus/selectors";
import {getVesselContentType} from "../../utils/brewingStatus/vesselContent";

export interface ProductionProps {
    selectedBeer: Beer;
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

type RecipeWaterFill = 'mash' | 'sparge';
type WaterFillType = 'SPARGE' | 'MASH';
type WaterFillState = 'IDLE' | 'FILLING' | 'COMPLETED' | 'ERROR';
type RecipeWaterFillResetState = Pick<ProductionState, 'activeFillType' | 'spargeState' | 'mashState' | 'completedSpargeLiters' | 'completedMashLiters' | 'currentFillLiters' | 'activeFillWasOpened' | 'isSpargeIncluded'>;

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
    hopsTimes: Record<number, string>
    hopName: string
    showHopsDialog: boolean
    showErrorDialog: boolean
    errorDialogContent: string
    showFinishDialog: boolean
    brewingFinished: boolean
    indexOfCurrentStep: number;
    brewingIsRunning: boolean;
    announcedHopTimes: number[];
    activeFillType: WaterFillType | undefined;
    spargeState: WaterFillState;
    mashState: WaterFillState;
    completedSpargeLiters: number;
    completedMashLiters: number;
    currentFillLiters: number;
    activeFillWasOpened: boolean;
    isSpargeIncluded: boolean;
    displayedRemainingSeconds: number | undefined;
}

export class Production extends React.Component<ProductionProps, ProductionState> {
    private blinkIntervalMainSwitch: NodeJS.Timeout | null = null;
    private blinkIntervalWaterSwitch: NodeJS.Timeout | null = null;
    private timelineData: TimelineData[] = [];
    private isBrewingStartRequestPending = false;
    private readonly MAX_AGITATOR_SPEED = 40;
    private readonly MAX_WATER_LEVEL = 70;
    private readonly MAX_INTERVAL_TIME = 10;
    private readonly MIN_INTERVAL_TIME = 10;
    private readonly MAX_BREAK_TIME = 10;
    private readonly MAX_RUNNING_TIME = 10;
    private remainingTimeInterval: NodeJS.Timeout | null = null;

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
            hopsTimes: {},
            hopName: '',
            showHopsDialog: false,
            showErrorDialog: false,
            errorDialogContent: '',
            showFinishDialog: false,
            brewingFinished: false,
            indexOfCurrentStep: 0,
            brewingIsRunning: false,
            announcedHopTimes: [],
            activeFillType: undefined,
            spargeState: 'IDLE',
            mashState: 'IDLE',
            completedSpargeLiters: 0,
            completedMashLiters: 0,
            currentFillLiters: 0,
            activeFillWasOpened: false,
            isSpargeIncluded: false,
            displayedRemainingSeconds: undefined
        }
    }

    componentDidMount() {
        const {getTemperatures, selectedBeer} = this.props;
        if (!isUndefined(selectedBeer)) {
            this.calculateTheHopTimes();
        }
        getTemperatures();
        this.syncRemainingTimeFromStatus();
        this.remainingTimeInterval = setInterval(this.tickRemainingTime, 1000);
    }

    componentWillUnmount() {
        if (this.remainingTimeInterval !== null) {
            clearInterval(this.remainingTimeInterval);
            this.remainingTimeInterval = null;
        }
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

        if (this.state.activeFillType !== undefined && waterStatus?.openClose === true && !prevProps.waterStatus?.openClose) {
            this.setState({activeFillWasOpened: true});
        }

        if (prevProps.waterStatus?.openClose === true && waterStatus?.openClose === false) {
            this.completePendingRecipeWaterFill(prevProps.waterStatus?.filledLiters);
        }

        if (!this.state.isSpargeIncluded && this.shouldIncludeSpargeAfterMashingOut(prevProps.brewingStatus, brewingStatus)) {
            this.setState({isSpargeIncluded: true});
        }


        if (!isToggleAgitatorSuccess && mainSwitchState) {
            const delay = 300;
            setTimeout(() => {
                this.setState({mainSwitchState: false, mainAgitatorError: true});
            }, delay);
        }

        if (prevState.intervalSwitchState == !intervalSwitchState && mainSwitchState) {
            toggleAgitator(this.setAgitatorStates(mainSwitchState));
        }

        if (prevState.heatingAndStirringSwitchState == !heatingAndStirringSwitchState && mainSwitchState) {
            toggleAgitator(this.setAgitatorStates(mainSwitchState));
        }

        if (!isWaterFillingSuccessful && waterSwitchState) {
            const delay = 300;
            setTimeout(() => {
                this.failActiveRecipeWaterFill();
            }, delay);
        }
        if (brewingStatus && brewingStatus.currentStep?.mode !== prevProps?.brewingStatus?.currentStep?.mode) {
            let timelineData: TimelineData | undefined;
            if (brewingStatus.currentStep.mode === ProcessMode.HEATING) {
                timelineData = {
                    type: 'heating', elapsed: brewingStatus.elapsedTime
                }
            } else {
                timelineData = {
                    type: 'rast', elapsed: brewingStatus.elapsedTime
                }
            }
            if (timelineData !== undefined) {
                this.timelineData.push(timelineData);
            }

        }
        if (typeof brewingStatus?.currentStep?.index === "number" && brewingStatus.currentStep.index !== prevProps?.brewingStatus?.currentStep?.index) {
            this.setState({indexOfCurrentStep: brewingStatus.currentStep.index});
        }


        if (brewingStatus?.currentStep?.phase === ProcessPhase.COOKING && !showHopsDialog) {
            this.checkForHopAddition()
        }
        if(brewingStatus?.process?.state === ProcessState.FINISHED && ! showFinishDialog ! && !this.state.brewingFinished)
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
            return {displayedRemainingSeconds: Math.max(0, prevState.displayedRemainingSeconds - 1)};
        });
    }

    shouldCountdownLocally = (aBrewingStatus?: BrewingStatus): boolean => {
        return aBrewingStatus?.process?.state === ProcessState.ACTIVE
            && aBrewingStatus.currentStep?.mode === ProcessMode.TIMER_RUNNING
            && typeof aBrewingStatus.currentStep?.duration === 'number'
            && aBrewingStatus.currentStep.duration > 0;
    }

    getRemainingSecondsFromStatus = (): number | undefined => {
        const {brewingStatus} = this.props;
        if (brewingStatus?.process?.state === ProcessState.FINISHED) {
            return 0;
        }
        if (!this.shouldCountdownLocally(brewingStatus)) {
            return undefined;
        }
        const statusRemainingTime = Number(brewingStatus?.currentStep?.remainingTime);
        if (Number.isFinite(statusRemainingTime) && statusRemainingTime >= 0) {
            return Math.max(0, Math.floor(statusRemainingTime));
        }
        const duration = Number(brewingStatus?.currentStep?.duration);
        const elapsed = Number(brewingStatus?.currentStep?.elapsedTime);
        if (Number.isFinite(duration) && Number.isFinite(elapsed)) {
            return Math.max(0, Math.floor(duration - elapsed));
        }
        return undefined;
    }
    checkForHopAddition() {
        const {hopsTimes, announcedHopTimes} = this.state;
        const {brewingStatus} = this.props;

        // Hop additions must be calculated relative to the cooking phase,
        // nicht relativ zur gesamten Sudlaufzeit.
        const aCookingElapsed = Math.floor(brewingStatus?.currentStep?.elapsedTime ?? 0);
        if (!hopsTimes.hasOwnProperty(aCookingElapsed)) {
            return;
        }
        if (announcedHopTimes.includes(aCookingElapsed)) {
            return;
        }

        const aHopName = hopsTimes[aCookingElapsed];
        this.setState((aPrevState) => ({
            showHopsDialog: true,
            hopName: aHopName,
            announcedHopTimes: [...aPrevState.announcedHopTimes, aCookingElapsed]
        }));
    }

    calculateTheHopTimes() {
        let hopsDict: Record<number, string> = {};
        const {selectedBeer} = this.props
        const totalCookingTime = selectedBeer.cookingTime
        selectedBeer.wortBoiling.hops.forEach((item) => {
            const time = totalCookingTime - item.time;
            const secTime = time * 60;
            hopsDict[secTime] = item.name;

        })
        this.setState({hopsTimes: hopsDict, announcedHopTimes: []});
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
        const resetState: RecipeWaterFillResetState = {
            activeFillType: undefined,
            spargeState: 'IDLE',
            mashState: 'IDLE',
            completedSpargeLiters: 0,
            completedMashLiters: 0,
            currentFillLiters: 0,
            activeFillWasOpened: false,
            isSpargeIncluded: false
        };
        this.setState(aAdditionalState === undefined ? resetState : {...resetState, ...aAdditionalState});
    }

    completePendingRecipeWaterFill = (aPreviousFilledLiters?: number): void => {
        const {activeFillType, activeFillWasOpened} = this.state;
        if ((!activeFillWasOpened && aPreviousFilledLiters === undefined) || activeFillType === undefined) {
            this.setState({waterSwitchState: false, activeFillWasOpened: false});
            return;
        }
        const currentFilledLiters = this.getSafeWaterStatusFilledLiters();
        const previousFilledLiters = Number(aPreviousFilledLiters);
        const completedLiters = currentFilledLiters > 0 || !Number.isFinite(previousFilledLiters)
            ? currentFilledLiters
            : previousFilledLiters;
        this.setState({
            waterSwitchState: false,
            activeFillWasOpened: false,
            activeFillType: undefined,
            currentFillLiters: completedLiters,
            completedMashLiters: activeFillType === 'MASH' ? completedLiters : this.state.completedMashLiters,
            completedSpargeLiters: activeFillType === 'SPARGE' ? completedLiters : this.state.completedSpargeLiters,
            mashState: activeFillType === 'MASH' ? 'COMPLETED' : this.state.mashState,
            spargeState: activeFillType === 'SPARGE' ? 'COMPLETED' : this.state.spargeState
        });
    }

    failActiveRecipeWaterFill = (): void => {
        const {activeFillType} = this.state;
        this.setState({
            waterSwitchState: false,
            waterFillingError: true,
            activeFillType: undefined,
            activeFillWasOpened: false,
            currentFillLiters: 0,
            spargeState: activeFillType === 'SPARGE' ? 'ERROR' : this.state.spargeState,
            mashState: activeFillType === 'MASH' ? 'ERROR' : this.state.mashState
        });
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
        return this.state.waterSwitchState || this.state.activeFillType !== undefined || this.props.waterStatus?.openClose === true;
    }

    isControllerAvailable = (): boolean => {
        const {isBackenAvailable} = this.props;
        if (typeof isBackenAvailable === 'boolean') {
            return isBackenAvailable;
        }
        return isBackenAvailable?.isBackenAvailable === true;
    }

    startRecipeWaterFilling = (aRecipeWaterFill: RecipeWaterFill): void => {
        const volume = this.getRecipeWaterVolume(aRecipeWaterFill);
        if (volume === undefined || this.isRecipeWaterButtonDisabled(aRecipeWaterFill)) {
            return;
        }
        const activeFillType: WaterFillType = aRecipeWaterFill === 'mash' ? 'MASH' : 'SPARGE';
        this.setState({
            waterSwitchState: true,
            liters: volume,
            activeFillType,
            currentFillLiters: 0,
            activeFillWasOpened: false,
            waterFillingError: false,
            mashState: activeFillType === 'MASH' ? 'FILLING' : this.state.mashState,
            spargeState: activeFillType === 'SPARGE' ? 'FILLING' : this.state.spargeState
        });
        this.props.startWaterFilling(volume);
    }

    getSafeWaterStatusFilledLiters = (): number => {
        const waterStatusFilledLiters = Number(this.props.waterStatus?.filledLiters);
        return Number.isFinite(waterStatusFilledLiters) ? waterStatusFilledLiters : 0;
    }

    getCurrentWaterFillLiters = (): number => {
        if (this.state.activeFillType !== undefined && !this.state.activeFillWasOpened) {
            return this.state.currentFillLiters;
        }
        if (this.state.activeFillType !== undefined || this.props.waterStatus?.openClose === true) {
            return this.getSafeWaterStatusFilledLiters();
        }
        if (this.state.mashState === 'COMPLETED') {
            return this.state.completedMashLiters;
        }
        return this.state.currentFillLiters;
    }


    getCurrentWaterFillTargetLiters = (): number => {
        if (this.state.activeFillType !== undefined || this.props.waterStatus?.openClose === true) {
            const rawTargetLiters = Number(this.props.waterStatus?.targetLiters);
            if (Number.isFinite(rawTargetLiters) && rawTargetLiters > 0) {
                return rawTargetLiters;
            }
        }
        const rawRecipeLiters = Number(this.state.liters);
        return Number.isFinite(rawRecipeLiters) ? Math.max(0, rawRecipeLiters) : 0;
    }

    getDisplayedWaterLiters = (): number => {
        return this.state.isSpargeIncluded
            ? this.state.completedMashLiters + this.state.completedSpargeLiters
            : this.getCurrentWaterFillLiters();
    }

    getDisplayedWaterLabel = (): string => {
        if (this.state.isSpargeIncluded) {
            return 'Brauwasser gesamt';
        }
        if (this.state.activeFillType === 'SPARGE' || (this.state.spargeState === 'COMPLETED' && this.state.mashState === 'IDLE')) {
            return 'Nachguss';
        }
        if (this.state.activeFillType === 'MASH' || this.state.mashState === 'COMPLETED') {
            return 'Hauptguss';
        }
        return 'Aktueller Füllvorgang';
    }

    shouldIncludeSpargeAfterMashingOut = (aPreviousStatus?: BrewingStatus, aCurrentStatus?: BrewingStatus): boolean => {
        if (this.state.spargeState !== 'COMPLETED' || this.state.mashState !== 'COMPLETED') {
            return false;
        }
        const previousWaitingFor = aPreviousStatus?.waiting?.waitingFor;
        const currentPhase = aCurrentStatus?.currentStep?.phase;
        const currentProcessState = aCurrentStatus?.process?.state;
        const wasWaitingForMashingOut = previousWaitingFor === WaitingFor.MASHING_OUT_CONFIRMATION;
        const isAfterMashingOutPhase = currentPhase === ProcessPhase.COOKING || currentPhase === ProcessPhase.COOLING || currentPhase === ProcessPhase.FINISHED || currentProcessState === ProcessState.FINISHED;
        return wasWaitingForMashingOut && isAfterMashingOutPhase;
    }

    isRecipeWaterButtonDisabled = (aRecipeWaterFill: RecipeWaterFill): boolean => {
        const volume = this.getRecipeWaterVolume(aRecipeWaterFill);
        if (volume === undefined || !this.isControllerAvailable() || this.isWaterFillingActive()) {
            return true;
        }
        if (aRecipeWaterFill === 'sparge') {
            return this.state.spargeState === 'COMPLETED' || this.state.mashState !== 'IDLE';
        }
        return this.state.spargeState !== 'COMPLETED' || this.state.mashState === 'COMPLETED';
    }

    getRecipeWaterButtonLabel = (aRecipeWaterFill: RecipeWaterFill): string => {
        if (aRecipeWaterFill === 'sparge' && this.state.spargeState === 'COMPLETED') {
            return '✓ Nachguss fertig';
        }
        if (aRecipeWaterFill === 'mash' && this.state.mashState === 'COMPLETED') {
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
        if (this.isStartButtonDisabled()) {
            return;
        }
        this.resetRecipeWaterFillState();
        this.isBrewingStartRequestPending = true;
        dataCollector.reset();
        console.log('Starting brewing with data:', sendBrewingData);
        const result = mapBeerToBrewingData(selectedBeer);
        console.log('Starting brewing with data:', result);
        if (!result.ok || !result.brewingData) {
            this.isBrewingStartRequestPending = false;
            this.setState({
                showErrorDialog: true,
                errorDialogContent: result.error ?? 'Rezeptdaten sind für den Start ungültig.'
            });
            return;
        }
        this.setState({brewingIsRunning: true});
        console.log('Starting brewing with data:', result.brewingData);
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

    createTimelineData() {
        const {brewingStatus} = this.props;

        if (this.timelineData.length > 0) {
            const lastObject = _.last(this.timelineData);
            if (lastObject) {
                lastObject.elapsed = brewingStatus?.elapsedTime ?? 0;
            }
        }
    }

    renderFlames() {
        const {brewingStatus} = this.props;

        return (
            <div className='Flame'>
              {(brewingStatus?.hardware?.heater === HeatingStates.ON || brewingStatus?.currentStep?.mode === ProcessMode.HEATING) && (
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
            waterSwitchState,
            liters
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
                              agitatorState={brewingStatus?.hardware?.agitator === "ON"}
                              contentType={getVesselContentType(brewingStatus)}></WaterControl>

            </div>);
    }

    renderProgressBar() {
        const {brewingStatus} = this.props;
        let statusText = '';
        if (!isUndefined(brewingStatus)) {
                statusText = getBrewingStatusLabel(brewingStatus);

                if(brewingStatus?.currentStep?.mode === ProcessMode.HEATING){
                    return (
                        <div className="container mt-4">
                            <h3 className='progressLabel'>{brewingStatus.currentStep?.name ?? "-"}</h3>
                            <p className='progressLabel'>{statusText}</p>
                        </div>
                    );
                }
                const stepDuration = Number(brewingStatus?.currentStep?.duration);
                const finishedInPercent = stepDuration > 0 ? Math.min(100, Math.max(0, Math.round((brewingStatus?.elapsedTime ?? 0) * 100 / stepDuration))) : 0;


                const progressBarStyle = {
                    width: '100%',
                    maxWidth: '43rem',
                    height: '3rem',
                    marginLeft: '1rem'
                };
                return (
                    <div className="container mt-4">
                        <h3 className='progressLabel'>{brewingStatus.currentStep?.name ?? "-"}</h3>
                        <p className='progressLabel'>{statusText}</p>
                            <ProgressBar animated striped now={finishedInPercent} label={`${finishedInPercent}%`}
                                         style={progressBarStyle}/>

                    </div>
                );

        }
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

    confirmErrorDialog = () => {
        this.setState({showErrorDialog: false, errorDialogContent: ''});
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
    renderHopDialog() {
        const {showHopsDialog,hopName} = this.state;
        return (<div>
            <ModalDialog onConfirm={this.confirmHopDialog} type={DialogType.CONFIRM} open={showHopsDialog}
                         content={'Bitte den ' + hopName + ' Hopfen zufügen!'} header={"Hopfen Zufügen"}></ModalDialog>
        </div>);

    }

    renderErrorDialog() {
        const {showErrorDialog, errorDialogContent} = this.state
        const {isBackenAvailable} = this.props
        const statusText = typeof isBackenAvailable === 'boolean' ? '' : isBackenAvailable.statusText;
        const contentText = errorDialogContent || ('Die Brau-Steuerung ist nicht erreichbar\n\n' + statusText)
        return (<div>
            <ModalDialog onConfirm={this.confirmErrorDialog} type={DialogType.ERROR} open={showErrorDialog}
                         content={contentText} header={"Fehler!"}></ModalDialog>
        </div>);
    }

    renderFinishDialog() {
        const {showFinishDialog} = this.state
        return (<div>
            <ModalDialog onConfirm={this.confirmFinishDialog} type={DialogType.INFO} open={showFinishDialog}
                         content={'Das Bier ist fertig!'} header={"Fertig!"}></ModalDialog>
        </div>);
    }

    renderProcessList() {
        const { selectedBeer, brewingStatus } = this.props;
        return (
            <ProcessList selectedBeer={selectedBeer} currentStepIndex={brewingStatus?.currentStep?.index ?? 0} currentStep={brewingStatus?.currentStep} brewingStatus={brewingStatus} remainingSeconds={this.state.displayedRemainingSeconds} onNextStep={this.handleNextProcedureStep} isNextStepDisabled={!this.isNextProcedureStepAvailable()} />
        );
    }


    render() {
        const {isBackenAvailable} = this.props;
        const {showHopsDialog,showFinishDialog} = this.state;
        this.createTimelineData();
        return (
            <div className="containerProduction ">
                {
                    showHopsDialog &&
                    (this.renderHopDialog())
                }
                {
                    isBackenAvailable &&
                    (this.renderErrorDialog())
                }
                {
                    showFinishDialog &&
                    (this.renderFinishDialog())
                }

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

const mapDispatchToProps = (dispatch: any) => ({
    getTemperatures: () => {
        dispatch(ProductionActions.getTemperatures())
    },
    toggleAgitator: (agitatorState: MashAgitatorStates) => {
        dispatch(ProductionActions.toggleAgitator(agitatorState))
    },
    startWaterFilling: (liters: number) => {
        dispatch(ProductionActions.startWaterFilling(liters))
    },
    setAgitatorSpeed: (agitatorSpeed: number) => {
        dispatch(ProductionActions.setAgitatorSpeed(agitatorSpeed))
    },
    sendBrewingData: (brewingData: BrewingData) => {
        dispatch(ProductionActions.sendBrewingData(brewingData))
    },
    startPolling: () => {
        dispatch(ProductionActions.startPolling())
    },
    stopPolling: () => {
        dispatch(ProductionActions.stopPolling())
    },

    addFinishedBrew: (finishedBrew: FinishedBrew) => {
        dispatch(BeerActions.addFinishedBrew(finishedBrew))
    },
    nextProcedureStep: () => {
        dispatch(ProductionActions.nextProcedureStep())
    }
});
const mapStateToProps = (state: any) => (
    {
        selectedBeer: state.beerDataReducer.beerToBrew,
        temperature: state.productionReducer.temperature,
        currentAgitatorState: state.productionReducer.setedAgitatorState,
        currentAgitatorSpeed: state.productionReducer.setedAgitatorSpeed,
        agitatorIsRunning: state.productionReducer.agitatorIsRunning,
        agitatorSpeed: state.productionReducer.agitatorSpeed,
        isWaterFillingSuccessful: state.productionReducer.isWaterFillingSuccessful,
        isToggleAgitatorSuccess: state.productionReducer.isToggleAgitatorSuccess,
        brewingStatus: state.productionReducer.brewingStatus,
        isBackenAvailable: state.productionReducer.isBackenAvailable,
        waterStatus: state.productionReducer.waterStatus,
        isPollingRunning: state.productionReducer.isPollingRunning

    });
export default connect(mapStateToProps, mapDispatchToProps)(Production);
