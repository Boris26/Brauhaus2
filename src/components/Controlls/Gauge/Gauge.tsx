import * as React from 'react';
import { Chart } from 'react-google-charts';

interface GaugeProps {
    value: number;
    targetValue: number;
    minValue: number;
    maxValue: number;
    offset: number;
    label: string;
    height:number;
    showAreas: boolean;
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

    componentDidUpdate(prevProps: Readonly<GaugeProps>, prevState: Readonly<GaugeState>, snapshot?: any) {
        if (prevProps.value !== this.props.value) {
            this.setState({value: this.props.value})
        }
        if (prevProps.targetValue !== this.props.targetValue) {
            this.calculateAreas();
        }
    }


    calculateAreas() {
        const { value, targetValue, offset, minValue, maxValue } = this.props;

        let greenFrom = Math.max(targetValue - 1, 0);
        let greenTo = Math.min(targetValue + 1, maxValue);

        let redFrom = minValue;
        let redTo = targetValue - offset;

        let yellowFrom = targetValue + offset;
        let yellowTo = maxValue;

        if (targetValue === 0) {
            greenFrom = greenTo = yellowFrom = yellowTo = redTo = redFrom = 0;
        } else if (targetValue + 1 > maxValue) {
            greenTo = maxValue;
            yellowFrom = yellowTo = 0;
        }

        this.setState({
            redFrom: redFrom,
            redTo: redTo,
            yellowFrom: yellowFrom,
            yellowTo: yellowTo,
            greenFrom: greenFrom,
            greenTo: greenTo,
        });
    }


    render() {
        const { redFrom,redTo,yellowFrom,yellowTo,greenFrom,greenTo } = this.state
        const {value,targetValue,label,minValue,maxValue,height,showAreas} = this.props;

        let gaugeOptions: Gauge;
        const optionsWithArea ={
            greenFrom: greenFrom,
            greenTo: greenTo,
            redFrom: redFrom,
            redTo: redTo,
            yellowFrom:yellowFrom,
            yellowTo: yellowTo,
            minorTicks: 10,
            min: minValue,
            max: maxValue,
        }
        const optionsWithoutArea={
            greenFrom: greenFrom,
            greenTo: greenTo,
            redFrom: redFrom,
            minorTicks: 10,
            min: minValue,
            max: maxValue,
        }
        const chartOptions = showAreas ? optionsWithArea : optionsWithoutArea;
            return (<div>
                <Chart
                    height={height}
                    chartType="Gauge"
                    loader={<div></div>}
                    data={[
                        ["Label", "Value"],
                        [label, Number(value)]
                    ]}
                    options={chartOptions}
                />
            </div>

            );
        }
}

export default Gauge;
