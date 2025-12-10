import React, {Component} from 'react';
import {Gantt, Task, EventOption, StylingOption, ViewMode, DisplayOption} from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { COLOR_ORANGE_SOFT, COLOR_ORANGE_SOFT_ALT } from '../../../colors';




class GanttChart extends Component {

    render() {
        const date1 = new Date();
        date1.setMinutes(30); // Setze die Minuten auf 30
        date1.setSeconds(45);
        const date2 = new Date();
        date1.setMinutes(30); // Setze die Minuten auf 30
        date1.setSeconds(45);


        let tasks: Task[] = [
            {
                start: date1,
                end: date1,
                name: 'Idea',
                id: 'Task 0',
                type: 'task',
                progress: 100,
                isDisabled: true,
                styles: {progressColor: COLOR_ORANGE_SOFT, progressSelectedColor: COLOR_ORANGE_SOFT_ALT},
            },
            {
                start:date2,
                end: date2,
                name: 'Idea2',
                id: 'Task 1',
                type: 'task',
                progress: 100,
                isDisabled: true,
                styles: {progressColor: COLOR_ORANGE_SOFT, progressSelectedColor: COLOR_ORANGE_SOFT_ALT},
            },

        ];


        return (
            <div>
                <Gantt
                    tasks={tasks}

                />
            </div>
        );
    }
}

export default GanttChart;
