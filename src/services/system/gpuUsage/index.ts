import { bind, exec, Variable } from 'astal';
import GLib from 'gi://GLib?version=2.0';
import { FunctionPoller } from 'src/lib/poller/FunctionPoller';
import { GpuServiceCtor, GPUStat, GpuType } from './types';

/**
 * Service for monitoring GPU usage percentage
 * Supports both AMD (via sysfs) and NVIDIA (via gpustat) GPUs
 */
class GpuUsageService {
    private _updateFrequency: Variable<number>;
    private _gpuPoller: FunctionPoller<number, []>;
    private _isInitialized = false;
    private _gpuType: GpuType = 'unknown';
    private _amdGpuPath?: string;

    public _gpu = Variable<number>(0);

    constructor({ frequency }: GpuServiceCtor = {}) {
        this._updateFrequency = frequency ?? Variable(2000);
        this._calculateUsage = this._calculateUsage.bind(this);
        this._detectGpuType();

        this._gpuPoller = new FunctionPoller<number, []>(
            this._gpu,
            [],
            bind(this._updateFrequency),
            this._calculateUsage,
        );
    }

    /**
     * Detects the GPU type (AMD or NVIDIA) and sets up appropriate paths
     */
    private _detectGpuType(): void {
        const amdPath = this._findAmdGpuPath();
        if (amdPath) {
            this._gpuType = 'amd';
            this._amdGpuPath = amdPath;
            return;
        }

        try {
            const gpuStats = exec('gpustat --json');
            if (typeof gpuStats === 'string') {
                this._gpuType = 'nvidia';
                return;
            }
        } catch {
            console.debug('gpustat not available, GPU type remains unknown');
        }

        this._gpuType = 'unknown';
    }

    /**
     * Finds the AMD GPU busy percent file path
     *
     * @returns Path to gpu_busy_percent file or undefined if not found
     */
    private _findAmdGpuPath(): string | undefined {
        const drmPath = '/sys/class/drm';

        try {
            const dir = GLib.Dir.open(drmPath, 0);
            let dirname: string | null;

            while ((dirname = dir.read_name()) !== null) {
                if (!dirname.startsWith('card')) continue;
                if (dirname.includes('-')) continue;

                const busyPath = `${drmPath}/${dirname}/device/gpu_busy_percent`;

                try {
                    const [success] = GLib.file_get_contents(busyPath);
                    if (success) {
                        dir.close();
                        return busyPath;
                    }
                } catch {
                    continue;
                }
            }

            dir.close();
        } catch (error) {
            console.debug('Error scanning DRM devices:', error);
        }

        return undefined;
    }

    /**
     * Manually refreshes the GPU usage reading
     */
    public refresh(): void {
        this._gpu.set(this._calculateUsage());
    }

    /**
     * Gets the GPU usage percentage variable
     *
     * @returns Variable containing GPU usage percentage (0-1)
     */
    public get gpu(): Variable<number> {
        return this._gpu;
    }

    /**
     * Gets the detected GPU type
     *
     * @returns The GPU type (amd, nvidia, or unknown)
     */
    public get gpuType(): GpuType {
        return this._gpuType;
    }

    /**
     * Calculates GPU usage based on detected GPU type
     *
     * @returns GPU usage as a decimal between 0 and 1
     */
    private _calculateUsage(): number {
        if (this._gpuType === 'amd') {
            return this._calculateAmdUsage();
        }

        if (this._gpuType === 'nvidia') {
            return this._calculateNvidiaUsage();
        }

        return 0;
    }

    /**
     * Reads GPU usage from AMD sysfs interface
     *
     * @returns GPU usage as a decimal between 0 and 1
     */
    private _calculateAmdUsage(): number {
        if (!this._amdGpuPath) return 0;

        try {
            const [success, bytes] = GLib.file_get_contents(this._amdGpuPath);
            if (!success || !bytes) return 0;

            const content = new TextDecoder('utf-8').decode(bytes);
            const usage = parseInt(content.trim(), 10);

            if (isNaN(usage)) return 0;

            return usage / 100;
        } catch (error) {
            console.error('Error reading AMD GPU usage:', error);
            return 0;
        }
    }

    /**
     * Calculates GPU usage for NVIDIA cards using gpustat
     *
     * @returns GPU usage as a decimal between 0 and 1
     */
    private _calculateNvidiaUsage(): number {
        try {
            const gpuStats = exec('gpustat --json');
            if (typeof gpuStats !== 'string') {
                return 0;
            }

            const data = JSON.parse(gpuStats);

            const totalGpu = 100;
            const usedGpu =
                data.gpus.reduce((acc: number, gpu: GPUStat) => {
                    return acc + gpu['utilization.gpu'];
                }, 0) / data.gpus.length;

            return this._divide([totalGpu, usedGpu]);
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error getting GPU stats:', error.message);
            } else {
                console.error('Unknown error getting GPU stats');
            }
            return 0;
        }
    }

    /**
     * Converts usage percentage to decimal
     *
     * @param values - Tuple of [total, used] values
     * @returns Usage as decimal between 0 and 1
     */
    private _divide([total, free]: number[]): number {
        return free / total;
    }

    /**
     * Updates the polling frequency
     *
     * @param timerInMs - New polling interval in milliseconds
     */
    public updateTimer(timerInMs: number): void {
        this._updateFrequency.set(timerInMs);
    }

    /**
     * Initializes the GPU usage monitoring poller
     */
    public initialize(): void {
        if (!this._isInitialized) {
            this._gpuPoller.initialize();
            this._isInitialized = true;
        }
    }

    /**
     * Stops the GPU usage polling
     */
    public stopPoller(): void {
        this._gpuPoller.stop();
    }

    /**
     * Starts the GPU usage polling
     */
    public startPoller(): void {
        this._gpuPoller.start();
    }

    /**
     * Cleans up resources and stops monitoring
     */
    public destroy(): void {
        this._gpuPoller.stop();
        this._gpu.drop();
        this._updateFrequency.drop();
    }
}

export default GpuUsageService;
