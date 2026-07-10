import React from 'react';
import {render, screen} from '@testing-library/react';
import VersionPage from './VersionPage';

describe('VersionPage', () => {
    it('renders the supplied frontend version', (): void => {
        render(<VersionPage version="v2.0.0" />);

        expect(screen.getByRole('heading', {name: 'Version'})).toBeInTheDocument();
        expect(screen.getByTestId('application-version')).toHaveTextContent('v2.0.0');
    });

    it('renders the fallback value for an empty supplied version', (): void => {
        render(<VersionPage version="" />);

        expect(screen.getByTestId('application-version')).toHaveTextContent('unknown');
    });
});
