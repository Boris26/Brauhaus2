import React, {Ref} from 'react';
// @ts-ignore
import Thermometer from "react-thermometer-component";
import './ThermometerBeer.css';
interface ThermometerProps {
    temperature: number;
    targetTemperature: number;
}

class ThermometerBeer extends React.Component<ThermometerProps> {
    private componentRef = React.createRef<HTMLDivElement>()

    constructor(props: ThermometerProps) {
        super(props);
    }
    componentDidMount() {
        if (this.componentRef.current) {
            const height = this.componentRef.current.offsetHeight;
            console.log('Höhe der Komponente:', height);
        }
    }
    render() {
        const { temperature,targetTemperature } = this.props;
        const thermometerHeight = 200;
        const temperatureRange = 100;

        const currentPosition = ((temperature - 0) / (temperatureRange - 0)) * thermometerHeight;


        return (
            <div >
                <Thermometer
                    minValue={0}
                    maxValue={temperatureRange}
                    value={60}
                    size="small"
                    height={thermometerHeight}
                    mercuryClass='red-mercury'
                />

            </div>
        );
    }
}

export default ThermometerBeer;
