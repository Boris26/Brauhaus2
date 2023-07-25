import React from 'react';
import {Beer} from "../../model/Beer";
import {connect} from "react-redux";

import './Production.css'
import Timeline from "./Timeline/Timeline";
import WaterControl from "../../components/Controlls/WaterControll/WaterControl";
import Flame from "../../components/Flame/Flame";
import {ProductionActions} from "../../actions/actions";
import Gauge from "../../components/Controlls/Gauge/Gauge";
import MyKnob from "../../components/Controlls/Knob/Knob";
import {ToggleState} from "../../enums/eToggleState";

interface ProductionProps {
    selectedBeer: Beer;
    temperature: number;
    agiatorState: ToggleState;
    agiatorSpeed: number;
    getTemperatures: () => void;
    toggleAgiator: (agiatorState: ToggleState) => void;
    setAgiatorSpeed: (agiatorSpeed: number) => void;
}

interface ProductionState {
    temperature: number;
    agiatorState: ToggleState;
}
class Production extends React.Component<ProductionProps, ProductionState> {
    constructor(props: ProductionProps) {
        super(props);
        this.state = {
            temperature: 0,
            agiatorState: ToggleState.OFF
        }

    }

    componentDidMount() {
        this.props.getTemperatures();
    }

    componentDidUpdate(prevProps: Readonly<ProductionProps>, prevState: Readonly<{}>, snapshot?: any) {
        if (prevProps.temperature !== this.props.temperature) {
            this.setState({temperature: this.props.temperature})
        }
        if (prevProps.agiatorState !== this.props.agiatorState) {
            this.setState({agiatorState: this.props.agiatorState})
        }

    }

    toggleAgitator = () => {
        {
            if (this.props.agiatorState === ToggleState.ON)
                this.props.toggleAgiator(ToggleState.OFF);
            else
                this.props.toggleAgiator(ToggleState.ON);
        }
    }

    onAgiatorSpeedChange = (value: number) => {
        this.props.setAgiatorSpeed(value);
    }

    onIntervalChancge = (value: number) => {
        console.log(value);
    }

    onClickInterval = () => {
        console.log('click');
    }


    render() {
        const { selectedBeer, temperature,agiatorSpeed,agiatorState} = this.props;
        const infinitySymbol = '\u221E';
        console.log(agiatorState);
        return (
            <div className="angry-grid">
                <div id="item-0">
                    <WaterControl liters={20} agitatorSpeed={agiatorSpeed} agitatorState={agiatorState}></WaterControl>
                </div>
                <div id="item-2" style={{ display: 'flex', alignItems: 'center'}}>
                    <div>
                        <MyKnob label={"Geschindigkeit"} max={25} min={5} currentValue={agiatorSpeed} isAktive={agiatorState} onClick={this.toggleAgitator} onValueChange={this.onAgiatorSpeedChange} />
                    </div>
                    <div style={{marginTop:'-30px' ,marginLeft:'20px'}}>
                        <Gauge value={60} targetValue={60} offset={2} minValue={10} maxValue={100} label={infinitySymbol} />
                    </div>


                    <div style={{ width: '2px', height: '180px', backgroundColor: 'black', margin: '0 50px' }}></div> {/* Vertikaler Trennstrich */}
                    <MyKnob label={"Pause"} min={0} max={10} onClick={this.onClickInterval} onValueChange={this.onIntervalChancge} isAktive={ToggleState.OFF} currentValue={0}></MyKnob>
                    <div style={{ width: '30px' }}></div> {/* Leerer Raum mit 20px Breite */}
                    <MyKnob label={"Laufzeit"} min={0} max={10} onClick={this.onClickInterval} onValueChange={this.onIntervalChancge} isAktive={ToggleState.OFF} currentValue={0}></MyKnob>
                </div>
                <div id="item-3">
                    <Gauge value={60} targetValue={60} offset={2} minValue={10} maxValue={100} label={'°C'} />
                    <Gauge value={60} targetValue={50} offset={2} minValue={0} maxValue={70} label={'Liter'} />

                </div>
                <div id="item-4">4</div>
                <div id="item-5">
                    <Flame></Flame>
                    <Flame></Flame>
                    <Flame></Flame>
                    <Flame></Flame>
                </div>
                <div id="item-6">
                    <Timeline pauses={5} ></Timeline>
                </div>
            </div>
        );
    }

}

const mapDispatchToProps = (dispatch: any) => ({
    getTemperatures: () => { dispatch(ProductionActions.getTemperatures()) },
    toggleAgiator: (agiatorState: ToggleState) => { dispatch(ProductionActions.toggleAgitator(agiatorState)) },
    setAgiatorSpeed: (agiatorSpeed: number) => { dispatch(ProductionActions.setAgitatorSpeed(agiatorSpeed)) }
});
const mapStateToProps = (state: any) => (
    {
        selectedBeer: state.selectedBeer,
        temperature: state.productionReducer.temperature,
        agiatorState: state.productionReducer.agitatorState,
        agiatorSpeed: state.productionReducer.agitatorSpeed
    });
export default connect(mapStateToProps,mapDispatchToProps)(Production);
