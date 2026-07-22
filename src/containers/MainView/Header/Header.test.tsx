import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {Header} from './Header';
import {Views} from '../../../enums/eViews';

describe('Header navigation', () => {
    it('keeps existing settings navigation and adds version navigation', (): void => {
        const setViewState = jest.fn();
        render(
            <Header
                setViewState={setViewState}
                currentView={Views.MAIN}
                removeAllMessages={jest.fn()}
                backendStatus={true}
                messages={[]}
            />
        );

        fireEvent.click(screen.getByLabelText('Dashboard'));
        fireEvent.click(screen.getByLabelText('Einstellungen'));
        fireEvent.click(screen.getByLabelText('Version'));

        expect(setViewState).toHaveBeenCalledWith(Views.DASHBOARD);
        expect(setViewState).toHaveBeenCalledWith(Views.SETTINGS);
        expect(setViewState).toHaveBeenCalledWith(Views.VERSION);
    });

    it('renders status and navigation as separate compact layout areas without the brand title', (): void => {
        render(
            <Header
                setViewState={jest.fn()}
                currentView={Views.MAIN}
                removeAllMessages={jest.fn()}
                backendStatus={true}
                messages={['Lange Statusmeldung']}
            />
        );

        expect(screen.queryByRole('heading', {name: 'Brauhaus'})).not.toBeInTheDocument();
        expect(screen.getByTitle('Dashboard')).toBeInTheDocument();
        expect(screen.getByTitle('Dashboard').querySelector('svg')).toBeInTheDocument();
        expect(screen.getByTitle('Hauptansicht').parentElement).toHaveClass('icons-container');
        expect(screen.getByText(/Backend:/)).toBeInTheDocument();
    });
});
