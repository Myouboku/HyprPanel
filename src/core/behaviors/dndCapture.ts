import AstalNotifd from 'gi://AstalNotifd?version=0.1';
import { ScreenCaptureMonitor } from 'src/services/system/screenCapture';

const notifdService = AstalNotifd.get_default();

/**
 * Automatically manages Do Not Disturb mode during screen capture.
 *
 * Behavior:
 * - Enables DND when screen capture starts
 * - Disables DND when screen capture stops
 */
export class DndCaptureManager {
    private _isCapturing: boolean = false;
    private _captureMonitor: ScreenCaptureMonitor;

    constructor() {
        this._captureMonitor = ScreenCaptureMonitor.getInstance();
        this._initializeMonitoring();
    }

    /**
     * Initializes monitoring for capture state changes.
     */
    private _initializeMonitoring(): void {
        // Monitor screen capture state changes
        const capturingState = this._captureMonitor.getCapturingState();

        capturingState.subscribe((isCapturing) => {
            if (isCapturing && !this._isCapturing) {
                // Capture just started
                this._handleCaptureStart();
            } else if (!isCapturing && this._isCapturing) {
                // Capture just stopped
                this._handleCaptureStop();
            }
            this._isCapturing = isCapturing;
        });
    }

    /**
     * Handles the start of screen capture.
     * Enables DND automatically.
     */
    private _handleCaptureStart(): void {
        notifdService.set_dont_disturb(true);
        console.log('[DndCapture] Capture started - DND enabled');
    }

    /**
     * Handles the end of screen capture.
     * Disables DND automatically.
     */
    private _handleCaptureStop(): void {
        notifdService.set_dont_disturb(false);
        console.log('[DndCapture] Capture stopped - DND disabled');
    }

    /**
     * Cleanup method (placeholder for future use).
     */
    public destroy(): void {
        // Currently nothing to cleanup
    }
}

/**
 * Initializes the DND capture manager behavior.
 *
 * @returns The initialized DndCaptureManager instance
 */
export function initializeDndCapture(): DndCaptureManager {
    return new DndCaptureManager();
}
