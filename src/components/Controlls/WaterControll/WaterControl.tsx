import React from 'react';
import './WaterControll.css';

export interface WaterStatus {
    liters: number
    openClose: boolean
}
interface WaterControllProps {
    liters: number;
    agitatorState: boolean;
    agitatorSpeed: number;
}

class WaterControl extends React.Component<WaterControllProps> {
    private readonly MAX_WATER_LITERS = 70;
    private readonly MIN_AGITATOR_DURATION_SECONDS = 1.5;
    private readonly MAX_AGITATOR_DURATION_SECONDS = 30;

    private getWaterLevel(liters: number): { numericLiters: number; waterLevel: number } {
        const numericLiters = Number.isFinite(liters) ? liters : 0;
        const waterLevel = Math.max(
            0,
            Math.min(100, (numericLiters / this.MAX_WATER_LITERS) * 100),
        );

        return { numericLiters, waterLevel };
    }

    private getAgitatorAnimationDuration(): number {
        const { agitatorSpeed } = this.props;
        const safeSpeed = Number.isFinite(agitatorSpeed) && agitatorSpeed > 0 ? agitatorSpeed : 0;

        if (safeSpeed === 0) {
            return this.MAX_AGITATOR_DURATION_SECONDS;
        }

        return Math.max(
            this.MIN_AGITATOR_DURATION_SECONDS,
            Math.min(this.MAX_AGITATOR_DURATION_SECONDS, 60 / safeSpeed),
        );
    }

    private renderScaleMarks(): React.ReactNode[] {
        const scaleMarks: React.ReactNode[] = [];

        for (let liters = 0; liters <= this.MAX_WATER_LITERS; liters += 5) {
            const isMajorMark = liters % 10 === 0;
            const markPosition = (liters / this.MAX_WATER_LITERS) * 100;

            const markClassName = isMajorMark
                ? 'water-gauge__mark water-gauge__mark--major'
                : 'water-gauge__mark water-gauge__mark--minor';

            scaleMarks.push(
                <div
                    className={markClassName}
                    key={liters}
                    style={{ bottom: `${markPosition}%` }}
                >
                    {isMajorMark && (
                        <span className="water-gauge__mark-label">{liters}</span>
                    )}
                </div>
            );
        }

        return scaleMarks;
    }

    render() {
        const { liters, agitatorState } = this.props;
        const { numericLiters, waterLevel } = this.getWaterLevel(liters);
        const agitatorAnimationDuration = this.getAgitatorAnimationDuration();
        const agitatorImageClassName = agitatorState
            ? 'water-gauge__agitator-image water-gauge__agitator-image--running'
            : 'water-gauge__agitator-image';

        return (
            <div className="water-gauge">
                <div className="water-gauge__tank">
                    <div className="water-gauge__fill" style={{ height: `${waterLevel}%` }}>
                        <div className="water-gauge__surface" />
                    </div>

                    <div className="water-gauge__glass" />

                    <div className="water-gauge__scale" aria-hidden="true">
                        {this.renderScaleMarks()}
                    </div>

                    <div className="water-gauge__agitator">
                        <img
                            className={agitatorImageClassName}
                            src={`${process.env.PUBLIC_URL}/rührwerk.png`}
                            alt=""
                            style={{ animationDuration: `${agitatorAnimationDuration}s` }}
                        />
                    </div>
                </div>

                <div className="water-gauge__reading">
                    <span>Aktuell</span>
                    <strong>{numericLiters.toFixed(1)} L</strong>
                </div>
            </div>
        );
    }
}

export default WaterControl;
