import React from 'react';
import {render, screen} from '@testing-library/react';
import WaterControl from './WaterControl';
import {VesselContentType} from '../../../model/VesselContentType';

const renderWaterControl = (contentType: VesselContentType, agitatorState = false) => render(
    <WaterControl filledLiters={35} label="Füllstand" agitatorState={agitatorState} agitatorSpeed={10} contentType={contentType} />
);

describe('WaterControl vessel content display', () => {
    it('sets content modifier classes for water, mash, and wort', () => {
        expect(renderWaterControl(VesselContentType.WATER).container.querySelector('.water-gauge--water')).not.toBeNull();
        expect(renderWaterControl(VesselContentType.MASH).container.querySelector('.water-gauge--mash')).not.toBeNull();
        expect(renderWaterControl(VesselContentType.WORT).container.querySelector('.water-gauge--wort')).not.toBeNull();
    });

    it('renders a decorative particle layer inside the fill', () => {
        const {container} = renderWaterControl(VesselContentType.MASH);
        const fill = container.querySelector('.water-gauge__fill');
        const particles = container.querySelector('.water-gauge__particles');
        expect(particles).not.toBeNull();
        expect(particles).toHaveAttribute('aria-hidden', 'true');
        expect(fill?.contains(particles)).toBe(true);
    });

    it('activates particle movement only when the agitator is running', () => {
        expect(renderWaterControl(VesselContentType.MASH, false).container.querySelector('.water-gauge--agitator-running')).toBeNull();
        expect(renderWaterControl(VesselContentType.MASH, true).container.querySelector('.water-gauge--agitator-running')).not.toBeNull();
    });

    it('keeps scale, liter value, agitator, and fill height in all states', () => {
        [VesselContentType.WATER, VesselContentType.MASH, VesselContentType.WORT].forEach((contentType) => {
            const {container, unmount} = renderWaterControl(contentType);
            const usableArea = container.querySelector('.water-gauge__usable-area');
            const fill = container.querySelector('.water-gauge__fill');
            expect(container.querySelector('.water-gauge__scale')).not.toBeNull();
            expect(container.querySelector('.water-gauge__agitator')).not.toBeNull();
            expect(screen.getByText('35,0 L')).toBeInTheDocument();
            expect(usableArea).not.toBeNull();
            expect(usableArea?.contains(fill)).toBe(true);
            expect(fill).toHaveStyle({height: '50%'});
            unmount();
        });
    });
});


describe('WaterControl fill level', () => {
    const getFillHeight = (aFilledLiters: number): string => {
        const {container} = render(<WaterControl filledLiters={aFilledLiters} label="Aktuell" agitatorState={false} agitatorSpeed={10} contentType={VesselContentType.WATER} />);
        return (container.querySelector('.water-gauge__fill') as HTMLElement).style.height;
    };

    it('uses filledLiters for tank height and caps only the visual level at vessel capacity', () => {
        expect(getFillHeight(0)).toBe('0%');
        expect(getFillHeight(2)).toBe(`${(2 / 70) * 100}%`);
        expect(getFillHeight(10)).toBe(`${(10 / 70) * 100}%`);
        expect(getFillHeight(0.0286)).toBe(`${(0.0286 / 70) * 100}%`);
        expect(getFillHeight(16.6)).toBe(`${(16.6 / 70) * 100}%`);
        expect(getFillHeight(80)).toBe('100%');
        expect(getFillHeight(-1)).toBe('0%');
        expect(getFillHeight(Number.NaN)).toBe('0%');
    });
});
