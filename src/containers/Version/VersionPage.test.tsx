import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import VersionPage from './VersionPage';

describe('VersionPage', () => {
    it('renders the supplied UI, control, and database versions', async (): Promise<void> => {
        render(
            <VersionPage
                version="v2.0.0"
                loadControlVersion={() => Promise.resolve('v1.2.3')}
                loadDatabaseVersion={() => Promise.resolve('v1.1.0')}
            />
        );

        expect(screen.getByRole('heading', {name: 'Version'})).toBeInTheDocument();
        expect(screen.getByTestId('application-version')).toHaveTextContent('v2.0.0');
        expect(await screen.findByTestId('control-version')).toHaveTextContent('v1.2.3');
        expect(await screen.findByTestId('database-version')).toHaveTextContent('v1.1.0');
    });

    it('renders the fallback value for an empty supplied UI version', (): void => {
        render(
            <VersionPage
                version=""
                loadControlVersion={() => Promise.resolve('v1.2.3')}
                loadDatabaseVersion={() => Promise.resolve('v1.1.0')}
            />
        );

        expect(screen.getByTestId('application-version')).toHaveTextContent('unknown');
    });

    it('displays loading states while diagnostics are pending', (): void => {
        render(
            <VersionPage
                version="v2.0.0"
                loadControlVersion={() => new Promise<string>(() => {})}
                loadDatabaseVersion={() => new Promise<string>(() => {})}
            />
        );

        expect(screen.getByTestId('control-version')).toHaveTextContent('Loading…');
        expect(screen.getByTestId('database-version')).toHaveTextContent('Loading…');
    });

    it('displays backend unknown values without treating them as failures', async (): Promise<void> => {
        render(
            <VersionPage
                version="v2.0.0"
                loadControlVersion={() => Promise.resolve('unknown')}
                loadDatabaseVersion={() => Promise.resolve('unknown')}
            />
        );

        expect(await screen.findByTestId('control-version')).toHaveTextContent('unknown');
        expect(await screen.findByTestId('database-version')).toHaveTextContent('unknown');
    });

    it('keeps successful results visible when one request fails', async (): Promise<void> => {
        render(
            <VersionPage
                version="v2.0.0"
                loadControlVersion={() => Promise.reject(new Error('offline'))}
                loadDatabaseVersion={() => Promise.resolve('v1.1.0')}
            />
        );

        await waitFor((): void => {
            expect(screen.getByTestId('control-version')).toHaveTextContent('Unavailable');
            expect(screen.getByTestId('database-version')).toHaveTextContent('v1.1.0');
        });
    });
});
