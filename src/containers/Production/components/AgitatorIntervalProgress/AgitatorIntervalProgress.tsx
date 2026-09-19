import React from 'react';
import {CircularProgress} from '@mui/material';
import './AgitatorIntervalProgress.css';

export const clampIntervalProgress = (progress: number | undefined): number => {
    if (typeof progress !== 'number' || !Number.isFinite(progress)) return 0;
    return Math.min(100, Math.max(0, progress));
};

interface AgitatorIntervalProgressProps {
    active: boolean;
    paused: boolean;
    progress?: number;
}

export const AgitatorIntervalProgress = ({active, paused, progress}: AgitatorIntervalProgressProps) => {
    const isRunning = active && !paused && typeof progress === 'number' && Number.isFinite(progress);
    const displayedProgress = isRunning ? clampIntervalProgress(progress) : 0;

    return <span className={`agitatorIntervalProgress ${isRunning ? 'is-active' : 'is-inactive'}`}
        aria-label="Fortschritt der Rührwerk-Intervallphase">
        <CircularProgress className="agitatorIntervalProgressTrack" variant="determinate" value={100}
            size={24} thickness={5} aria-hidden="true" />
        <CircularProgress className="agitatorIntervalProgressValue" variant="determinate" value={displayedProgress}
            size={24} thickness={5} aria-label="Intervallfortschritt" />
    </span>;
};
