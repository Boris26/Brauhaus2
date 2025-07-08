import React from 'react';
import './WaterControll.css';
import { ToggleState } from "../../../enums/eToggleState";

export interface WaterStatus {
    liters: number
    openClose: boolean
}
interface WaterControllProps {
    liters: number;
    agitatorState: boolean;
    agitatorSpeed: number;
}

interface WaterControllState {
    isAnimating: boolean;
}

class WaterControl extends React.Component<WaterControllProps, WaterControllState> {
    private agitatorRef: React.RefObject<HTMLDivElement>;

    constructor(props: WaterControllProps) {
        super(props);
        this.agitatorRef = React.createRef();
        this.state = {
            isAnimating: props.agitatorState === true,
        };
    }

    componentDidUpdate(prevProps: WaterControllProps) {
        if (prevProps.agitatorState !== this.props.agitatorState) {
            this.setState({ isAnimating: this.props.agitatorState === true }, () => {
                // Setze die Position des Bildes nach der Änderung der Animationszustands neu
                if (!this.state.isAnimating && this.agitatorRef.current) {
                    this.agitatorRef.current.style.animation = 'none'; // Animation stoppen
                    this.agitatorRef.current.style.left = '50%'; // Zurück zur Mitte verschieben
                } else if (this.state.isAnimating && this.agitatorRef.current) {
                    const agitatorSpeed = this.props.agitatorSpeed;
                    const agitatorAnimationSpeed = this.state.isAnimating ? 60 / agitatorSpeed : 20;
                    this.agitatorRef.current.style.animation = `spin ${agitatorAnimationSpeed}s linear infinite`; // Animation neu starten
                }
            });
        }
    }

    render() {
        const { liters } = this.props;
        const isAnimating = this.state.isAnimating;
        const agitatorAnimationSpeed = 30; // Speed immer auf 30 gesetzt
        const waterLevel = (liters / 70) * 100;
        const scaleItems = [];
        for (let i = 70; i >= 0; i--) {
            const scaleItemStyle = {
                height: `${100 / 70}%`,
                borderBottom: i === 0 ? 'none' : '1px solid #ccc',
                opacity: waterLevel >= i ? 1 : 0.5,
            };
            scaleItems.push(
                <div className="scale-item" style={scaleItemStyle} key={i}>
                    {i % 10 === 0 && <span className="scale-label">{i}</span>}
                </div>
            );
        }

        return (
            <div className="watercontainer">
                <div className="water-level" style={{ height: `${waterLevel}%` }}>
                    <div className="waves" />
                </div>
                <div className="agitator" ref={this.agitatorRef} style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '50%',
                    transform: 'translate(-50%, 0)', // Korrigiert: zentriert exakt horizontal
                    width: '80px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                }}>
                    {/* Animation direkt auf das Bild anwenden */}
                    <img
                        src={process.env.PUBLIC_URL + '/rührwerk.png'}
                        alt="Wasser"
                        style={{
                            width: '80px',
                            height: '80px',
                            animation: isAnimating && agitatorAnimationSpeed > 0 ? `spin ${agitatorAnimationSpeed}s linear infinite` : 'none',
                            display: 'block',
                            margin: '0 auto',
                        }}
                    />
                </div>
            </div>
        );
    }
}

export default WaterControl;
