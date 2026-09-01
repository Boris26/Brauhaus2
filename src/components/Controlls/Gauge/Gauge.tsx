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


type GaugeCellValue = number | { v: number; f: string };

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


    private formatGaugeValue(aValue: number): GaugeCellValue {
        const numericValue = Number.isFinite(aValue) ? aValue : 0;

        if (this.props.label !== 'Liter') {
            return numericValue;
        }

        return {
            v: numericValue,
            f: numericValue.toLocaleString('de-DE', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            }),
        };
    }

    calculateAreas() {
        const { targetValue, offset, minValue, maxValue } = this.props;
        const clampToGaugeRange = (value: number) => Math.min(Math.max(value, minValue), maxValue);

        let greenFrom = clampToGaugeRange(targetValue - 1);
        let greenTo = clampToGaugeRange(targetValue + 1);

        let yellowFrom = minValue;
        let yellowTo = clampToGaugeRange(targetValue - offset);

        let redFrom = clampToGaugeRange(targetValue + offset);
        let redTo = maxValue;

        if (targetValue === 0) {
            greenFrom = greenTo = yellowFrom = yellowTo = redTo = redFrom = 0;
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
        const {value,label,minValue,maxValue,height,showAreas} = this.props;
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
                        [label, this.formatGaugeValue(Number(value))]
                    ]}
                    options={chartOptions}
                />
            </div>

            );
        }
}

export default Gauge;
