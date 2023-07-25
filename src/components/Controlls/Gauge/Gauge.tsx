import * as React from 'react';
import { Chart } from 'react-google-charts';

interface GaugeProps {
    value: number;
    targetValue: number;
    minValue: number;
    maxValue: number;
    offset: number;
    label: string;
}


interface GaugeState {
    value: number;
    redFrom: number;
    redTo: number;
    yellowFrom: number;
    yellowTo: number;
    greenFrom: number;
    greenTo: number;

}
class Gauge extends React.Component<GaugeProps,GaugeState> {
    constructor(props: GaugeProps) {
        super(props);
        this.state = {
            value: 0,
            redFrom: 0,
            redTo: 0,yellowFrom: 0,
            yellowTo: 0,
            greenFrom: 0,
            greenTo: 0,
        }
    }
    componentDidMount() {
     this.calculateAreas();
    }

    calculateAreas()
    {
        const {value,targetValue} = this.props;
        const redFrom = 10;
        const redTo = targetValue - 2;
        const yellowFrom = targetValue + 2;
        const yellowTo = 100;
        const greenFrom = targetValue - 2;
        const greenTo = targetValue + 2;

        this.setState({redFrom: redFrom,redTo: redTo,yellowFrom: yellowFrom,yellowTo: yellowTo,greenFrom: greenFrom,greenTo: greenTo});
    }


    render() {
        const { redFrom,redTo,yellowFrom,yellowTo,greenFrom,greenTo } = this.state
        const {value,targetValue,label,minValue,maxValue} = this.props;

            return (<div>
                <Chart
                    height={190}
                    chartType="Gauge"
                    loader={<div></div>}
                    data={[
                        ["Label", "Value"],
                        [label, Number(value)]
                    ]}
                    options={{
                        greenFrom: greenFrom,
                        greenTo: greenTo,
                        redFrom: redFrom,
                        redTo: redTo,
                        yellowColor: '#DC3912',
                        yellowFrom:yellowFrom,
                        yellowTo: yellowTo,
                        minorTicks: 5,
                        min: minValue,
                        max: maxValue,
                    }}
                />
            </div>

            );
        }
}

export default Gauge;
