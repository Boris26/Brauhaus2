import React from 'react';
import {Beer} from "../../model/Beer";
import {connect} from "react-redux";

import './Production.css'
import Timeline from "./Timeline/Timeline";
import WaterControl from "../../components/Controlls/WaterControll/WaterControl";
import ThermometerBeer from "../../components/Controlls/Thermometer/ThermometerBeer";

interface ProductionProps {
    selectedBeer: Beer;
}
class Production extends React.Component<ProductionProps> {
    constructor(props: ProductionProps) {
        {
            super(props);
        }
    }
    render() {
        const { selectedBeer } = this.props;
        return (
            <div className="parent">
                <div className="div1">info</div>
                <div className="div2">
                    <ThermometerBeer targetTemperature={60} temperature={50}></ThermometerBeer>
                </div>
                <div className="div3">
                    <Timeline pauses={5}></Timeline>
                </div>
                <div className="div4">
                    <WaterControl liters={30}></WaterControl>
                </div>
            </div>
        );

    }
}

const mapStateToProps = (state: any) => ({selectedBeer: state.selectedBeer});
export default connect(mapStateToProps)(Production);
