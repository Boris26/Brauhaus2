import {ProcessState} from '../model/brewingStatus.types';

export interface DebugMetricsStateSnapshot {
    applicationReducer?: {
        view?: string;
        message?: string[];
    };
    productionReducer?: {
        brewingStatus?: {
            process?: {
                state?: ProcessState | string;
            };
        };
    };
}

export type DebugMetricsStateProvider = () => DebugMetricsStateSnapshot;
export type DebugMetricsMeasurementProvider = () => number;

const DEBUG_METRICS_STORAGE_KEY = 'brewmasterDebugMetrics';
const DEBUG_METRICS_INTERVAL = 60 * 1000;

interface BrowserMemoryInfo {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
}

class DebugMetrics {
    private startedStatusRequests = 0;
    private completedStatusRequests = 0;
    private failedStatusRequests = 0;
    private runningStatusRequests = 0;
    private intervalHandle: ReturnType<typeof setInterval> | undefined;

    statusRequestStarted(): void {
        this.startedStatusRequests += 1;
        this.runningStatusRequests += 1;
    }

    statusRequestCompleted(): void {
        this.completedStatusRequests += 1;
        this.runningStatusRequests = Math.max(0, this.runningStatusRequests - 1);
    }

    statusRequestFailed(): void {
        this.failedStatusRequests += 1;
        this.runningStatusRequests = Math.max(0, this.runningStatusRequests - 1);
    }

    start(aStateProvider: DebugMetricsStateProvider, aMeasurementProvider: DebugMetricsMeasurementProvider): void {
        if (!this.isEnabled() || this.intervalHandle !== undefined) {
            return;
        }

        this.intervalHandle = setInterval((): void => {
            this.logSnapshot(aStateProvider, aMeasurementProvider);
        }, DEBUG_METRICS_INTERVAL);
    }

    stop(): void {
        if (this.intervalHandle !== undefined) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = undefined;
        }
    }

    getStoredMeasurementCount(aMeasurementProvider: DebugMetricsMeasurementProvider): number {
        return aMeasurementProvider();
    }

    private isEnabled(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }
        try {
            return window.localStorage.getItem(DEBUG_METRICS_STORAGE_KEY) === 'true';
        } catch (aError) {
            void aError;
            return false;
        }
    }

    private logSnapshot(aStateProvider: DebugMetricsStateProvider, aMeasurementProvider: DebugMetricsMeasurementProvider): void {
        try {
            const aState = aStateProvider();
            const aMemory = this.getMemoryInfo();
            const aStateSize = this.getSerializableStateSize(aState);
            const aMessages = aState.applicationReducer?.message ?? [];
            const aBrewingState = aState.productionReducer?.brewingStatus?.process?.state ?? 'UNKNOWN';

            console.info('[BrewmasterDebugMetrics]', {
                usedJSHeapSize: aMemory.usedJSHeapSize,
                totalJSHeapSize: aMemory.totalJSHeapSize,
                reduxStateSize: aStateSize,
                messages: aMessages.length,
                dataCollectorMeasurements: this.getStoredMeasurementCount(aMeasurementProvider),
                statusRequestsStarted: this.startedStatusRequests,
                statusRequestsCompleted: this.completedStatusRequests,
                statusRequestsFailed: this.failedStatusRequests,
                statusRequestsRunning: this.runningStatusRequests,
                currentView: aState.applicationReducer?.view,
                brewingStatus: aBrewingState,
            });
        } catch (aError) {
            void aError;
            // Diagnostics must never affect kiosk runtime behavior.
        }
    }

    private getSerializableStateSize(aState: DebugMetricsStateSnapshot): number | undefined {
        try {
            return JSON.stringify(aState).length;
        } catch (aError) {
            void aError;
            return undefined;
        }
    }

    private getMemoryInfo(): BrowserMemoryInfo {
        const aPerformance = performance as Performance & { memory?: BrowserMemoryInfo };
        return aPerformance.memory ?? {};
    }
}

export const debugMetrics = new DebugMetrics();
