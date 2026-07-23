import React from 'react';
import './WaterControll.css';
import { VesselContentType } from '../../../model/VesselContentType';
import { formatLiters } from '../../../utils/format/liters';

export interface WaterStatus {
    filledLiters: number;
    targetLiters: number;
    openClose: boolean;
}

interface WaterControlProps {
    filledLiters: number;
    label?: string;
    agitatorState: boolean;
    contentType: VesselContentType;

    /**
     * Geschwindigkeit des Rührwerks in Umdrehungen pro Minute.
     */
    agitatorSpeed: number;
}

interface WaterLevel {
    numericLiters: number;
    waterLevel: number;
}

class WaterControl extends React.Component<WaterControlProps> {
    private readonly MAX_WATER_LITERS = 70;

    /**
     * Schnellste dargestellte Umdrehung.
     */
    private readonly MIN_AGITATOR_DURATION_SECONDS = 0.8;

    /**
     * Langsamste dargestellte Umdrehung.
     */
    private readonly MAX_AGITATOR_DURATION_SECONDS = 6;

    /**
     * Wird verwendet, wenn keine gültige Geschwindigkeit vorliegt.
     */
    private readonly DEFAULT_AGITATOR_DURATION_SECONDS = 2.5;

    private getWaterLevel(aFilledLiters: number): WaterLevel {
        const numericLiters = Number.isFinite(aFilledLiters)
            ? Math.max(0, aFilledLiters)
            : 0;

        const waterLevel = Math.max(
            0,
            Math.min(
                100,
                (numericLiters / this.MAX_WATER_LITERS) * 100,
            ),
        );

        return {
            numericLiters,
            waterLevel,
        };
    }

    private getAgitatorAnimationDuration(): number {
        const { agitatorSpeed } = this.props;

        if (!Number.isFinite(agitatorSpeed) || agitatorSpeed <= 0) {
            return this.DEFAULT_AGITATOR_DURATION_SECONDS;
        }

        const durationSeconds = 60 / agitatorSpeed;

        return Math.max(
            this.MIN_AGITATOR_DURATION_SECONDS,
            Math.min(
                this.MAX_AGITATOR_DURATION_SECONDS,
                durationSeconds,
            ),
        );
    }

    private renderScaleMarks(): React.ReactNode[] {
        const scaleMarks: React.ReactNode[] = [];

        for (
            let liters = 0;
            liters <= this.MAX_WATER_LITERS;
            liters += 5
        ) {
            const isMajorMark = liters % 10 === 0;
            const markPosition =
                (liters / this.MAX_WATER_LITERS) * 100;

            const markClassName = isMajorMark
                ? 'water-gauge__mark water-gauge__mark--major'
                : 'water-gauge__mark water-gauge__mark--minor';

            scaleMarks.push(
                <div
                    className={markClassName}
                    key={liters}
                    style={{
                        bottom: `${markPosition}%`,
                    }}
                >
                    {isMajorMark && (
                        <span className="water-gauge__mark-label">
                            {liters}
                        </span>
                    )}
                </div>,
            );
        }

        return scaleMarks;
    }

    private getContentLabel(
        aContentType: VesselContentType,
    ): string {
        switch (aContentType) {
            case VesselContentType.MASH:
                return 'Maische';

            case VesselContentType.WORT:
                return 'Würze';

            case VesselContentType.WATER:
            default:
                return 'Wasser';
        }
    }

    private getContentClassName(
        aContentType: VesselContentType,
    ): string {
        switch (aContentType) {
            case VesselContentType.MASH:
                return 'water-gauge--mash';

            case VesselContentType.WORT:
                return 'water-gauge--wort';

            case VesselContentType.WATER:
            default:
                return 'water-gauge--water';
        }
    }

    render(): React.ReactNode {
        const {
            filledLiters,
            label = 'Aktuell',
            agitatorState,
            contentType,
        } = this.props;

        const {
            numericLiters,
            waterLevel,
        } = this.getWaterLevel(filledLiters);

        const agitatorAnimationDuration =
            this.getAgitatorAnimationDuration();

        const agitatorImageClassName = [
            'water-gauge__agitator-image',
            agitatorState
                ? 'water-gauge__agitator-image--running'
                : '',
        ]
            .filter(Boolean)
            .join(' ');

        const waterGaugeClassName = [
            'water-gauge',
            this.getContentClassName(contentType),
            agitatorState
                ? 'water-gauge--agitator-running'
                : '',
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className={waterGaugeClassName}>
                <div className="water-gauge__tank">
                    <div className="water-gauge__usable-area">
                        <div
                            className="water-gauge__fill"
                            style={{
                                height: `${waterLevel}%`,
                            }}
                        >
                            <div
                                className="water-gauge__particles"
                                aria-hidden="true"
                            />

                            <div
                                className="water-gauge__surface"
                                aria-hidden="true"
                            />
                        </div>
                    </div>

                    <div
                        className="water-gauge__glass"
                        aria-hidden="true"
                    />

                    <div
                        className="water-gauge__scale"
                        aria-hidden="true"
                    >
                        {this.renderScaleMarks()}
                    </div>

                    <div
                        className="water-gauge__agitator"
                        aria-hidden="true"
                    >
                        <img
                            className={agitatorImageClassName}
                            src={`${process.env.PUBLIC_URL}/ruehrwerk_3d.svg`}
                            alt=""
                            draggable={false}
                            style={{
                                animationDuration:
                                    `${agitatorAnimationDuration}s`,
                            }}
                        />
                    </div>
                </div>

                <div className="water-gauge__reading">
                    <span>{label}</span>

                    <span className="water-gauge__content-label">
                        Inhalt: {this.getContentLabel(contentType)}
                    </span>

                    <strong>
                        {formatLiters(numericLiters)}
                    </strong>
                </div>
            </div>
        );
    }
}

export default WaterControl;
