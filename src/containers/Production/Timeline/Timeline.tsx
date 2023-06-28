import React, { Component } from 'react';
import { Stage, Layer, Rect } from 'react-konva';

interface TimelineProps {
    pauses: number;
}

class Timeline extends Component<TimelineProps> {
    timelineHeight = 100;
    rectangleHeight = 80;
    heatUpColor = 'lightblue';
    pauseColors = 'red'; // Hier können Sie die Farben für jede Raste anpassen




    render() {
        const { pauses } = this.props;

        let currentPosition = 0;
        const elements: JSX.Element[] = [];

        for (let i = 0; i < pauses; i++) {
            // Aufheizungsphase
            const heatUpRect = (
                <Rect
                    key={`heatup-${i}`}
                    x={currentPosition}
                    y={(this.timelineHeight - this.rectangleHeight) / 2}
                    width={this.rectangleHeight}
                    height={this.rectangleHeight}
                    fill={this.heatUpColor}
                />
            );

            currentPosition += this.rectangleHeight;

            // Raste
            const pauseRect = (
                <Rect
                    key={`pause-${i}`}
                    x={currentPosition}
                    y={(this.timelineHeight - this.rectangleHeight) / 2}
                    width={this.rectangleHeight}
                    height={this.rectangleHeight}
                    fill={this.pauseColors}
                />
            );

            currentPosition += this.rectangleHeight;

            elements.push(heatUpRect, pauseRect);
        }

        return (
            <Stage width={currentPosition} height={this.timelineHeight}>
                <Layer>{elements}</Layer>
            </Stage>
        );
    }
}

export default Timeline;
