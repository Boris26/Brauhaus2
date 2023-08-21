import React from 'react';
import _ from 'lodash';
import {Beer, FermentationSteps} from "../../model/Beer";
import {connect} from "react-redux";

import './Production.css'
import Timeline, {TimelineData} from "./Timeline/Timeline";
import WaterControl from "../../components/Controlls/WaterControll/WaterControl";
import Flame from "../../components/Flame/Flame";
import {ProductionActions} from "../../actions/actions";
import Gauge from "../../components/Controlls/Gauge/Gauge";
import MyKnob from "../../components/Controlls/Knob/Knob";
import {ToggleState} from "../../enums/eToggleState";
import {FormControl, FormControlLabel, FormGroup, FormLabel, Switch} from '@mui/material';
import {MashAgitatorStates} from "../../model/MashAgitator";
import QuantityPicker from '../../components/Controlls/QuantityPicker/QuantityPicker';
import {BrewingData} from "../../model/BrewingData";
import {BrewingStatus} from "../../model/BrewingStatus";
import {TimeFormatter} from "../../utils/TimeFormatter";

interface ProductionProps {
    selectedBeer: Beer;
    temperature: number;
    setedAgitatorState: ToggleState;
    setedAgitatorSpeed: number;
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
}

class Production extends React.Component<ProductionProps, ProductionState> {
    private blinkIntervalMainSwitch: NodeJS.Timeout | null = null;
    private blinkIntervalWaterSwitch: NodeJS.Timeout | null = null;
    private timelineData: TimelineData[] = [];

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
            isMainSwitchBlinking: false
        }
    }

    componentDidMount() {
        const {getTemperatures, agitatorSpeed, agitatorIsRunning} = this.props;
        getTemperatures();
    }

    componentDidUpdate(prevProps: Readonly<ProductionProps>, prevState: Readonly<ProductionState>, snapshot?: any) {
        const {toggleAgitator, getTemperatures, agitatorSpeed, agitatorIsRunning} = this.props;
        const {intervalSwitchState, mainSwitchState, waterSwitchState} = this.state;
        console.log(this.props.isToggleAgitatorSuccess)
        if (prevProps.temperature !== this.props.temperature) {
            this.setState({temperature: this.props.temperature})
        }
        if (this.props.isToggleAgitatorSuccess === false && mainSwitchState) {
            const delay = 300;
            setTimeout(() => {
                this.setState({mainSwitchState: false, mainAgitatorError: true});
            }, delay);
        }
        if (prevState.intervalSwitchState == !this.state.intervalSwitchState && mainSwitchState) {
            toggleAgitator(this.setAgitatorStates(mainSwitchState));
        }
        if (prevState.heatingAndStirringSwitchState == !this.state.heatingAndStirringSwitchState && mainSwitchState) {
            toggleAgitator(this.setAgitatorStates(mainSwitchState));
        }

        if (this.props.isWaterFillingSuccessful === false && waterSwitchState) {
            const delay = 300;
            setTimeout(() => {
                this.setState({waterSwitchState: false, waterFillingError: true});
            }, delay);
        }
        if (this.props?.brewingStatus?.HeatingStates !== prevProps?.brewingStatus?.HeatingStates) {
            let timelineData: TimelineData | undefined;
            if (this.props.brewingStatus.HeatUpStatus) {
                timelineData = {
                    type: 'heating', elapsed: this.props.brewingStatus?.elapsedTime
                }
            } else {
                timelineData = {
                    type: 'rast', elapsed: this.props.brewingStatus?.elapsedTime
                }
            }
            if (timelineData !== undefined) {
                this.timelineData.push(timelineData);
            }

        }
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
        if (mainSwitchState === false) {

            toggleAgitator(this.setAgitatorStates(true));
            this.setState({mainSwitchState: true});
        } else {
            toggleAgitator(this.setAgitatorStates(false));
            this.setState({mainSwitchState: false});
        }


    }
    toggleInterval = () => {
        const {intervalSwitchState, mainSwitchState, agitatorSpeed} = this.state;

        if (intervalSwitchState === false) {
            this.setState({intervalSwitchState: true});

        } else {
            this.setState({intervalSwitchState: false});
        }
    }
    toggleHeatingAndStirring = () => {
        const {heatingAndStirringSwitchState} = this.state;
        if (heatingAndStirringSwitchState === false) {
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
        console.log(value);
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
        if (waterSwitchState === false) {
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
        console.log(TimeFormatter.seconds(time))
        return TimeFormatter.seconds(time);
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

    renderTimeline() {
        return (<div className='Timeline'>
            <div className="timeline">
                <Timeline timeLineData={this.timelineData}></Timeline>
            </div>

        </div>);
    }

    renderInfo() {
        const {brewingStatus} = this.props;
        return (
            <div className="Info">
                <div className="timeContainer">
                    <div className="frame">
                        <span className="label">Laufzeit</span>
                        <span className="time">{this.formatTime(brewingStatus?.elapsedTime)}</span>
                    </div>
                </div>
                <div className="timeContainer">
                    <div className="frame">
                        <span className="label">Zielzeit</span>
                        <span className="time">{this.formatTime(brewingStatus?.currentTime)}</span>
                    </div>
                </div>
                <div>
                    <span>{brewingStatus?.StatusText}</span>
                </div>
            </div>);
    }

    renderTemperature() {
        const {brewingStatus} = this.props;
        return (<div className="Temp">
            <Gauge value={brewingStatus?.Temperature} targetValue={brewingStatus?.TargetTemperature} height={300}
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
        return (<div className="Settings">
            <h3>Settings</h3>
            <QuantityPicker initialValue={1} min={1} max={30} onChange={this.onIntervalChangeBreakTime}
                            isDisabled={false} label="Pausenzeit" labelPosition="above"/>
            <QuantityPicker initialValue={1} min={1} max={30} onChange={this.onIntervalChangeRunningTime}
                            isDisabled={false} label="Laufzeit" labelPosition="above"/>
            <div>
                <FormControl component="fieldset" variant="standard">
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Switch className={mainAgitatorError ? 'blinking-button' : ''} checked={mainSwitchState}
                                        onChange={this.toggleAgitator} name="MainSwitch"/>
                            }
                            label="Hauptschaler"
                        />
                        <FormControlLabel
                            control={
                                <Switch checked={intervalSwitchState} onChange={this.toggleInterval}
                                        name="IntervalSwitch"/>
                            }
                            label="Interval"
                        />
                        <FormControlLabel
                            control={
                                <Switch checked={heatingAndStirringSwitchState} onChange={this.toggleHeatingAndStirring}
                                        name="HeatingAndStirringSwitch"/>
                            }
                            label="Heizphase"
                        />
                    </FormGroup>

                </FormControl>
                <button className="startButton" onClick={this.startBrewing}>Start</button>
                <button className="startButton" onClick={this.startPolling}>Start</button>
            </div>
            <QuantityPicker initialValue={3} min={5} max={30} onChange={this.onSetWaterChangeQuantity}
                            isDisabled={waterSwitchState} label="Liter" labelPosition="above"/>
            <div>
                <FormControl component="fieldset" variant="standard">
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Switch className={waterFillingError ? 'blinking-button' : ''}
                                        checked={waterSwitchState} onChange={this.toggleWaterSwitchState}
                                        name="MainSwitch"/>
                            }
                            label="Automatik"
                        />
                    </FormGroup>
                </FormControl>
            </div>
        </div>);
    }

    rednerAgitator() {
        const infinitySymbol = '\u221E';
        const {setedAgitatorSpeed, agitatorIsRunning, agitatorSpeed} = this.props;
        return (<div className="Agitator">
            <div style={{position: 'relative', marginTop: '50px'}}>
                <MyKnob label={"Geschwindigkeit"} max={20} min={0} currentValue={setedAgitatorSpeed}
                        isAktive={agitatorIsRunning} onClick={this.toggleAgitator}
                        onValueChange={this.onAgitatorSpeedChange}/>
            </div>
            <div style={{marginTop: '20px', marginLeft: '20px'}}>
                <Gauge value={agitatorSpeed} targetValue={setedAgitatorSpeed} height={190} offset={1} minValue={0}
                       maxValue={20} label={infinitySymbol}/>
            </div>
        </div>);
    }

    renderWater() {
        const {setedAgitatorSpeed, agitatorIsRunning} = this.props;
        return (
            <div className="Water">
                <WaterControl liters={10} agitatorSpeed={setedAgitatorSpeed}
                              agitatorState={agitatorIsRunning}></WaterControl>
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


    render() {
        this.createTimelineData();
        return (
            <div className="containerProduction ">
                {this.renderHeader()}
                {this.renderWater()}
                {this.rednerAgitator()}
                {this.renderSettings()}
                {this.renderTemperature()}
                {this.renderFlames()}
                {this.renderTimeline()}
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
});
const mapStateToProps = (state: any) => (
    {
        selectedBeer: state.beerDataReducer.selectedBeer,
        temperature: state.productionReducer.temperature,
        setedAgitatorState: state.productionReducer.setedAgitatorState,
        setedAgitatorSpeed: state.productionReducer.setedAgitatorSpeed,
        agitatorIsRunning: state.productionReducer.agitatorIsRunning,
        agitatorSpeed: state.productionReducer.agitatorSpeed,
        isWaterFillingSuccessful: state.productionReducer.isWaterFillingSuccessful,
        isToggleAgitatorSuccess: state.productionReducer.isToggleAgitatorSuccess,
        brewingStatus: state.productionReducer.brewingStatus,
    });
export default connect(mapStateToProps, mapDispatchToProps)(Production);
