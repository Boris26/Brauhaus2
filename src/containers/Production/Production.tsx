import React from 'react';
import {Beer} from "../../model/Beer";
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
    startWaterFilling:(liters:number)=>void;
    isWaterFillingSuccessful:boolean;
    isToggleAgitatorSuccess:boolean;
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
        const {getTemperatures,agitatorSpeed,agitatorIsRunning} = this.props;
        getTemperatures();
    }

    componentDidUpdate(prevProps: Readonly<ProductionProps>, prevState: Readonly<ProductionState>, snapshot?: any) {
        const {toggleAgitator,getTemperatures,agitatorSpeed,agitatorIsRunning} = this.props;
        const {intervalSwitchState, mainSwitchState,waterSwitchState} = this.state;
        console.log(this.props.isToggleAgitatorSuccess)
        if (prevProps.temperature !== this.props.temperature) {
            this.setState({temperature: this.props.temperature})
        }
        if(this.props.isToggleAgitatorSuccess === false && mainSwitchState)
        {
            const delay = 300;
            setTimeout(() => {
                this.setState({ mainSwitchState: false ,mainAgitatorError:true});
            }, delay);
        }
        if(prevState.intervalSwitchState ==! this.state.intervalSwitchState && mainSwitchState) {
            toggleAgitator(this.setAgitatorStates(mainSwitchState));
        }
        if(prevState.heatingAndStirringSwitchState ==! this.state.heatingAndStirringSwitchState && mainSwitchState)
        {
            toggleAgitator(this.setAgitatorStates(mainSwitchState));
        }

        if(this.props.isWaterFillingSuccessful===false && waterSwitchState)
        {
            const delay = 300;
            setTimeout(() => {
                this.setState({ waterSwitchState: false ,waterFillingError:true});
            }, delay);
        }
    }
    setAgitatorStates(mainSwitchState:boolean)
    {
        const {agitatorSpeed,runningTime,breakTime,intervalSwitchState,heatingAndStirringSwitchState} = this.state;
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
        }
        else {
            toggleAgitator(this.setAgitatorStates(false));
            this.setState({mainSwitchState: false});
        }


    }
    toggleInterval = () => {
        const {intervalSwitchState,mainSwitchState,agitatorSpeed} = this.state;

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
       const {setAgitatorSpeed}= this.props
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

    toggleWaterSwitchState=()=>
    {
        const {waterSwitchState,liters,} = this.state;
        const {startWaterFilling} = this.props;
        if (waterSwitchState === false) {
            this.setState({waterSwitchState: true});
            startWaterFilling(liters);
        } else {
            this.setState({waterSwitchState: false});
        }
    }



    render() {
        const timelineData:TimelineData = {
            type: 'heating', elapsed: 12
        }
        const timelineData2:TimelineData = {
            type: 'rest', elapsed: 21
        }
        const timelineData3:TimelineData = {
            type: 'heating', elapsed: 12
        }
        const timelineData4:TimelineData = {
            type: 'rest', elapsed: 21
        }


        const { selectedBeer, temperature,setedAgitatorSpeed,setedAgitatorState,agitatorSpeed,agitatorIsRunning} = this.props;
        const { intervalSwitchState, mainSwitchState,heatingAndStirringSwitchState,waterSwitchState,waterFillingError,isWaterSwitchBlinking,mainAgitatorError } = this.state;
        const infinitySymbol = '\u221E';
        return (
            <div className="containerProduction ">
                <div className="HeaderProduction">
                    <div className='HeaderText'>
                        {selectedBeer?.name}
                    </div>
                </div>
                <div className="Water">
                    <WaterControl liters={10} agitatorSpeed={setedAgitatorSpeed} agitatorState={agitatorIsRunning}></WaterControl>
                </div>
                <div className="Agitator" >
                    <div style={{position: 'relative',marginTop:'50px'}}>
                        <MyKnob label={"Geschwindigkeit"} max={20} min={0} currentValue={setedAgitatorSpeed} isAktive={agitatorIsRunning} onClick={this.toggleAgitator} onValueChange={this.onAgitatorSpeedChange} />
                    </div>
                    <div style={{marginTop:'20px' ,marginLeft:'20px'}}>
                        <Gauge value={agitatorSpeed} targetValue={setedAgitatorSpeed} offset={1} minValue={0} maxValue={20} label={infinitySymbol} />
                    </div>
                </div>
                    <div className="Settings" >
                        <h3>Settings</h3>
                        <QuantityPicker initialValue={1} min={1} max={30} onChange={this.onIntervalChangeBreakTime} isDisabled={false} label="Pausenzeit" labelPosition="above" />
                        <QuantityPicker initialValue={1} min={1} max={30} onChange={this.onIntervalChangeRunningTime}  isDisabled={false} label="Laufzeit" labelPosition="above"/>

                    <div >
                        <FormControl component="fieldset" variant="standard">
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Switch className={mainAgitatorError ? 'blinking-button' : ''} checked={mainSwitchState} onChange={this.toggleAgitator} name="MainSwitch" />
                                    }
                                    label="Hauptschaler"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch  checked={intervalSwitchState} onChange={this.toggleInterval} name="IntervalSwitch" />
                                    }
                                    label="Interval"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch  checked={heatingAndStirringSwitchState} onChange={this.toggleHeatingAndStirring} name="HeatingAndStirringSwitch" />
                                    }
                                    label="Heizphase"
                                />
                            </FormGroup>

                        </FormControl>
                    </div>
                        <QuantityPicker initialValue={3} min={5} max={30} onChange={this.onSetWaterChangeQuantity} isDisabled={waterSwitchState} label="Liter" labelPosition="above" />
                        <div >
                            <FormControl component="fieldset" variant="standard">
                                <FormGroup>
                                    <FormControlLabel
                                        control={
                                            <Switch className={waterFillingError ? 'blinking-button' : ''} checked={waterSwitchState} onChange={this.toggleWaterSwitchState} name="MainSwitch" />
                                        }
                                        label="Automatik"
                                    />
                                </FormGroup>
                            </FormControl>
                        </div>
                    </div>
                <div className="Temp">
                    <Gauge value={20} targetValue={60} offset={1} minValue={0} maxValue={100} label={"°C"} />
                 </div>
                <div className="Info">
                    <div className="timeContainer">
                        <div className="frame">
                            <span className="label">Laufzeit</span>
                            <span className="time">09:10</span>
                        </div>
                    </div>
                    <div className="timeContainer">
                        <div className="frame">
                            <span className="label">Zielzeit</span>
                            <span className="time">10:00</span>
                        </div>
                    </div>

                </div>




                <div className='Flame'>
                    <Flame></Flame>
                    <Flame></Flame>
                    <Flame></Flame>
                    <Flame></Flame>
                </div>
                <div className='Timeline'>
                    <div className="timeline">
                        <Timeline timeLineData={[timelineData,timelineData2,timelineData3,timelineData4]}></Timeline>
                    </div>

                </div>
            </div>
        )}

}

const mapDispatchToProps = (dispatch: any) => ({
    getTemperatures: () => { dispatch(ProductionActions.getTemperatures()) },
    toggleAgitator: (agitatorState: MashAgitatorStates) => { dispatch(ProductionActions.toggleAgitator(agitatorState)) },
    startWaterFilling:(liters:number)=>{dispatch(ProductionActions.startWaterFilling(liters))},
    setAgitatorSpeed: (agitatorSpeed: number) => { dispatch(ProductionActions.setAgitatorSpeed(agitatorSpeed)) },
});
const mapStateToProps = (state: any) => (
    {
        selectedBeer: state.beerDataReducer.selectedBeer,
        temperature: state.productionReducer.temperature,
        setedAgitatorState: state.productionReducer.setedAgitatorState,
        setedAgitatorSpeed: state.productionReducer.setedAgitatorSpeed,
        agitatorIsRunning:state.productionReducer.agitatorIsRunning,
        agitatorSpeed:state.productionReducer.agitatorSpeed,
        isWaterFillingSuccessful: state.productionReducer.isWaterFillingSuccessful,
        isToggleAgitatorSuccess: state.productionReducer.isToggleAgitatorSuccess
    });
export default connect(mapStateToProps,mapDispatchToProps)(Production);
