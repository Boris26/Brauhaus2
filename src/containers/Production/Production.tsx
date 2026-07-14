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
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState} from "../../model/brewingStatus.types";
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
    isBackenAvailable: BackendAvailable;
    waterStatus: WaterStatus;
    addFinishedBrew: (finishedBrew: FinishedBrew) => void;
    nextProcedureStep: () => void;
    isPollingRunning: boolean;
}

type RecipeWaterFill = 'mash' | 'sparge';
type RecipeWaterFillResetState = Pick<ProductionState, 'completedMashWaterFill' | 'completedSpargeWaterFill' | 'pendingRecipeWaterFill' | 'waterFillHasStarted'>;

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
    completedMashWaterFill: boolean;
    completedSpargeWaterFill: boolean;
    pendingRecipeWaterFill: RecipeWaterFill | undefined;
    waterFillHasStarted: boolean;
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
            completedMashWaterFill: false,
            completedSpargeWaterFill: false,
            pendingRecipeWaterFill: undefined,
            waterFillHasStarted: false
        }
    }

    componentDidMount() {
        const {getTemperatures, selectedBeer} = this.props;
        if (!isUndefined(selectedBeer)) {
            this.calculateTheHopTimes();
        }
        getTemperatures();
    }


    componentDidUpdate(prevProps: Readonly<ProductionProps>, prevState: Readonly<ProductionState>) {
        const {toggleAgitator, brewingStatus,isBackenAvailable,temperature,isToggleAgitatorSuccess,isWaterFillingSuccessful, waterStatus} = this.props;
        const {intervalSwitchState, mainSwitchState, waterSwitchState,heatingAndStirringSwitchState,showHopsDialog,showFinishDialog, indexOfCurrentStep} = this.state;


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

        if (waterStatus?.openClose === true && !prevProps.waterStatus?.openClose) {
            this.setState({waterFillHasStarted: true});
        }

        if (prevProps.waterStatus?.openClose === true && waterStatus?.openClose === false) {
            this.completePendingRecipeWaterFill();
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
                this.setState({waterSwitchState: false, waterFillingError: true});
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
            completedMashWaterFill: false,
            completedSpargeWaterFill: false,
            pendingRecipeWaterFill: undefined,
            waterFillHasStarted: false
        };
        this.setState(aAdditionalState === undefined ? resetState : {...resetState, ...aAdditionalState});
    }

    completePendingRecipeWaterFill = (): void => {
        const {pendingRecipeWaterFill, waterFillHasStarted} = this.state;
        if (!waterFillHasStarted || pendingRecipeWaterFill === undefined) {
            this.setState({waterSwitchState: false, waterFillHasStarted: false});
            return;
        }
        this.setState({
            waterSwitchState: false,
            waterFillHasStarted: false,
            pendingRecipeWaterFill: undefined,
            completedMashWaterFill: pendingRecipeWaterFill === 'mash' ? true : this.state.completedMashWaterFill,
            completedSpargeWaterFill: pendingRecipeWaterFill === 'sparge' ? true : this.state.completedSpargeWaterFill
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
        return this.state.waterSwitchState || this.props.waterStatus?.openClose === true;
    }

    startRecipeWaterFilling = (aRecipeWaterFill: RecipeWaterFill): void => {
        const volume = this.getRecipeWaterVolume(aRecipeWaterFill);
        if (volume === undefined || this.isWaterFillingActive()) {
            return;
        }
        this.setState({
            waterSwitchState: true,
            liters: volume,
            pendingRecipeWaterFill: aRecipeWaterFill,
            waterFillHasStarted: false
        });
        this.props.startWaterFilling(volume);
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
        this.isBrewingStartRequestPending = true;
        dataCollector.reset();
        this.resetRecipeWaterFillState();
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
                    <>
                        <Flame/>
                        <Flame/>
                        <Flame/>
                        <Flame/>
                    </>
              )}
            </div>
        );
    }

    renderInfo() {
        const {brewingStatus} = this.props;
        let elapsedTime = '----';
        let targetTime = '----';
       const currentElapsedTime = brewingStatus?.elapsedTime;
       if(typeof currentElapsedTime === 'number' && !isNaN(currentElapsedTime))
       {
           elapsedTime = this.formatTime(currentElapsedTime);
       }
       const stepDuration = Number(brewingStatus?.currentStep?.duration);
       if(Number.isFinite(stepDuration) && stepDuration > 0)
       {
           targetTime = this.formatTime(stepDuration);
       }

        if(targetTime )
        return (
            <div className="Info">
                <div className="timeContainer">
                    <div className="frame">
                        <span className="label">Laufzeit</span>
                        <span className="time">{elapsedTime}</span>
                    </div>
                </div>
                <div className="timeContainer">
                    <div className="frame">
                        <span className="label">Zielzeit</span>
                        <span className="time">{targetTime}</span>
                    </div>
                </div>
                <div>
                    {this.renderProgressBar()}
                </div>
                <div>

                </div>
            </div>);
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
            liters,
            waterFillingError,
            mainAgitatorError
        } = this.state;
        const {currentAgitatorSpeed, agitatorIsRunning, agitatorSpeed, waterStatus,selectedBeer} = this.props;
        const waterFillingActive = this.isWaterFillingActive();
        const mashWaterVolume = this.getRecipeWaterVolume('mash');
        const spargeWaterVolume = this.getRecipeWaterVolume('sparge');
        const mashWaterDisabled = waterFillingActive || this.state.completedMashWaterFill || mashWaterVolume === undefined;
        const spargeWaterDisabled = waterFillingActive || this.state.completedSpargeWaterFill || spargeWaterVolume === undefined;
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
                    <button className="recipeWaterBtn" disabled={mashWaterDisabled} onClick={this.startMashWaterFilling}>Hauptguss</button>
                    <button className="recipeWaterBtn" disabled={spargeWaterDisabled} onClick={this.startSpargeWaterFilling}>Nachguss</button>
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
        const {liters} = this.state;
        const {currentAgitatorSpeed, agitatorIsRunning, agitatorSpeed, waterStatus} = this.props;
        // Werte absichern
        const gaugeValue = isNaN(Number(agitatorSpeed)) ? 0 : Number(agitatorSpeed);
        const gaugeTarget = isNaN(Number(currentAgitatorSpeed)) ? 0 : Number(currentAgitatorSpeed);
        const waterValue = isNaN(Number(waterStatus?.liters)) ? 0 : Number(waterStatus?.liters);
        const waterTarget = isNaN(Number(liters)) ? 0 : Number(liters);
        return (<div className="Agitator">

            <div className="GaugeContainer">
                <Gauge showAreas={true} value={gaugeValue} targetValue={gaugeTarget} height={200} offset={1}
                       minValue={0}
                       maxValue={this.MAX_AGITATOR_SPEED} label={infinitySymbol}/>
            </div>
            <div className="GaugeContainer">
                <Gauge showAreas={false} value={waterValue} targetValue={waterTarget} height={200}
                       offset={0.5} minValue={0} maxValue={this.MAX_WATER_LEVEL} label={"Liter"}/>
            </div>
        </div>);
    }

    renderWater() {
        const {currentAgitatorSpeed, agitatorIsRunning, brewingStatus, waterStatus} = this.props;

        return (

            <div className="Water">
                <WaterControl liters={waterStatus.liters} agitatorSpeed={currentAgitatorSpeed}
                              agitatorState={brewingStatus?.hardware?.agitator === "ON"}></WaterControl>

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
                    width: '43rem',    // Width of the progress bar
                    height: '3rem',    // Height of the progress bar
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
        const contentText = errorDialogContent || ('Die Brau-Steuerung ist nicht erreichbar\n\n' + isBackenAvailable.statusText)
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
            <ProcessList selectedBeer={selectedBeer} currentStepIndex={brewingStatus?.currentStep?.index ?? 0} currentStep={brewingStatus?.currentStep} onNextStep={this.handleNextProcedureStep} isNextStepDisabled={!this.isNextProcedureStepAvailable()} />
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
                {this.renderAgitator()}
                {this.renderTemperature()}
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
