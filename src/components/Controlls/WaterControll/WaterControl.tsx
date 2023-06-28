import React from 'react';
import './WaterControll.css';
interface WaterControllProps {
    liters: number;
}

class WaterControl extends React.Component<WaterControllProps> {


    render() {

        const { liters } = this.props;

        const  waterLevel = (liters / 70) * 100;
        console.log(waterLevel);
        const scaleItems = [];
        for (let i = 70; i >= 0; i--) {
            const scaleItemStyle = {
                height: `${100 / 70}%`,
                borderBottom: i === 0 ? 'none' : '1px solid #ccc', // Kein unterer Rand für die erste Skalenlinie
                opacity: waterLevel >= i ? 1 : 0.5, // Opazität der Skalenlinie basierend auf Wasserstand
            };
            scaleItems.push(
                <div className="scale-item" style={scaleItemStyle} key={i}>
                    {i % 10 === 0 && <span className="scale-label">{i}</span>} {/* Nur jede 10. Linie hat eine Beschriftung */}
                </div>
            );
        }

        return (
            <div className="watercontainer">
                    <div className="water-level" style={{ height: `${waterLevel}%` }}>
                        <div className="waves" />
                    </div>
                    <div className="agitator" />
            </div>
        );
    }
}

export default WaterControl;
