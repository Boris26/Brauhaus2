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

        fireEvent.click(screen.getByLabelText('Einstellungen'));
        fireEvent.click(screen.getByLabelText('Version'));

        expect(setViewState).toHaveBeenCalledWith(Views.SETTINGS);
        expect(setViewState).toHaveBeenCalledWith(Views.VERSION);
    });

    it('renders brand, status, and navigation as separate layout areas', (): void => {
        render(
            <Header
                setViewState={jest.fn()}
                currentView={Views.MAIN}
                removeAllMessages={jest.fn()}
                backendStatus={true}
                messages={['Lange Statusmeldung']}
            />
        );

        expect(screen.getByRole('heading', {name: 'Brauhaus'}).parentElement).toHaveClass('header-left');
        expect(screen.getByTitle('Hauptansicht').parentElement).toHaveClass('icons-container');
        expect(screen.getByText(/Backend:/)).toBeInTheDocument();
    });
});
