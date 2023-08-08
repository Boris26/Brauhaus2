import React, { Component } from 'react';
import { Stage, Layer, Rect } from 'react-konva';

export interface TimelineData {
    type: 'heating' | 'rest';
    elapsed: number;
}
export interface TimelineProps {
    timeLineData: TimelineData[];
}

class Timeline extends Component<TimelineProps> {

    render() {
        let totalX = 0;

        const { timeLineData } = this.props;

        return (
            <Stage width={800} height={200}>
                <Layer>
                    {timeLineData.map((entry, index) => {
                        const x = totalX;
                        totalX += entry.elapsed * 10; // Anpassung der Skala

                        return (
                            <Rect
                                key={index}
                                x={x}
                                y={10}
                                width={entry.elapsed * 10} // Breite entsprechend der Zeit
                                height={50}
                                fill={entry.type === 'heating' ? 'blue' : 'red'}
                            />
                        );
                    })}
                </Layer>
            </Stage>
        );
    }
}

export default Timeline;
