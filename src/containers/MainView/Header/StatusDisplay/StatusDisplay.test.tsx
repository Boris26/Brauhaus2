import React from 'react';
import {render, screen} from '@testing-library/react';
import StatusDisplay from './StatusDisplay';

describe('StatusDisplay priority severity', () => {
    it('renders alarms as assertive red priority messages', () => {
        render(
            <StatusDisplay
                backendStatus={true}
                priorityMessage="Alarm"
                prioritySeverity="alarm"
                removeAllMessages={jest.fn()}
            />
        );

        expect(screen.getByRole('alert')).toHaveTextContent('Alarm');
        expect(screen.getByRole('alert')).toHaveClass('alarm-message');
    });

    it('renders warnings as non-alarm warning priority messages', () => {
        render(
            <StatusDisplay
                backendStatus={true}
                priorityMessage="Warnung"
                prioritySeverity="warning"
                removeAllMessages={jest.fn()}
            />
        );

        expect(screen.getByRole('status')).toHaveTextContent('Warnung');
        expect(screen.getByRole('status')).toHaveClass('warning-message');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
