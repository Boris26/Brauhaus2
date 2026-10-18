import React, {memo, useId, useMemo} from 'react';
import './Gauge.css';

interface GaugeProps {
    value: number | null;
    targetValue: number | null;
    minValue: number;
    maxValue: number;
    offset: number;
    label: string;
    height: number;
    showAreas: boolean;
}

const pointOnDial = (angle: number, radius: number) => {
    const radians = angle * Math.PI / 180;
    return {x: 110 + Math.sin(radians) * radius, y: 110 - Math.cos(radians) * radius};
};

const arcOnDial = (from: number, to: number) => {
    const start = pointOnDial(from, 86);
    const end = pointOnDial(to, 86);
    return `M ${start.x} ${start.y} A 86 86 0 ${to - from > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
};

// One responsive dial for both units. Values stay in props, so polling and
// sensor updates never reset a chart instance or require a second state update.
const Gauge = memo(function Gauge({value, targetValue, minValue, maxValue, offset, label, height, showAreas}: GaugeProps) {
    const id = useId();
    const isWater = label === 'Liter' || label === 'L';
    const unit = isWater ? 'L' : label;
    const hasValue = value !== null && Number.isFinite(value);
    const formattedValue = hasValue
        ? value.toLocaleString('de-DE', {minimumFractionDigits: 1, maximumFractionDigits: 1})
        : '--';
    const angleFor = (reading: number) => -135 + Math.min(1, Math.max(0, (reading - minValue) / (maxValue - minValue))) * 270;
    const needleAngle = hasValue ? angleFor(value) : -135;
    const ticks = useMemo(() => {
        const divisions = isWater ? 70 : 50;
        const majorEvery = 10;
        return Array.from({length: divisions + 1}, (_, index) => {
            const angle = -135 + index / divisions * 270;
            const major = index % majorEvery === 0;
            const start = pointOnDial(angle, major ? 79 : 84);
            const end = pointOnDial(angle, 92);
            const number = pointOnDial(angle, 68);
            return <g key={index}>
                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeWidth={major ? 1.5 : 0.8} />
                {major && <text x={number.x} y={number.y} dominantBaseline="central" textAnchor="middle">
                    {Math.round(minValue + index / divisions * (maxValue - minValue))}
                </text>}
            </g>;
        });
    }, [isWater, minValue, maxValue]);

    const renderArea = (from: number, to: number, color: string) => {
        const start = angleFor(from);
        const end = angleFor(to);
        return end > start ? <path d={arcOnDial(start, end)} stroke={color} /> : null;
    };

    return <div className={`GaugeContainer gauge ${isWater ? 'gauge--water' : 'gauge--temperature'}`} style={{maxWidth: height}}>
        <svg viewBox="0 0 220 220" role="img" aria-label={`${isWater ? 'Wassermenge' : 'Temperatur'}: ${formattedValue} ${unit}`}>
            <defs>
                <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f7f7f5" />
                    <stop offset="0.5" stopColor="#c8cccb" />
                    <stop offset="1" stopColor="#f0f1ed" />
                </linearGradient>
                <radialGradient id={`${id}-face`} cx="45%" cy="35%" r="70%">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#e9ebe8" />
                </radialGradient>
            </defs>
            <circle cx="110" cy="110" r="105" fill={`url(#${id}-rim)`} />
            <circle cx="110" cy="110" r="97" fill={`url(#${id}-face)`} stroke="#fdfdfb" strokeWidth="2" />
            <g className="gauge__areas" fill="none" strokeWidth="9">
                {isWater && hasValue && renderArea(minValue, value, '#76b5fa')}
                {!isWater && showAreas && targetValue !== null && Number.isFinite(targetValue) && targetValue !== 0 && <>
                    {renderArea(minValue, targetValue - offset, '#f3cf65')}
                    {renderArea(targetValue - 1, targetValue + 1, '#7ab78a')}
                    {renderArea(targetValue + offset, maxValue, '#ec9a89')}
                </>}
            </g>
            <g className="gauge__scale">{ticks}</g>
            <text className="gauge__unit" x="110" y="86" textAnchor="middle">{unit}</text>
            {hasValue && <g className="gauge__needle" transform={`rotate(${needleAngle} 110 110)`}>
                <path d="M 110 22 L 114 110 L 110 125 L 106 110 Z" />
            </g>}
            <circle className="gauge__hub" cx="110" cy="110" r="12" />
            <text className="gauge__value" x="110" y="181" textAnchor="middle">{formattedValue} {unit}</text>
        </svg>
    </div>;
});

export default Gauge;
