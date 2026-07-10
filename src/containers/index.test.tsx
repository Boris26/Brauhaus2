import React from 'react';
import {render, screen} from '@testing-library/react';
import {Index} from './index';
import {Views} from '../enums/eViews';
import {BrewingStatus} from '../model/brewingStatus.types';

describe('Index view routing', () => {
    it('points the version view to the version page', (): void => {
        render(
            <Index
                viewState={Views.VERSION}
                brewingStatus={{} as BrewingStatus}
                confirm={jest.fn()}
                checkIsBackenAvailable={jest.fn()}
                webSocketConnect={jest.fn()}
            />
        );

        expect(screen.getByRole('heading', {name: 'Version'})).toBeInTheDocument();
    });
});
