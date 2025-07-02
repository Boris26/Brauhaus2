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
import {BrewingStatus} from "../../model/BrewingStatus";
import {TimeFormatter} from "../../utils/TimeFormatter";
import ModalDialog, {DialogType} from "../../components/ModalDialog/ModalDialog";
import {ProgressBar} from "react-bootstrap";
import {MashingType} from "../../enums/eMashingType";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faRepeat} from '@fortawesome/free-solid-svg-icons';
import Switch from "react-switch";
import {TextMapper} from "../../utils/TextMapper";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {FinishedBrew} from "../../model/FinishedBrew";
import {eBrewState} from "../../enums/eBrewState";
import {BackendAvailable} from "../../reducers/productionReducer";
import {ProcessList} from "./ProcessList/ProcessList";
export interface ProcessStep {
    name: string;
}
interface ProductionProps {
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
    brewingStatus: BrewingStatus;
    startPolling: () => void;
    stopPolling: () => void;
    checkIsBackenAvailable: () => void;
    isBackenAvailable: BackendAvailable;
    waterStatus: WaterStatus;
    addFinishedBrew: (finishedBrew: FinishedBrew) => void;
    nextProcedureStep: () => void;
}

interface ProductionState {
    temperature: number;
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
    showFinishDialog: boolean
    brewingFinished: boolean
}

class Production extends React.Component<ProductionProps, ProductionState> {
    private blinkIntervalMainSwitch: NodeJS.Timeout | null = null;
    private blinkIntervalWaterSwitch: NodeJS.Timeout | null = null;
    private timelineData: TimelineData[] = [];
    private readonly MAX_AGITATOR_SPEED = 40;
    private readonly MAX_WATER_LEVEL = 70;
    private readonly MAX_INTERVAL_TIME = 10;
    private readonly MIN_INTERVAL_TIME = 10;
    private readonly MAX_BREAK_TIME = 10;
    private readonly MAX_RUNNING_TIME = 10;

    constructor(props: ProductionProps) {
        super(props);
        this.state = {
            temperature: 0,
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
            showFinishDialog: false,
            brewingFinished: false
        }
    }

    componentDidMount() {
        const {getTemperatures, agitatorSpeed, agitatorIsRunning, selectedBeer, checkIsBackenAvailable} = this.props;

        checkIsBackenAvailable();
        if (!isUndefined(selectedBeer)) {
            this.calculateTheHopTimes();
        }
        getTemperatures();
    }


    componentDidUpdate(prevProps: Readonly<ProductionProps>, prevState: Readonly<ProductionState>) {
        const {toggleAgitator, brewingStatus,isBackenAvailable,temperature,isToggleAgitatorSuccess,isWaterFillingSuccessful} = this.props;
        const {intervalSwitchState, mainSwitchState, waterSwitchState,heatingAndStirringSwitchState,showHopsDialog,showFinishDialog} = this.state;

        if (prevProps.isBackenAvailable !== isBackenAvailable) {
            //todo
            if (!isBackenAvailable.isBackenAvailable) {
              //  this.setState({showErrorDialog: true})
            } else {
               // this.setState({showErrorDialog: false})
            }
        }

        if (prevProps.temperature !== temperature) {
            this.setState({temperature: temperature})
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
        if (brewingStatus?.HeatingStates !== prevProps?.brewingStatus?.HeatingStates) {
            let timelineData: TimelineData | undefined;
            if (brewingStatus.HeatUpStatus) {
                timelineData = {
                    type: 'heating', elapsed: brewingStatus?.elapsedTime
                }
            } else {
                timelineData = {
                    type: 'rast', elapsed: brewingStatus?.elapsedTime
                }
            }
            if (timelineData !== undefined) {
                this.timelineData.push(timelineData);
            }

        }
        if (brewingStatus?.Type === MashingType.COOKING && !showHopsDialog) {
            this.checkForHopAddition()
        }
        if(brewingStatus?.Type === MashingType.FINISH && ! showFinishDialog ! && !this.state.brewingFinished)
        {
            this.setState({showFinishDialog: true})
        }

    }

    checkForHopAddition() {
        const {hopsTimes} = this.state;
        const {brewingStatus} = this.props;
        const roundedElapsedTime = Math.floor(brewingStatus.elapsedTime)
            if (hopsTimes.hasOwnProperty(roundedElapsedTime)) {
                const value = hopsTimes[roundedElapsedTime];
                this.setState({showHopsDialog: true, hopName: value});
            }

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
        this.setState({hopsTimes: hopsDict});
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
    startBrewing = () => {
        const {selectedBeer, sendBrewingData} = this.props;
        const ein = selectedBeer.fermentation.find(item => item.type === 'Einmaischen');
        const aus = selectedBeer.fermentation.find(item => item.type === 'Abmaischen');

        if (ein?.temperature !== undefined && aus?.temperature !== undefined) {
            const brewingData: BrewingData = {
                MashdownTemperature: aus.temperature,
                MashupTemperature: ein.temperature,
                CookingTemperature: selectedBeer.cookingTemperatur,
                CookingTime: selectedBeer.cookingTime,
                Rasten: selectedBeer.fermentation
            }
            sendBrewingData(brewingData);
        }
    }

    startPolling = () => {
        const {startPolling} = this.props;
        startPolling();
    }

    formatTime = (time: number) => {
        return TimeFormatter.formatSecondsToHMS(time);
    }

    createTimelineData() {
        const {brewingStatus} = this.props;

        if (this.timelineData.length > 0) {
            const lastObject = _.last(this.timelineData);
            if (lastObject) {
                lastObject.elapsed = brewingStatus?.elapsedTime;
            }
        }
    }

    renderFlames() {
        const {brewingStatus} = this.props;

        return (
            <div className='Flame'>
              {brewingStatus?.HeatUpStatus === true && (
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
        let currentTime = '----';
       if(!isNaN(brewingStatus?.elapsedTime))
       {
           elapsedTime = this.formatTime(brewingStatus?.elapsedTime);
       }
       if(!isNaN(brewingStatus?.currentTime))
       {
           currentTime = this.formatTime(brewingStatus?.currentTime);
       }

        if(currentTime )
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
                        <span className="time">{currentTime}</span>
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
        const {brewingStatus, waterStatus} = this.props;
        return (<div className="Temp">
            <Gauge showAreas={true} value={brewingStatus?.Temperature} targetValue={brewingStatus?.TargetTemperature}
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
                <div className="startBtnDiv">
                    <button className="startBtn" disabled={isUndefined(selectedBeer) || !this.props.isBackenAvailable.isBackenAvailable} onClick={this.startBrewing}>Start</button>
                </div>
                <div className="startPollingBtnDiv">
                    <button className="startPollingBtn" onClick={this.startBrewing}>
                        <FontAwesomeIcon icon={faRepeat as IconProp} />
                    </button>
                </div>
            </div>);
    }

    renderAgitator() {
        const infinitySymbol = '\u221E';
        const {liters} = this.state;
        const {currentAgitatorSpeed, agitatorIsRunning, agitatorSpeed, waterStatus} = this.props;
        return (<div className="Agitator">

            <div className="GaugeContainer">
                <Gauge showAreas={true} value={agitatorSpeed} targetValue={currentAgitatorSpeed} height={200} offset={1}
                       minValue={0}
                       maxValue={this.MAX_AGITATOR_SPEED} label={infinitySymbol}/>
            </div>
            <div className="GaugeContainer">
                <Gauge showAreas={false} value={waterStatus?.liters} targetValue={liters} height={200}
                       offset={0.5} minValue={0} maxValue={this.MAX_WATER_LEVEL} label={"Liter"}/>
            </div>
        </div>);
    }

    renderWater() {
        const {currentAgitatorSpeed, agitatorIsRunning, brewingStatus, waterStatus} = this.props;

        return (

            <div className="Water">
                <WaterControl liters={waterStatus.liters} agitatorSpeed={currentAgitatorSpeed}
                              agitatorState={brewingStatus?.AgitatorStatus}></WaterControl>

            </div>);
    }

    renderProgressBar() {
        const {brewingStatus} = this.props;
        let statusText = '';
        if (!isUndefined(brewingStatus)) {
            if (brewingStatus.WaitingStatus) {
                statusText = TextMapper.mapToText(brewingStatus?.StatusText);
            }
                if(brewingStatus.HeatUpStatus && brewingStatus.Type !== MashingType.COOKING){
                    return (
                        <div className="container mt-4">
                            <h3 className='progressLabel'>{brewingStatus.Name}</h3>
                            <p className='progressLabel'>{statusText}</p>
                        </div>
                    );
                }
                const finishedInPercent = Math.round(brewingStatus?.elapsedTime * 100 / brewingStatus?.currentTime);


                const progressBarStyle = {
                    width: '43rem',    // Width of the progress bar
                    height: '3rem',    // Height of the progress bar
                    marginLeft: '1rem'
                };
                return (
                    <div className="container mt-4">
                        <h3 className='progressLabel'>{brewingStatus.Name}</h3>
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

    confirmErrorDialog() {

    }


    confirmFinishDialog = async () => {
        const { stopPolling, selectedBeer, addFinishedBrew } = this.props;
        this.setState({ showFinishDialog: false, brewingFinished: true });
        stopPolling();
        // FinishedBrew erzeugen und speichern
        if (selectedBeer) {
            const finishedBrew : FinishedBrew = {
                id: uuidv4(),
                name: selectedBeer.name || 'Unknown Beer',
                liters: 0,
                originalwort:  0,
                residual_extract:  0, // Standardwert hinzugefügt
                note: '', // Standardwert hinzugefügt
                startDate: new Date().toISOString().slice(0, 10),
                beer_id: selectedBeer.id.toString(), // Assuming beer_id is a string
                active: true,
                state: eBrewState.FERMENTATION
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
        const {showErrorDialog} = this.state
        const {isBackenAvailable} = this.props
        const contentText = 'Die Brau-Steuerung ist nicht erreichbar\n\n' + isBackenAvailable.statusText
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
        const processSteps: ProcessStep[] = [
            { name: "Heating up for mashing-in" },
            { name: "Mashing-in" },
            { name: "Heating up for rest 1" },
            { name: "Rest 1" },
            { name: "Heating up for rest 2" },
            { name: "Rest 2" },
            { name: "Heating up for mashing-out" },
            { name: "Mashing-out" },
        ];
        const currentStepIndex = 2; // Das kannst du dynamisch aus dem Status holen!
        return (
            <div>
            <ProcessList steps={processSteps} currentStepIndex={currentStepIndex} />
                <button className="nextStepBtn" onClick={this.props.nextProcedureStep} title="Nächster Prozessschritt">
                    Nächster Schritt
                </button>
            </div>)

    }


    render() {
        const {isBackenAvailable} = this.props;
        const {showHopsDialog,showFinishDialog} = this.state;
        this.createTimelineData();
        return (
            <div className="containerProduction ">
                {
                    //showHopsDialog &&
                    //(this.renderHopDialog())
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
    checkIsBackenAvailable: () => {
        dispatch(ProductionActions.checkIsBackenAvailable())
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
        waterStatus: state.productionReducer.waterStatus

    });
export default connect(mapStateToProps, mapDispatchToProps)(Production);
