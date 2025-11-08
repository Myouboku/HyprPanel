import { Variable, execAsync, interval } from 'astal';

/**
 * Monitors screen capture state via PipeWire.
 * Detects when screen recording/sharing starts and stops.
 *
 * This service monitors PipeWire video input streams to detect when
 * screen recording or sharing is active (OBS, Discord, Teams, Firefox, Chrome, etc.).
 * It provides a reactive Variable that other components can subscribe to for capture state changes.
 */
export class ScreenCaptureMonitor {
    private static _instance: ScreenCaptureMonitor | null = null;
    private _isCapturing: Variable<boolean> = Variable(false);
    private _pollInterval: ReturnType<typeof interval> | null = null;

    private constructor() {
        this._initializeMonitoring();
    }

    /**
     * Gets the singleton instance of ScreenCaptureMonitor.
     *
     * @returns The singleton instance
     */
    public static getInstance(): ScreenCaptureMonitor {
        if (!ScreenCaptureMonitor._instance) {
            ScreenCaptureMonitor._instance = new ScreenCaptureMonitor();
        }
        return ScreenCaptureMonitor._instance;
    }

    /**
     * Initializes monitoring for screen capture state.
     * Uses PipeWire polling to detect active screen recording/sharing.
     */
    private _initializeMonitoring(): void {
        // Start polling PipeWire for screen capture streams
        this._startPolling();
        console.log('[ScreenCapture] PipeWire monitoring initialized');
    }

    /**
     * Starts polling for screen capture via PipeWire.
     * Checks every 2 seconds for active screen recording/sharing streams.
     */
    private _startPolling(): void {
        // Initial check
        this._checkCaptureState();

        // Poll every 2 seconds using astal's interval
        this._pollInterval = interval(2000, () => {
            this._checkCaptureState();
        });
    }

    /**
     * Checks current capture state via PipeWire.
     * Detects any screen capture/sharing (OBS, Discord, Teams, Firefox, Chrome, etc.)
     * by looking for video input streams in PipeWire.
     */
    private _checkCaptureState(): void {
        execAsync(
            'bash -c \'pw-cli ls Node 2>/dev/null | grep "media.class = \\"Stream/Input/Video\\"" | wc -l\'',
        )
            .then((result) => {
                const streamCount = parseInt(result.trim(), 10);
                const hasCapture = streamCount > 0;
                const previousState = this._isCapturing.get();

                if (hasCapture !== previousState) {
                    this._isCapturing.set(hasCapture);
                    console.log(
                        `[ScreenCapture] State changed: ${hasCapture ? 'started' : 'stopped'} (${streamCount} stream(s))`,
                    );
                }
            })
            .catch((error) => {
                // PipeWire check failed, log error and assume no capture
                console.error('[ScreenCapture] PipeWire check error:', error);
                const previousState = this._isCapturing.get();
                if (previousState) {
                    this._isCapturing.set(false);
                    console.log('[ScreenCapture] State changed: stopped (PipeWire check failed)');
                }
            });
    }

    /**
     * Returns the capturing state variable for binding.
     *
     * @returns The capturing state variable
     */
    public getCapturingState(): Variable<boolean> {
        return this._isCapturing;
    }

    /**
     * Checks if screen capture is currently active.
     *
     * @returns True if screen capture is active, false otherwise
     */
    public isCurrentlyCapturing(): boolean {
        return this._isCapturing.get();
    }

    /**
     * Cleanup method to remove intervals.
     */
    public destroy(): void {
        if (this._pollInterval !== null) {
            this._pollInterval.cancel();
        }

        console.log('[ScreenCapture] Monitoring stopped');
    }
}
