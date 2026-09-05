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
import {BrewingDisplayTimeAnchor, createBrewingDisplayTimeAnchor, projectBrewingDisplayTime, shouldCountdownLocally} from "./utils/productionCountdown";
import {getAlarmSnapshot, getAgitatorActive, getHeatingActive, isControllerAvailable as getIsControllerAvailable} from "./utils/productionStatus";
import {RecipeWaterFill, RecipeWaterFillStatus} from "./waterFill/recipeWaterFill.types";
import {completeWaterFill, createInitialRecipeWaterFillStatus, failWaterFill, includePreparedSpargeAfterMashingOut, markValveOpened, resetWaterFill, startManualWaterFill, startWaterFill} from "./waterFill/recipeWaterFillState";
import {ProductionDialogs} from "./components/ProductionDialogs";
import {ProductionTemperatureTimeline} from "./TemperatureTimeline/ProductionTemperatureTimeline";
import {getDisplayedWaterLiters as selectDisplayedWaterLiters, getWaterLabel, getWaterTargetLiters, isRecipeWaterButtonDisabled as selectRecipeWaterButtonDisabled, isWaterFillingActive as selectWaterFillingActive, shouldIncludeSpargeAfterMashingOut as selectShouldIncludeSpargeAfterMashingOut, sanitizeLiters} from "./waterFill/recipeWaterFillSelectors";
import {equipmentAlarmDisplay, heaterStuckOnAlarmDisplay, isEquipmentAlarmActive, isHeaterStuckOnAlarmActive} from '../../utils/brewingStatus/alarmDisplay';
import {getConfirmationRequestViewModel} from '../../utils/brewingStatus/selectors';
import {ConfirmStates} from '../../enums/eConfirmStates';
import {AgitatorConfig, AgitatorMode, AgitatorRuntimeStatus} from '../../model/Agitator';
import {ProductionRepository} from '../../repositorys/ProductionRepository';
import {AgitatorSettingsRepository} from '../../repositorys/AgitatorSettingsRepository';
import {RealtimeControllerState} from '../../model/RealtimeControllerState';
import {formatTemperature, getTemperatureSensorMessage, isTemperatureSensorReady} from '../../utils/temperatureSensor';
import {AgitatorIntervalProgress} from './components/AgitatorIntervalProgress';

export const AGITATOR_SPEED_DEBOUNCE_MS = 300;

export interface ProductionProps {
    selectedBeer?: Beer;
    temperature: number;
    currentAgitatorState: ToggleState;
    currentAgitatorSpeed: number;
    agitatorSpeed: number;
    agitatorIsRunning: ToggleState;
    toggleAgitator: (agitatorState: MashAgitatorStates) => void; // legacy Redux connection
    setAgitatorSpeed: (agitatorSpeed: number) => void;
    startWaterFilling: (liters: number) => void;
    isWaterFillingSuccessful: boolean;
    isToggleAgitatorSuccess: boolean;
    sendBrewingData: (brewingData: BrewingData) => void;
    brewingStatus?: BrewingStatus;
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
    agitatorModeDraft?: AgitatorMode;
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
    displayedStepElapsedSeconds: number | undefined;
    displayedProcessElapsedSeconds: number | undefined;
    equipmentAlarmDismissed: boolean;
}

export class Production extends React.Component<ProductionProps, ProductionState> {
    private isBrewingStartRequestPending = false;
    private isFinishedBrewSaveRequestPending = false;
    private readonly MAX_WATER_LEVEL = 70;
    private remainingTimeInterval: NodeJS.Timeout | null = null;
    private brewingDisplayTimeAnchor: BrewingDisplayTimeAnchor | undefined;
    private agitatorSpeedDebounceTimeout: NodeJS.Timeout | null = null;
    private waterErrorTimeout: NodeJS.Timeout | null = null;
    private isMountedComponent = false;
    private agitatorFreshnessGeneration = 0;
    private agitatorLoadGeneration = 0;
    private agitatorIntentGeneration = 0;
    private queuedAgitatorConfig?: {config: AgitatorConfig; generation: number};
    private agitatorConfigRequestRunning = false;

    constructor(props: ProductionProps) {
        super(props);
        this.state = {
            agitatorConfig: undefined,
            agitatorRuntime: undefined,
            agitatorSpeedDraft: undefined,
            agitatorIntervalDraft: undefined,
            agitatorModeDraft: undefined,
            agitatorRequestPending: false,
            agitatorStatusLoadFailed: false,
            waterSwitchState: false,
            liters: 1,
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
            displayedStepElapsedSeconds: undefined,
            displayedProcessElapsedSeconds: undefined,
            equipmentAlarmDismissed: false
        }
    }

    componentDidMount() {
        this.isMountedComponent = true;
        const {selectedBeer} = this.props;
        if (!isUndefined(selectedBeer)) {
            this.calculateTheHopTimes();
        }
        this.loadAgitatorStatus();
        this.syncRemainingTimeFromStatus();
        this.remainingTimeInterval = setInterval(this.tickRemainingTime, 1000);
    }

    componentWillUnmount() {
        this.isMountedComponent = false;
        this.queuedAgitatorConfig = undefined;
        this.clearAgitatorSpeedDebounce();
        if (this.remainingTimeInterval !== null) {
            clearInterval(this.remainingTimeInterval);
            this.remainingTimeInterval = null;
        }
        this.clearWaterErrorTimeout();
    }


    componentDidUpdate(prevProps: Readonly<ProductionProps>, prevState: Readonly<ProductionState>) {
        const {brewingStatus,isWaterFillingSuccessful, waterStatus} = this.props;
        const {waterSwitchState,showFinishDialog} = this.state;
        const selectedRecipeChanged = prevProps.selectedBeer?.id !== this.props.selectedBeer?.id;


        if (prevProps.brewingStatus !== brewingStatus) {
            this.syncRemainingTimeFromStatus();
        }
        if (prevProps.realtimeState?.agitator !== this.props.realtimeState?.agitator && this.props.socketConnected && this.props.realtimeState?.agitator) {
            this.mergeAgitatorPoll(this.props.realtimeState.agitator);
        }

        if (getIsControllerAvailable(prevProps.isBackenAvailable) && !this.isControllerAvailable()) {
            this.clearAgitatorSpeedDebounce();
        }
        if (!getIsControllerAvailable(prevProps.isBackenAvailable) && this.isControllerAvailable() && !this.state.agitatorRuntime) {
            this.loadAgitatorStatus();
        }

        const previousAlarms = getAlarmSnapshot(prevProps.realtimeState, prevProps.socketConnected);
        const currentAlarms = getAlarmSnapshot(this.props.realtimeState, this.props.socketConnected);
        if ((isEquipmentAlarmActive(previousAlarms) && !isEquipmentAlarmActive(currentAlarms))
            || (isHeaterStuckOnAlarmActive(previousAlarms) && !isHeaterStuckOnAlarmActive(currentAlarms))) {
            this.setState({equipmentAlarmDismissed: false});
        }

        if (selectedRecipeChanged) {
            this.resetRecipeWaterFillState({indexOfCurrentStep: 0});
            this.calculateTheHopTimes();
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
        if (prevProps.brewingStartError !== this.props.brewingStartError && this.props.brewingStartError) {
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
            if (this.waterErrorTimeout === null) this.waterErrorTimeout = setTimeout(() => {
                this.waterErrorTimeout = null;
                if (this.isMountedComponent) {
                    this.failActiveRecipeWaterFill();
                }
            }, 300);
        } else {
            this.clearWaterErrorTimeout();
        }
        if (typeof brewingStatus?.currentStep?.index === "number" && brewingStatus.currentStep.index !== prevProps?.brewingStatus?.currentStep?.index) {
            this.setState({indexOfCurrentStep: brewingStatus.currentStep.index});
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
                this.setState({showFinishDialog: false, brewingFinished: true});
            }
        }

    }

    private clearWaterErrorTimeout = (): void => {
        if (this.waterErrorTimeout !== null) {
            clearTimeout(this.waterErrorTimeout);
            this.waterErrorTimeout = null;
        }
    };

    loadAgitatorStatus = async (): Promise<void> => {
        const loadGeneration = ++this.agitatorLoadGeneration;
        const freshnessAtStart = this.agitatorFreshnessGeneration;
        const [defaultsResult, detailResult] = await Promise.allSettled([
            AgitatorSettingsRepository.get(),
            ProductionRepository.getAgitatorStatus(),
        ]);
        if (!this.isMountedComponent
            || loadGeneration !== this.agitatorLoadGeneration
            || freshnessAtStart !== this.agitatorFreshnessGeneration) return;

        if (detailResult.status === 'fulfilled') {
            const detail = detailResult.value;
            const hasCurrentRuntimeConfig = detail.config.mode !== 'OFF';
            const config = hasCurrentRuntimeConfig || defaultsResult.status !== 'fulfilled'
                ? detail.config
                : {
                    ...detail.config,
                    speedPercent: defaultsResult.value.speed,
                    runningMinutes: defaultsResult.value.intervalOnMinutes,
                    breakMinutes: defaultsResult.value.intervalOffMinutes,
                };
            this.setState({
                agitatorConfig: config,
                agitatorIntervalDraft: undefined,
                agitatorStatusLoadFailed: false,
                agitatorRuntime: {
                    mode: config.mode,
                    paused: detail.runtime.paused,
                    operation: detail.runtime.desiredOperation,
                    intervalPhase: detail.runtime.intervalPhase,
                    intervalProgressPercent: detail.runtime.intervalProgressPercent,
                    actualOutputOn: detail.runtime.actualOutputOn,
                }
            });
            return;
        }

        console.error('Rührwerkstatus konnte nicht geladen werden', detailResult.reason);
        if (defaultsResult.status === 'fulfilled') {
            const defaults = defaultsResult.value;
            this.setState({
                agitatorConfig: {
                    mode: 'OFF',
                    speedPercent: defaults.speed,
                    runningMinutes: defaults.intervalOnMinutes,
                    breakMinutes: defaults.intervalOffMinutes,
                },
                agitatorIntervalDraft: undefined,
                agitatorStatusLoadFailed: false,
            });
            return;
        }

        // The remaining production screen stays usable when neither runtime state nor defaults are available.
        console.error('Rührwerk-Defaults konnten nicht geladen werden', defaultsResult.reason);
        this.setState({agitatorStatusLoadFailed: true});
    }

    mergeAgitatorPoll = (poll: AgitatorRuntimeStatus): void => {
        this.agitatorFreshnessGeneration += 1;
        this.setState((previous) => ({
            agitatorRuntime: {...previous.agitatorRuntime, ...poll},
            agitatorConfig: previous.agitatorConfig ? {
                    ...previous.agitatorConfig,
                    mode: poll.mode,
                    ...(typeof poll.speedPercent === 'number' ? {speedPercent: poll.speedPercent} : {}),
                    ...(typeof poll.runningMinutes === 'number' ? {runningMinutes: poll.runningMinutes} : {}),
                    ...(typeof poll.breakMinutes === 'number' ? {breakMinutes: poll.breakMinutes} : {}),
                } : typeof poll.speedPercent === 'number'
                    && typeof poll.runningMinutes === 'number'
                    && typeof poll.breakMinutes === 'number'
                    ? {
                        mode: poll.mode,
                        speedPercent: poll.speedPercent,
                        runningMinutes: poll.runningMinutes,
                        breakMinutes: poll.breakMinutes,
                    }
                    : undefined,
            agitatorSpeedDraft: previous.agitatorSpeedDraft !== undefined && poll.speedPercent === previous.agitatorSpeedDraft
                ? undefined
                : previous.agitatorSpeedDraft,
            agitatorIntervalDraft: previous.agitatorIntervalDraft
                && poll.runningMinutes === previous.agitatorIntervalDraft.runningMinutes
                && poll.breakMinutes === previous.agitatorIntervalDraft.breakMinutes
                ? undefined
                : previous.agitatorIntervalDraft,
            agitatorModeDraft: previous.agitatorModeDraft !== undefined && poll.mode === previous.agitatorModeDraft
                ? undefined
                : previous.agitatorModeDraft,
            mainAgitatorError: false,
        }));
    }

    getDesiredAgitatorConfig = (): AgitatorConfig | undefined => {
        const {agitatorConfig, agitatorSpeedDraft, agitatorIntervalDraft, agitatorModeDraft} = this.state;
        if (!agitatorConfig) return undefined;
        return {
            ...agitatorConfig,
            ...(agitatorModeDraft !== undefined ? {mode: agitatorModeDraft} : {}),
            ...(agitatorSpeedDraft !== undefined ? {speedPercent: agitatorSpeedDraft} : {}),
            ...agitatorIntervalDraft,
        };
    }

    submitAgitatorConfig = async (config: AgitatorConfig): Promise<boolean> => {
        const generation = ++this.agitatorIntentGeneration;
        this.queuedAgitatorConfig = {config, generation};
        this.setState({mainAgitatorError: false});
        return this.drainAgitatorConfigQueue();
    }

    private drainAgitatorConfigQueue = async (): Promise<boolean> => {
        if (this.agitatorConfigRequestRunning) return true;
        let latestResult = true;
        this.agitatorConfigRequestRunning = true;
        try {
            while (this.queuedAgitatorConfig) {
                const request = this.queuedAgitatorConfig;
                this.queuedAgitatorConfig = undefined;
                const authorityAtStart = this.agitatorFreshnessGeneration;
                try {
                    await ProductionRepository.setAgitatorConfig(request.config);
                    latestResult = true;
                } catch (error) {
                    latestResult = false;
                    if (this.isMountedComponent
                        && request.generation === this.agitatorIntentGeneration
                        && authorityAtStart === this.agitatorFreshnessGeneration) {
                        this.setState((previous) => {
                            const desired = this.getDesiredAgitatorConfig();
                            const requestIsStillCurrent = desired !== undefined && this.sameAgitatorConfig(desired, request.config);
                            return {
                                agitatorSpeedDraft: requestIsStillCurrent ? undefined : previous.agitatorSpeedDraft,
                                agitatorIntervalDraft: requestIsStillCurrent ? undefined : previous.agitatorIntervalDraft,
                                agitatorModeDraft: requestIsStillCurrent ? undefined : previous.agitatorModeDraft,
                                mainAgitatorError: true,
                            };
                        });
                    }
                }
            }
        } finally {
            this.agitatorConfigRequestRunning = false;
        }
        return latestResult;
    }

    private sameAgitatorConfig = (left: AgitatorConfig, right: AgitatorConfig): boolean =>
        left.mode === right.mode && left.speedPercent === right.speedPercent
        && left.runningMinutes === right.runningMinutes && left.breakMinutes === right.breakMinutes;

    toggleAgitatorMode = (mode: Exclude<AgitatorMode, 'OFF'>, checked: boolean): void => {
        const config = this.getDesiredAgitatorConfig();
        if (!this.isControllerAvailable() || !config) return;
        const nextMode: AgitatorMode = checked ? mode : (config.mode === mode ? 'OFF' : config.mode);
        if (nextMode !== config.mode) {
            this.agitatorFreshnessGeneration += 1;
            this.setState({agitatorModeDraft: nextMode, mainAgitatorError: false}, () => {
                const desired = this.getDesiredAgitatorConfig();
                if (desired) void this.submitAgitatorConfig(desired);
            });
        }
    }

    toggleAgitatorPause = async (): Promise<void> => {
        const runtime = this.state.agitatorRuntime;
        if (!runtime || runtime.mode === 'OFF' || this.state.agitatorRequestPending) return;
        const generation = ++this.agitatorIntentGeneration;
        const authorityAtStart = this.agitatorFreshnessGeneration;
        this.setState({agitatorRequestPending: true, mainAgitatorError: false});
        try {
            if (runtime.paused) await ProductionRepository.resumeAgitator();
            else await ProductionRepository.pauseAgitator();
            if (this.isMountedComponent) this.setState({agitatorRequestPending: false});
        } catch (error) {
            if (this.isMountedComponent) this.setState((previous) => ({
                agitatorRequestPending: false,
                mainAgitatorError: generation === this.agitatorIntentGeneration
                    && authorityAtStart === this.agitatorFreshnessGeneration
                    ? true
                    : previous.mainAgitatorError,
            }));
        }
    }

    syncRemainingTimeFromStatus = (): void => {
        const nowMs = Date.now();
        this.brewingDisplayTimeAnchor = createBrewingDisplayTimeAnchor(this.props.brewingStatus, nowMs);
        const displayTime = projectBrewingDisplayTime(this.props.brewingStatus, this.brewingDisplayTimeAnchor, nowMs);
        this.setState({
            displayedRemainingSeconds: displayTime.remainingSeconds,
            displayedStepElapsedSeconds: displayTime.stepElapsedSeconds,
            displayedProcessElapsedSeconds: displayTime.processElapsedSeconds,
        }, () => this.checkForHopAddition(displayTime.stepElapsedSeconds));
    }

    tickRemainingTime = (): void => {
        const {brewingStatus} = this.props;
        if (!this.shouldCountdownLocally(brewingStatus)) {
            return;
        }
        const displayTime = projectBrewingDisplayTime(brewingStatus, this.brewingDisplayTimeAnchor, Date.now());
        this.setState({
            displayedRemainingSeconds: displayTime.remainingSeconds,
            displayedStepElapsedSeconds: displayTime.stepElapsedSeconds,
            displayedProcessElapsedSeconds: displayTime.processElapsedSeconds,
        }, () => this.checkForHopAddition(displayTime.stepElapsedSeconds));
    }

    shouldCountdownLocally = (aBrewingStatus?: BrewingStatus): boolean => {
        return shouldCountdownLocally(aBrewingStatus);
    }

    checkForHopAddition(aDisplayedStepElapsed?: number) {
        const {hopSchedule, announcedHopTimes, showHopsDialog} = this.state;
        if (showHopsDialog) return;
        if (this.props.brewingStatus?.currentStep?.phase !== ProcessPhase.COOKING || !this.shouldCountdownLocally(this.props.brewingStatus)) return;
        const aCookingElapsed = Math.floor(aDisplayedStepElapsed ?? this.props.brewingStatus.currentStep.elapsedTime ?? 0);
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
        this.setState({
            hopSchedule: selectedBeer ? calculateHopSchedule(selectedBeer) : [],
            announcedHopTimes: [],
            showHopsDialog: false,
            hopName: ''
        });
    }

    onAgitatorSpeedChange = (value: number) => {
        if (!this.isControllerAvailable() || !this.state.agitatorConfig) {
            return;
        }
        this.agitatorFreshnessGeneration += 1;
        this.setState({agitatorSpeedDraft: value, mainAgitatorError: false});
        this.clearAgitatorSpeedDebounce();
        this.agitatorSpeedDebounceTimeout = setTimeout(() => {
            this.agitatorSpeedDebounceTimeout = null;
            if (this.isControllerAvailable()) {
                const config = this.getDesiredAgitatorConfig();
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
        const config = this.getDesiredAgitatorConfig();
        if (!this.isControllerAvailable() || !config) return;
        this.agitatorFreshnessGeneration += 1;
        this.setState({agitatorIntervalDraft: {runningMinutes: config.runningMinutes, breakMinutes: value}, mainAgitatorError: false}, () => {
            const desired = this.getDesiredAgitatorConfig();
            if (desired) void this.submitAgitatorConfig(desired);
        });
    }

    onIntervalChangeRunningTime = (value: number) => {
        const config = this.getDesiredAgitatorConfig();
        if (!this.isControllerAvailable() || !config) return;
        this.agitatorFreshnessGeneration += 1;
        this.setState({agitatorIntervalDraft: {runningMinutes: value, breakMinutes: config.breakMinutes}, mainAgitatorError: false}, () => {
            const desired = this.getDesiredAgitatorConfig();
            if (desired) void this.submitAgitatorConfig(desired);
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
        const heaterSafetyAlarmActive = isHeaterStuckOnAlarmActive(getAlarmSnapshot(this.props.realtimeState, this.props.socketConnected));
        return isUndefined(selectedBeer) || !this.isControllerAvailable() || !isTemperatureSensorReady(this.props.realtimeState?.temperatureSensor, this.props.socketConnected) || heaterSafetyAlarmActive || this.state.brewingIsRunning || this.isBrewingStartRequestPending || !this.isControlBrewingStartAvailable();
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
        const isHeating = getHeatingActive(this.props.realtimeState, this.props.socketConnected) === true;

        return (
            <div className='Flame'>
              {isHeating && (
                    <div className="flame-strip">
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
                    displayNowSeconds={this.state.displayedProcessElapsedSeconds}
                    displayCurrentStepElapsedSeconds={this.state.displayedStepElapsedSeconds}
                />
            </div>
        );
    }

    renderTemperature() {
        const {brewingStatus} = this.props;
        const sensor = this.props.realtimeState?.temperatureSensor;
        const value = isTemperatureSensorReady(sensor, this.props.socketConnected) ? sensor.current : null;
        const targetValue = isNaN(Number(brewingStatus?.temperature?.target)) ? 0 : Number(brewingStatus?.temperature?.target);
        return (<div className="Temp" aria-label={`Aktuelle Temperatur: ${formatTemperature(value)}`}>
            {value === null ? <div className="temperatureUnavailable" role="status">{formatTemperature(value)}</div> : <Gauge showAreas={true} value={value} targetValue={targetValue}
                   height={220}
                   offset={1} minValue={0} maxValue={100} label={"°C"}/>}
        </div>);
    }

    renderSettings() {
        const {waterSwitchState, agitatorConfig, agitatorRuntime, agitatorSpeedDraft, agitatorIntervalDraft, agitatorModeDraft, agitatorRequestPending, agitatorStatusLoadFailed} = this.state;
        const displayedAgitatorMode = agitatorModeDraft ?? agitatorConfig?.mode;
        const settingsDisabled = !this.isControllerAvailable();
        const mashWaterDisabled = settingsDisabled || this.isRecipeWaterButtonDisabled('mash');
        const spargeWaterDisabled = settingsDisabled || this.isRecipeWaterButtonDisabled('sparge');
        const intervalProgressActive = this.props.socketConnected === true
            && agitatorRuntime?.mode === 'AUTOMATIC'
            && agitatorRuntime.operation === 'INTERVAL';
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

                <div className="settingsContent">
                    <section className="settingsGroup agitatorSettingsGroup" aria-labelledby="agitator-settings-title">
                        <h4 id="agitator-settings-title">Rührwerk</h4>
                        {(settingsDisabled || !agitatorConfig) && <p className="agitatorAvailability" role="status">
                            {agitatorStatusLoadFailed || settingsDisabled ? 'Rührwerk-Konfiguration nicht verfügbar' : 'Rührwerk-Konfiguration wird geladen'}
                        </p>}
                        <div className="agitatorPrimaryMode">
                            {renderSwitch('Durchgehend rühren', displayedAgitatorMode === 'CONTINUOUS',
                                (checked) => this.toggleAgitatorMode('CONTINUOUS', checked), settingsDisabled || !agitatorConfig)}
                        </div>
                        <div className={`intervalSettings agitatorAutomaticSettings ${displayedAgitatorMode === 'AUTOMATIC' ? 'is-active' : ''}`} aria-labelledby="interval-settings-title">
                            <div className="agitatorAutomaticHeader">
                                <h5 id="interval-settings-title">Automatik</h5>
                                <Switch className="productionSwitch" onChange={(checked) => this.toggleAgitatorMode('AUTOMATIC', checked)}
                                    checked={displayedAgitatorMode === 'AUTOMATIC'} height={24} width={44} handleDiameter={18}
                                    checkedIcon={false} uncheckedIcon={false} disabled={settingsDisabled || !agitatorConfig}
                                    aria-label="Automatik" />
                            </div>
                            <div className="agitatorIntervalProgressRow">
                                <AgitatorIntervalProgress active={intervalProgressActive} paused={agitatorRuntime?.paused ?? false}
                                    progress={agitatorRuntime?.intervalProgressPercent} />
                            </div>
                            <div className="intervalTimeControls">
                                <div className="intervalTimeControl" data-testid="running-minutes-stepper">
                                    <QuantityPicker value={agitatorIntervalDraft?.runningMinutes ?? agitatorConfig?.runningMinutes}
                                        min={0} max={Number.MAX_SAFE_INTEGER} onChange={this.onIntervalChangeRunningTime}
                                        isDisabled={settingsDisabled || !agitatorConfig || displayedAgitatorMode !== 'AUTOMATIC'} label="Laufzeit" labelPosition="above"/>
                                    <span className="intervalTimeUnit">min</span>
                                </div>
                                <div className="intervalTimeControl" data-testid="break-minutes-stepper">
                                    <QuantityPicker value={agitatorIntervalDraft?.breakMinutes ?? agitatorConfig?.breakMinutes}
                                        min={0} max={Number.MAX_SAFE_INTEGER} onChange={this.onIntervalChangeBreakTime}
                                        isDisabled={settingsDisabled || !agitatorConfig || displayedAgitatorMode !== 'AUTOMATIC'} label="Pausenzeit" labelPosition="above"/>
                                    <span className="intervalTimeUnit">min</span>
                                </div>
                            </div>
                        </div>
                        <label className="agitatorSpeedControl">
                            <span>Geschwindigkeit <strong>{agitatorConfig ? `${agitatorSpeedDraft ?? agitatorConfig.speedPercent} %` : '–'}</strong></span>
                            <input type="range" min="0" max="100" value={agitatorSpeedDraft ?? agitatorConfig?.speedPercent ?? 0}
                                   disabled={settingsDisabled || !agitatorConfig} onChange={(event) => this.onAgitatorSpeedChange(Number(event.target.value))}/>
                        </label>
                        <div className="agitatorFooter">
                            <button className="agitatorPauseButton" type="button"
                                disabled={settingsDisabled || agitatorRequestPending || !agitatorRuntime || agitatorRuntime.mode === 'OFF'}
                                onClick={this.toggleAgitatorPause}>
                                {agitatorRuntime?.paused ? 'Rührwerk fortsetzen' : 'Rührwerk pausieren'}
                            </button>
                            {this.state.mainAgitatorError && <p className="agitatorError" role="alert">Rührwerk konnte nicht aktualisiert werden.</p>}
                        </div>
                    </section>

                    <section className="settingsGroup waterSettingsGroup" aria-labelledby="water-settings-title">
                        <h4 id="water-settings-title">Wasser</h4>
                        <div className="intervalSettings manualWaterSettings" aria-labelledby="manual-water-settings-title">
                            <h5 id="manual-water-settings-title">Manuelle Wasserzufuhr</h5>
                            <div className="settingsRowWater manualWaterControls">
                                <div className="leftAligned">
                                    {renderSwitch('Wasser aktivieren', waterSwitchState, this.toggleWaterSwitchState)}
                                </div>
                                <div className="rightAligned">
                                    <QuantityPicker value={this.state.liters} min={1} max={this.MAX_WATER_LEVEL} onChange={this.onSetWaterChangeQuantity}
                                                    isDisabled={settingsDisabled || waterSwitchState} label="Liter" labelPosition="above"/>
                                </div>
                            </div>
                        </div>
                        <div className="recipeWaterGroup" aria-label="Rezeptmengen">
                            <span className="recipeWaterGroupLabel">Rezeptmengen</span>
                            <div className="recipeWaterButtons">
                                <button className="recipeWaterBtn" disabled={spargeWaterDisabled} onClick={this.startSpargeWaterFilling}>{this.getRecipeWaterButtonLabel('sparge')}</button>
                                <button className="recipeWaterBtn" disabled={mashWaterDisabled} onClick={this.startMashWaterFilling}>{this.getRecipeWaterButtonLabel('mash')}</button>
                            </div>
                        </div>
                    </section>
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
        const fermentationStartedAt = new Date().toISOString();
        const finishedBrew = pendingFinishedBrewPayload ?? {
                name: selectedBeer.name || 'Unknown Beer',
                liters: 0,
                originalwort:  0,
                residual_extract:  0, // Default value added
                note: '', // Default value added
                startDate: fermentationStartedAt.slice(0, 10),
                fermentationStartedAt,
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
        const sensorReady = isTemperatureSensorReady(this.props.realtimeState?.temperatureSensor, this.props.socketConnected);
        const heaterSafetyAlarmActive = isHeaterStuckOnAlarmActive(getAlarmSnapshot(this.props.realtimeState, this.props.socketConnected));
        const startWarning = heaterSafetyAlarmActive
            ? 'Brauvorgang kann wegen eines aktiven Heizungs-Sicherheitsalarms nicht gestartet werden.'
            : !sensorReady ? `Brauvorgang kann nicht gestartet werden: ${getTemperatureSensorMessage(this.props.realtimeState?.temperatureSensor)}.` : undefined;
        return <ProcessList displayMode="current" selectedBeer={selectedBeer} currentStepIndex={brewingStatus?.currentStep?.index ?? 0} currentStep={brewingStatus?.currentStep} brewingStatus={brewingStatus} remainingSeconds={this.state.displayedRemainingSeconds} confirmationPending={this.props.isConfirmPending} confirmationError={this.props.confirmError} onConfirmWaiting={this.confirmCurrentWaitingState} hopReminderName={this.state.showHopsDialog ? this.state.hopName : undefined} onCompleteHopReminder={this.confirmHopDialog} onStartBrewing={this.startBrewing} isStartBrewingDisabled={this.isStartButtonDisabled()} startBrewingWarning={startWarning} />;
    }


    render() {
        const {showFinishDialog} = this.state;
        const alarms = getAlarmSnapshot(this.props.realtimeState, this.props.socketConnected);
        const heaterSafetyAlarmActive = isHeaterStuckOnAlarmActive(alarms);
        const equipmentAlarmActive = isEquipmentAlarmActive(alarms);
        const activeAlarmDisplay = heaterSafetyAlarmActive ? heaterStuckOnAlarmDisplay : equipmentAlarmDisplay;
        return (
            <div className="containerProduction ">
                {this.props.isBrewingStatusStale && <div role="alert" className="production-stale-status">Controller nicht erreichbar – angezeigter Braustatus ist veraltet.</div>}
                {this.props.brewingStartError && <div role="alert">Braustart fehlgeschlagen: {this.props.brewingStartError}</div>}
                <ProductionDialogs
                    showFinishDialog={showFinishDialog}
                    onConfirmFinish={this.confirmFinishDialog}
                    isSavingFinishedBrew={this.props.isAddingFinishedBrew}
                    finishedBrewSaveError={this.props.addFinishedBrewError}
                    showEquipmentAlarmDialog={(heaterSafetyAlarmActive || equipmentAlarmActive) && !this.state.equipmentAlarmDismissed}
                    equipmentAlarmTitle={activeAlarmDisplay.title}
                    equipmentAlarmMessage={activeAlarmDisplay.message}
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
