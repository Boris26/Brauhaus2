import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {GlobalHeaterSafetyDialog} from './GlobalHeaterSafetyDialog';
import {HeaterSafetyRepository} from '../../repositorys/HeaterSafetyRepository';

jest.mock('../../repositorys/HeaterSafetyRepository');

const mockedHeaterSafety = HeaterSafetyRepository as jest.Mocked<typeof HeaterSafetyRepository>;

beforeEach(() => {
    jest.clearAllMocks();
    mockedHeaterSafety.reset.mockResolvedValue({state: 'DISARMED', latched: false});
});

describe('GlobalHeaterSafetyDialog', () => {
    it('renders the blocking heater alarm with live controller context', () => {
        render(<GlobalHeaterSafetyDialog open temperature={53.4} heatingRunning={false}/>);

        const dialog = screen.getByRole('dialog', {name: 'Heizungs-Sicherheitsalarm'});
        expect(dialog).toHaveTextContent('Heizung scheint nach dem Abschalten weiter Wärme zu erzeugen');
        expect(dialog).toHaveTextContent('Aktuelle Temperatur: 53,4 °C');
        expect(dialog).toHaveTextContent('Heizung laut Steuerung: AUS');
        expect(screen.getByRole('button', {name: 'Sicherheitsalarm zurücksetzen'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Schließen'})).not.toBeInTheDocument();
    });

    it('resets only through the backend and stays visible until the alarm snapshot clears', async () => {
        render(<GlobalHeaterSafetyDialog open temperature={53.4} heatingRunning={false}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Sicherheitsalarm zurücksetzen'}));
        await waitFor(() => expect(mockedHeaterSafety.reset).toHaveBeenCalledTimes(1));

        expect(screen.getByRole('dialog', {name: 'Heizungs-Sicherheitsalarm'})).toBeInTheDocument();
    });

    it('disables repeat reset while the request is pending', () => {
        mockedHeaterSafety.reset.mockImplementationOnce(() => new Promise(() => undefined));
        render(<GlobalHeaterSafetyDialog open temperature={53.4} heatingRunning={false}/>);

        const reset = screen.getByRole('button', {name: 'Sicherheitsalarm zurücksetzen'});
        fireEvent.click(reset);

        expect(screen.getByRole('button', {name: 'Wird zurückgesetzt…'})).toBeDisabled();
        fireEvent.click(screen.getByRole('button', {name: 'Wird zurückgesetzt…'}));
        expect(mockedHeaterSafety.reset).toHaveBeenCalledTimes(1);
    });

    it('keeps the dialog open and surfaces backend errors', async () => {
        mockedHeaterSafety.reset.mockRejectedValueOnce({response: {data: {error: 'Relaiszustand noch unsicher'}}});
        render(<GlobalHeaterSafetyDialog open temperature={54} heatingRunning={false}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Sicherheitsalarm zurücksetzen'}));

        expect(await screen.findByText(/Reset fehlgeschlagen: Relaiszustand noch unsicher/)).toBeInTheDocument();
        expect(screen.getByRole('dialog', {name: 'Heizungs-Sicherheitsalarm'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Sicherheitsalarm zurücksetzen'})).toBeEnabled();
    });
});
