import React, { Component } from 'react';
import { Stage, Layer, Rect } from 'react-konva';

export interface TimelineData {
    type: 'heating' | 'rast';
    elapsed: number;
}

export interface TimelineProps {
    timeLineData: TimelineData[];
}

class Timeline extends Component<TimelineProps> {
    calculateStartPositions(timelineData: TimelineData[]) {
        const startPositions: number[] = [];
        let totalX = 0;

        timelineData.forEach((entry) => {
            startPositions.push(totalX);
            totalX += entry.elapsed * 10;
        });

        return startPositions;
    }

    render() {
        const { timeLineData } = this.props;

        if (timeLineData.length > 0) {
            const startPositions = this.calculateStartPositions(timeLineData);

            return (
                <div style={{ width: '100%' }}>
                    <Stage width={window.innerWidth} height={100}>
                        <Layer>
                            {timeLineData.map((entry, index) => (
                                <Rect
                                    key={index}
                                    x={startPositions[index]}
                                    y={10}
                                    width={entry.elapsed * 2}
                                    height={80}
                                    fill={entry.type === 'heating' ? 'blue' : 'red'}
                                />
                            ))}
                        </Layer>
                    </Stage>
                </div>
            );
        }

        return null;
    }
}

export default Timeline;
