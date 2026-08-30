import React from 'react';
import {isUndefined} from 'lodash';
import {Beer} from "../../model/Beer";
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

import {BrewingStatus, ProcessPhase, ProcessState} from "../../model/brewingStatus.types";
import {TimeFormatter} from "../../utils/TimeFormatter";


import Switch from "react-switch";
import {FinishedBrewCreatePayload} from "../../model/FinishedBrew";
import {eBrewState} from "../../enums/eBrewState";
import {BackendAvailable} from "../../reducers/productionReducer";
import {ProcessList} from "./ProcessList/ProcessList";
import { dataCollector } from '../../utils/DataCollector/dataCollector';
import {isBrewingProcessActive, isProcessActive} from "../../utils/brewingStatus/selectors";
import {getVesselContentType} from "../../utils/brewingStatus/vesselContent";
import {calculateHopSchedule, getDueHopAddition, HopAddition} from "./utils/hopSchedule";
import {getRemainingSecondsFromStatus, shouldCountdownLocally, tickRemainingSeconds} from "./utils/productionCountdown";
import {getAlarmSnapshot, getAgitatorActive, getHeaterDisplayLabel, getHeaterDisplayStatus, isControllerAvailable as getIsControllerAvailable} from "./utils/productionStatus";
import {RecipeWaterFill, RecipeWaterFillStatus} from "./waterFill/recipeWaterFill.types";
import {completeWaterFill, createInitialRecipeWaterFillStatus, failWaterFill, includePreparedSpargeAfterMashingOut, markValveOpened, resetWaterFill, startManualWaterFill, startWaterFill} from "./waterFill/recipeWaterFillState";
import {ProductionDialogs} from "./components/ProductionDialogs";
import {ProductionTemperatureTimeline} from "./TemperatureTimeline/ProductionTemperatureTimeline";
import {getDisplayedWaterLiters as selectDisplayedWaterLiters, getWaterLabel, getWaterTargetLiters, isRecipeWaterButtonDisabled as selectRecipeWaterButtonDisabled, isWaterFillingActive as selectWaterFillingActive, shouldIncludeSpargeAfterMashingOut as selectShouldIncludeSpargeAfterMashingOut, sanitizeLiters} from "./waterFill/recipeWaterFillSelectors";
import {equipmentAlarmDisplay, isEquipmentAlarmActive} from '../../utils/brewingStatus/alarmDisplay';
import {getConfirmationRequestViewModel} from '../../utils/brewingStatus/selectors';
import {ConfirmStates} from '../../enums/eConfirmStates';
import {AgitatorConfig, AgitatorMode, AgitatorRuntimeStatus} from '../../model/Agitator';
import {ProductionRepository} from '../../repositorys/ProductionRepository';
import {RealtimeControllerState} from '../../model/RealtimeControllerState';

export const AGITATOR_SPEED_DEBOUNCE_MS = 300;

export interface ProductionProps {
    selectedBeer?: Beer;
    temperature: number;
    currentAgitatorState: ToggleState;
    currentAgitatorSpeed: number;
    agitatorSpeed: number;
    agitatorIsRunning: ToggleState;
    getTemperatures: () => void;
    toggleAgitator: (agitatorState: MashAgitatorStates) => void; // legacy Redux connection
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
    addFinishedBrew: (finishedBrew: FinishedBrewCreatePayload) => void;
    isAddingFinishedBrew: boolean;
    addFinishedBrewError?: string;
    pendingFinishedBrewPayload?: FinishedBrewCreatePayload;
    nextProcedureStep: () => void;
    isNextProcedureStepPending: boolean;
    nextProcedureStepError?: string;
    isBrewingStatusStale: boolean;
    brewingStartError?: string;
    isPollingRunning: boolean;
    confirm: (confirmState: ConfirmStates) => void;
    isConfirmPending: boolean;
    confirmError?: string;
    debug: boolean;
    realtimeState?: RealtimeControllerState;
    socketConnected?: boolean;
}

interface ProductionState {
    agitatorConfig?: AgitatorConfig;
    agitatorRuntime?: AgitatorRuntimeStatus;
    agitatorSpeedDraft?: number;
    agitatorIntervalDraft?: Pick<AgitatorConfig, 'runningMinutes' | 'breakMinutes'>;
    agitatorRequestPending: boolean;
    agitatorStatusLoadFailed: boolean;
    waterSwitchState: boolean
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
    equipmentAlarmDismissed: boolean;
}

export class Production extends React.Component<ProductionProps, ProductionState> {
    private isBrewingStartRequestPending = false;
    private isFinishedBrewSaveRequestPending = false;
    private readonly MAX_WATER_LEVEL = 70;
    private remainingTimeInterval: NodeJS.Timeout | null = null;
    private agitatorSpeedDebounceTimeout: NodeJS.Timeout | null = null;
    private errorTimeouts: NodeJS.Timeout[] = [];
    private isMountedComponent = false;

    constructor(props: ProductionProps) {
        super(props);
        this.state = {
            agitatorConfig: undefined,
            agitatorRuntime: undefined,
            agitatorSpeedDraft: undefined,
            agitatorIntervalDraft: undefined,
            agitatorRequestPending: false,
            agitatorStatusLoadFailed: false,
            waterSwitchState: false,
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
            displayedRemainingSeconds: undefined,
            equipmentAlarmDismissed: false
        }
    }

    componentDidMount() {
        this.isMountedComponent = true;
        const {getTemperatures, selectedBeer, isPollingRunning, startPolling} = this.props;
        if (!isUndefined(selectedBeer)) {
            this.calculateTheHopTimes();
        }
        getTemperatures();
        this.loadAgitatorStatus();
        if (!isPollingRunning) {
            startPolling();
        }
        this.syncRemainingTimeFromStatus();
        this.remainingTimeInterval = setInterval(this.tickRemainingTime, 1000);
    }

    componentWillUnmount() {
        this.isMountedComponent = false;
        this.clearAgitatorSpeedDebounce();
        if (this.remainingTimeInterval !== null) {
            clearInterval(this.remainingTimeInterval);
            this.remainingTimeInterval = null;
        }
        this.errorTimeouts.forEach(clearTimeout);
        this.errorTimeouts = [];
    }


    componentDidUpdate(prevProps: Readonly<ProductionProps>, prevState: Readonly<ProductionState>) {
        const {brewingStatus,isWaterFillingSuccessful, waterStatus} = this.props;
        const {waterSwitchState,showHopsDialog,showFinishDialog} = this.state;


        if (prevProps.brewingStatus !== brewingStatus) {
            this.syncRemainingTimeFromStatus();
        }
        if (prevProps.realtimeState?.agitator !== this.props.realtimeState?.agitator && this.props.socketConnected && this.props.realtimeState?.agitator) {
            this.mergeAgitatorPoll(this.props.realtimeState.agitator);
        }

        if (getIsControllerAvailable(prevProps.isBackenAvailable) && !this.isControllerAvailable()) {
            this.clearAgitatorSpeedDebounce();
        }
        if (!getIsControllerAvailable(prevProps.isBackenAvailable) && this.isControllerAvailable() && !this.state.agitatorConfig) {
            this.loadAgitatorStatus();
        }

        if (isEquipmentAlarmActive(getAlarmSnapshot(prevProps.realtimeState, prevProps.socketConnected)) && !isEquipmentAlarmActive(getAlarmSnapshot(this.props.realtimeState, this.props.socketConnected))) {
            this.setState({equipmentAlarmDismissed: false});
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

        if (this.state.recipeWaterFill.isFillActive && waterStatus?.openClose === true && !prevProps.waterStatus?.openClose) {
            this.setState((prevState) => ({recipeWaterFill: markValveOpened(prevState.recipeWaterFill)}));
        }

        if (prevProps.waterStatus?.openClose === true && waterStatus?.openClose === false) {
            this.completePendingRecipeWaterFill(prevProps.waterStatus?.filledLiters);
        }

        if (!this.state.recipeWaterFill.isSpargeIncluded && this.shouldIncludeSpargeAfterMashingOut(prevProps.brewingStatus, brewingStatus)) {
            this.setState((prevState) => ({recipeWaterFill: includePreparedSpargeAfterMashingOut(prevState.recipeWaterFill)}));
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

        const aFinishedBrewSaveCompleted = prevProps.isAddingFinishedBrew && !this.props.isAddingFinishedBrew;
        if (aFinishedBrewSaveCompleted && prevProps.pendingFinishedBrewPayload) {
            this.isFinishedBrewSaveRequestPending = false;
            if (this.props.addFinishedBrewError) {
                this.setState({showFinishDialog: true, brewingFinished: false});
            } else {
                dataCollector.reset();
                this.props.stopPolling();
                this.setState({showFinishDialog: false, brewingFinished: true});
            }
        }

    }

    loadAgitatorStatus = async (): Promise<void> => {
        try {
            const detail = await ProductionRepository.getAgitatorStatus();
            if (!this.isMountedComponent) return;
            this.setState({
                agitatorConfig: detail.config,
                agitatorIntervalDraft: undefined,
                agitatorStatusLoadFailed: false,
                agitatorRuntime: {
                    mode: detail.config.mode,
                    paused: detail.runtime.paused,
                    operation: detail.runtime.desiredOperation,
                    intervalPhase: detail.runtime.intervalPhase,
                    actualOutputOn: detail.runtime.actualOutputOn,
                }
            });
        } catch (error) {
            // The remaining production screen stays usable when detail status is unavailable.
            console.error('Rührwerkstatus konnte nicht geladen werden', error);
            if (this.isMountedComponent) this.setState({agitatorStatusLoadFailed: true});
        }
    }

    mergeAgitatorPoll = (poll: AgitatorRuntimeStatus): void => {
        this.setState((previous) => ({
            agitatorRuntime: {...previous.agitatorRuntime, ...poll},
            agitatorConfig: previous.agitatorConfig ? {
                ...previous.agitatorConfig,
                mode: poll.mode,
                ...(typeof poll.speedPercent === 'number' ? {speedPercent: poll.speedPercent} : {}),
                ...(typeof poll.runningMinutes === 'number' ? {runningMinutes: poll.runningMinutes} : {}),
                ...(typeof poll.breakMinutes === 'number' ? {breakMinutes: poll.breakMinutes} : {}),
            } : previous.agitatorConfig,
            agitatorIntervalDraft: typeof poll.runningMinutes === 'number' || typeof poll.breakMinutes === 'number'
                ? undefined
                : previous.agitatorIntervalDraft,
        }));
    }

    submitAgitatorConfig = async (config: AgitatorConfig): Promise<boolean> => {
        this.setState({agitatorRequestPending: true, mainAgitatorError: false});
        try {
            const confirmed = await ProductionRepository.setAgitatorConfig(config);
            if (this.isMountedComponent) this.setState((previous) => ({
                agitatorConfig: confirmed,
                agitatorRuntime: previous.agitatorRuntime ? {...previous.agitatorRuntime, mode: confirmed.mode} : previous.agitatorRuntime,
                agitatorSpeedDraft: undefined,
                agitatorIntervalDraft: undefined,
                agitatorRequestPending: false,
            }));
            return true;
        } catch (error) {
            if (this.isMountedComponent) this.setState({agitatorSpeedDraft: undefined, agitatorIntervalDraft: undefined, agitatorRequestPending: false, mainAgitatorError: true});
            return false;
        }
    }

    toggleAgitatorMode = (mode: Exclude<AgitatorMode, 'OFF'>, checked: boolean): void => {
        const {agitatorConfig, agitatorRequestPending} = this.state;
        if (!this.isControllerAvailable() || !agitatorConfig || agitatorRequestPending) return;
        const nextMode: AgitatorMode = checked ? mode : (agitatorConfig.mode === mode ? 'OFF' : agitatorConfig.mode);
        if (nextMode !== agitatorConfig.mode) void this.submitAgitatorConfig({...agitatorConfig, mode: nextMode});
    }

    toggleAgitatorPause = async (): Promise<void> => {
        const runtime = this.state.agitatorRuntime;
        if (!runtime || runtime.mode === 'OFF' || this.state.agitatorRequestPending) return;
        this.setState({agitatorRequestPending: true, mainAgitatorError: false});
        try {
            if (runtime.paused) await ProductionRepository.resumeAgitator();
            else await ProductionRepository.pauseAgitator();
            if (this.isMountedComponent) this.setState((previous) => ({
                agitatorRuntime: previous.agitatorRuntime ? {...previous.agitatorRuntime, paused: !runtime.paused} : previous.agitatorRuntime,
                agitatorRequestPending: false,
            }));
        } catch (error) {
            if (this.isMountedComponent) this.setState({agitatorRequestPending: false, mainAgitatorError: true});
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

    onAgitatorSpeedChange = (value: number) => {
        if (!this.isControllerAvailable() || !this.state.agitatorConfig) {
            return;
        }
        this.setState({agitatorSpeedDraft: value});
        this.clearAgitatorSpeedDebounce();
        this.agitatorSpeedDebounceTimeout = setTimeout(() => {
            this.agitatorSpeedDebounceTimeout = null;
            if (this.isControllerAvailable()) {
                const config = this.state.agitatorConfig;
                if (config) void this.submitAgitatorConfig({...config, speedPercent: value});
            }
        }, AGITATOR_SPEED_DEBOUNCE_MS);
    }

    clearAgitatorSpeedDebounce = (): void => {
        if (this.agitatorSpeedDebounceTimeout !== null) {
            clearTimeout(this.agitatorSpeedDebounceTimeout);
            this.agitatorSpeedDebounceTimeout = null;
        }
    }

    onIntervalChangeBreakTime = (value: number) => {
        const config = this.state.agitatorConfig;
        if (!this.isControllerAvailable() || !config || this.state.agitatorRequestPending) return;
        this.setState({agitatorIntervalDraft: {runningMinutes: config.runningMinutes, breakMinutes: value}}, () => {
            void this.submitAgitatorConfig({...config, breakMinutes: value});
        });
    }

    onIntervalChangeRunningTime = (value: number) => {
        const config = this.state.agitatorConfig;
        if (!this.isControllerAvailable() || !config || this.state.agitatorRequestPending) return;
        this.setState({agitatorIntervalDraft: {runningMinutes: value, breakMinutes: config.breakMinutes}}, () => {
            void this.submitAgitatorConfig({...config, runningMinutes: value});
        });
    }

    onSetWaterChangeQuantity = (value: number) => {
        if (!this.isControllerAvailable()) {
            return;
        }
        this.setState({liters: value});
    }

    resetRecipeWaterFillState = (aAdditionalState?: Pick<ProductionState, 'indexOfCurrentStep'>): void => {
        const resetState = {recipeWaterFill: resetWaterFill()};
        this.setState(aAdditionalState === undefined ? resetState : {...resetState, ...aAdditionalState});
    }

    completePendingRecipeWaterFill = (aPreviousFilledLiters?: number): void => {
        const {recipeWaterFill} = this.state;
        if ((!recipeWaterFill.activeFillWasOpened && aPreviousFilledLiters === undefined) || !recipeWaterFill.isFillActive) {
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
        if (!this.isControllerAvailable()) {
            return;
        }
        const {waterSwitchState, liters,} = this.state;
        const {startWaterFilling} = this.props;
        if (!waterSwitchState) {
            this.setState((prevState) => ({
                waterSwitchState: true,
                waterFillingError: false,
                recipeWaterFill: startManualWaterFill(prevState.recipeWaterFill)
            }), () => startWaterFilling(liters));
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
        return isUndefined(selectedBeer) || !this.isControllerAvailable() || this.state.brewingIsRunning || this.isBrewingStartRequestPending || !this.isControlBrewingStartAvailable();
    }

    startBrewing = (): void => {
        const {selectedBeer, sendBrewingData} = this.props;
        if (selectedBeer === undefined || this.isStartButtonDisabled()) {
            return;
        }
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

    isNextProcedureStepAvailable = (): boolean => {
        return this.isControllerAvailable() && isBrewingProcessActive(this.props.brewingStatus) && !this.props.isNextProcedureStepPending;
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
        const heaterStatus = getHeaterDisplayStatus(brewingStatus, this.props.realtimeState, this.props.socketConnected);
        const heaterLabel = this.props.isBrewingStatusStale ? 'Heizungsstatus unbekannt' : getHeaterDisplayLabel(brewingStatus, this.props.realtimeState, this.props.socketConnected);

        return (
            <div className='Flame'>
              <span className={`heater-status heater-status--${this.props.isBrewingStatusStale ? 'unknown' : heaterStatus}`}>
                  {heaterLabel}
              </span>
              {!this.props.isBrewingStatusStale && heaterStatus === 'active' && (
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
        return (
            <div className="info production-temperature-timeline-card" aria-label="Temperatur-Timeline Produktionsbereich">
                <ProductionTemperatureTimeline
                    selectedBeer={this.props.selectedBeer}
                    brewingStatus={this.props.brewingStatus}
                    measurements={dataCollector.getTimelineSnapshot().measurements}
                    fallbackTemperature={this.props.temperature}
                />
            </div>
        );
    }

    renderTemperature() {
        const {brewingStatus, temperature} = this.props;
        let value: number;
        if (this.props.isBrewingStatusStale) {
            value = 0;
        } else if (brewingStatus?.temperature?.current === undefined || Number(brewingStatus?.temperature?.current) === 0) {
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
        const {waterSwitchState, agitatorConfig, agitatorRuntime, agitatorSpeedDraft, agitatorIntervalDraft, agitatorRequestPending, agitatorStatusLoadFailed} = this.state;
        const settingsDisabled = !this.isControllerAvailable();
        const mashWaterDisabled = settingsDisabled || this.isRecipeWaterButtonDisabled('mash');
        const spargeWaterDisabled = settingsDisabled || this.isRecipeWaterButtonDisabled('sparge');
        const renderSwitch = (label: string, checked: boolean, onChange: (checked: boolean) => void, disabled = settingsDisabled) => (
            <div className="settingsToggleRow">
                <span>{label}</span>
                <Switch
                    className="productionSwitch"
                    onChange={onChange}
                    checked={checked}
                    height={24}
                    width={44}
                    handleDiameter={18}
                    checkedIcon={false}
                    uncheckedIcon={false}
                    disabled={disabled}
                    aria-label={label}
                />
            </div>
        );
        return (
            <div className="settings">
                <div className="settingsHeader">
                    <h3>Einstellungen</h3>
                </div>

                <section className="settingsGroup" aria-labelledby="agitator-settings-title">
                    <h4 id="agitator-settings-title">Rührwerk</h4>
                    {(settingsDisabled || !agitatorConfig) && <p className="agitatorAvailability" role="status">
                        {agitatorStatusLoadFailed || settingsDisabled ? 'Rührwerk-Konfiguration nicht verfügbar' : 'Rührwerk-Konfiguration wird geladen'}
                    </p>}
                    <div className="agitatorPrimaryMode">
                        {renderSwitch('Durchgehend rühren', agitatorConfig?.mode === 'CONTINUOUS',
                            (checked) => this.toggleAgitatorMode('CONTINUOUS', checked), settingsDisabled || !agitatorConfig || agitatorRequestPending)}
                    </div>
                    <div className={`intervalSettings agitatorAutomaticSettings ${agitatorConfig?.mode === 'AUTOMATIC' ? 'is-active' : ''}`} aria-labelledby="interval-settings-title">
                        <div className="agitatorAutomaticHeader">
                            <div>
                                <h5 id="interval-settings-title">Automatik</h5>
                                <p>Beim Heizen durchgehend, sonst im Intervall</p>
                            </div>
                            <Switch className="productionSwitch" onChange={(checked) => this.toggleAgitatorMode('AUTOMATIC', checked)}
                                checked={agitatorConfig?.mode === 'AUTOMATIC'} height={24} width={44} handleDiameter={18}
                                checkedIcon={false} uncheckedIcon={false} disabled={settingsDisabled || !agitatorConfig || agitatorRequestPending}
                                aria-label="Automatik" />
                        </div>
                        <h6>Intervall</h6>
                        <div className="intervalTimeControls">
                            <div className="intervalTimeControl" data-testid="running-minutes-stepper">
                                <QuantityPicker initialValue={agitatorIntervalDraft?.runningMinutes ?? agitatorConfig?.runningMinutes}
                                    min={0} max={Number.MAX_SAFE_INTEGER} onChange={this.onIntervalChangeRunningTime}
                                    isDisabled={settingsDisabled || !agitatorConfig || agitatorRequestPending || agitatorConfig.mode !== 'AUTOMATIC'} label="Laufzeit" labelPosition="above"/>
                                <span className="intervalTimeUnit">min</span>
                            </div>
                            <div className="intervalTimeControl" data-testid="break-minutes-stepper">
                                <QuantityPicker initialValue={agitatorIntervalDraft?.breakMinutes ?? agitatorConfig?.breakMinutes}
                                    min={0} max={Number.MAX_SAFE_INTEGER} onChange={this.onIntervalChangeBreakTime}
                                    isDisabled={settingsDisabled || !agitatorConfig || agitatorRequestPending || agitatorConfig.mode !== 'AUTOMATIC'} label="Pausenzeit" labelPosition="above"/>
                                <span className="intervalTimeUnit">min</span>
                            </div>
                        </div>
                    </div>
                    <label className="agitatorSpeedControl">
                        <span>Geschwindigkeit <strong>{agitatorConfig ? `${agitatorSpeedDraft ?? agitatorConfig.speedPercent} %` : '–'}</strong></span>
                        <input type="range" min="0" max="100" value={agitatorSpeedDraft ?? agitatorConfig?.speedPercent ?? 0}
                               disabled={settingsDisabled || !agitatorConfig} onChange={(event) => this.onAgitatorSpeedChange(Number(event.target.value))}/>
                    </label>
                    {agitatorRuntime && agitatorRuntime.mode !== 'OFF' && <button className="agitatorPauseButton" type="button"
                        disabled={settingsDisabled || agitatorRequestPending} onClick={this.toggleAgitatorPause}>
                        {agitatorRuntime.paused ? 'Rührwerk fortsetzen' : 'Rührwerk pausieren'}
                    </button>}
                    {this.state.mainAgitatorError && <p className="agitatorError" role="alert">Rührwerk konnte nicht aktualisiert werden.</p>}
                </section>

                <section className="settingsGroup" aria-labelledby="water-settings-title">
                    <h4 id="water-settings-title">Wasser</h4>
                    <div className="intervalSettings manualWaterSettings" aria-labelledby="manual-water-settings-title">
                        <h5 id="manual-water-settings-title">Manuelle Wasserzufuhr</h5>
                        <div className="settingsRowWater manualWaterControls">
                            <div className="leftAligned">
                                {renderSwitch('Wasser aktivieren', waterSwitchState, this.toggleWaterSwitchState)}
                            </div>
                            <div className="rightAligned">
                                <QuantityPicker initialValue={1} min={1} max={this.MAX_WATER_LEVEL} onChange={this.onSetWaterChangeQuantity}
                                                isDisabled={settingsDisabled || waterSwitchState} label="Liter" labelPosition="above"/>
                            </div>
                        </div>
                    </div>
                    <div className="recipeWaterButtons">
                        <button className="recipeWaterBtn" disabled={spargeWaterDisabled} onClick={this.startSpargeWaterFilling}>{this.getRecipeWaterButtonLabel('sparge')}</button>
                        <button className="recipeWaterBtn" disabled={mashWaterDisabled} onClick={this.startMashWaterFilling}>{this.getRecipeWaterButtonLabel('mash')}</button>
                    </div>
                </section>
                <div className="startBtnDiv">
                    <button className="startBtn" disabled={this.isStartButtonDisabled()} onClick={this.startBrewing}>Start</button>
                </div>
            </div>);
    }

    renderWater() {
        const {currentAgitatorSpeed, brewingStatus} = this.props;
        const displayedWaterLiters = this.getDisplayedWaterLiters();

        return (

            <div className="Water">
                <WaterControl filledLiters={displayedWaterLiters} label={this.getDisplayedWaterLabel()} agitatorSpeed={currentAgitatorSpeed}
                              agitatorState={getAgitatorActive(this.props.realtimeState, this.props.socketConnected) === true}
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

    confirmCurrentWaitingState = () => {
        const request = getConfirmationRequestViewModel(this.props.brewingStatus);
        if (!request?.canConfirm || !request.confirmState || this.props.isConfirmPending) return;
        this.props.confirm(request.confirmState);
    }


    confirmFinishDialog = async () => {
        const {selectedBeer, addFinishedBrew, isAddingFinishedBrew, pendingFinishedBrewPayload} = this.props;
        if (!selectedBeer || isAddingFinishedBrew || this.isFinishedBrewSaveRequestPending) {
            return;
        }

        this.isFinishedBrewSaveRequestPending = true;
        const finishedBrew = pendingFinishedBrewPayload ?? {
                name: selectedBeer.name || 'Unknown Beer',
                liters: 0,
                originalwort:  0,
                residual_extract:  0, // Default value added
                note: '', // Default value added
                startDate: new Date().toISOString().slice(0, 10),
                beer_id: selectedBeer.id.toString(), // Assuming beer_id is a string
                active: true,
                state: eBrewState.FERMENTATION,
                brewValues: dataCollector.getAllDataAsJSONString()
            };
        addFinishedBrew(finishedBrew);
    };
    renderProcessList() {
        const { selectedBeer, brewingStatus } = this.props;
        if (selectedBeer === undefined) {
            return null;
        }
        const isNextStepDisabled = !this.isNextProcedureStepAvailable();
        return (
            <ProcessList displayMode="overview" selectedBeer={selectedBeer} currentStepIndex={brewingStatus?.currentStep?.index ?? 0} currentStep={brewingStatus?.currentStep} brewingStatus={brewingStatus} remainingSeconds={this.state.displayedRemainingSeconds} onNextStep={this.props.debug ? this.handleNextProcedureStep : undefined} isNextStepDisabled={isNextStepDisabled} />
        );
    }

    renderCurrentStep() {
        const {selectedBeer, brewingStatus} = this.props;
        if (selectedBeer === undefined) {
            return null;
        }
        return <ProcessList displayMode="current" selectedBeer={selectedBeer} currentStepIndex={brewingStatus?.currentStep?.index ?? 0} currentStep={brewingStatus?.currentStep} brewingStatus={brewingStatus} remainingSeconds={this.state.displayedRemainingSeconds} confirmationPending={this.props.isConfirmPending} confirmationError={this.props.confirmError} onConfirmWaiting={this.confirmCurrentWaitingState} hopReminderName={this.state.showHopsDialog ? this.state.hopName : undefined} onCompleteHopReminder={this.confirmHopDialog} />;
    }


    render() {
        const {showFinishDialog} = this.state;
        const equipmentAlarmActive = isEquipmentAlarmActive(getAlarmSnapshot(this.props.realtimeState, this.props.socketConnected));
        return (
            <div className="containerProduction ">
                {this.props.isBrewingStatusStale && <div role="alert" className="production-stale-status">Controller nicht erreichbar – angezeigter Braustatus ist veraltet.</div>}
                {this.props.brewingStartError && <div role="alert">Braustart fehlgeschlagen: {this.props.brewingStartError}</div>}
                <ProductionDialogs
                    showFinishDialog={showFinishDialog}
                    onConfirmFinish={this.confirmFinishDialog}
                    isSavingFinishedBrew={this.props.isAddingFinishedBrew}
                    finishedBrewSaveError={this.props.addFinishedBrewError}
                    showEquipmentAlarmDialog={equipmentAlarmActive && !this.state.equipmentAlarmDismissed}
                    equipmentAlarmTitle={equipmentAlarmDisplay.title}
                    equipmentAlarmMessage={equipmentAlarmDisplay.message}
                    onDismissEquipmentAlarm={() => this.setState({equipmentAlarmDismissed: true})}
                />

                {this.renderHeader()}
                <div className="left">
                    {this.renderWater()}
                    {this.renderFlames()}
                </div>
                <div className="list">
                    {this.renderProcessList()}  {/* Hier deine List-Renderfunktion */}
                </div>
                <div className="meters">
                    {this.renderCurrentStep()}
                    {this.renderTemperature()}
                </div>
                {this.renderSettings()}
                {this.renderInfo()}


            </div>
        )
    }


}
