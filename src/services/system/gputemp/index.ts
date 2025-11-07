import { bind, Variable } from 'astal';
import GLib from 'gi://GLib?version=2.0';
import { FunctionPoller } from 'src/lib/poller/FunctionPoller';
import { GpuTempServiceCtor } from './types';
import { GpuTempSensorDiscovery } from './sensorDiscovery';

/**
 * Service for monitoring GPU temperature from system sensors
 * Supports AMD (amdgpu) and NVIDIA (nvidia_gpu) GPUs
 */
class GpuTempService {
    private _sensor: Variable<string>;
    private _updateFrequency: Variable<number>;
    private _tempPoller: FunctionPoller<number, []>;
    private _isInitialized = false;
    private _temperature = Variable(0);
    private _resolvedSensorPath?: string;

    constructor({ sensor, frequency }: GpuTempServiceCtor = {}) {
        this._sensor = sensor ?? Variable('auto');
        this._updateFrequency = frequency || Variable(2000);

        this._readTemperature = this._readTemperature.bind(this);

        this._tempPoller = new FunctionPoller<number, []>(
            this._temperature,
            [],
            bind(this._updateFrequency),
            this._readTemperature,
        );

        this._sensor.subscribe(() => this._resolveSensorPath());
    }

    /**
     * Resolves the sensor path based on configuration
     */
    private _resolveSensorPath(): void {
        const sensorValue = this._sensor.get();

        if (sensorValue === 'auto' || sensorValue === '') {
            this._resolvedSensorPath = GpuTempSensorDiscovery.discover();
            if (!this._resolvedSensorPath) console.error('No GPU temperature sensor found');
            return;
        }

        if (GpuTempSensorDiscovery.isValid(sensorValue)) {
            this._resolvedSensorPath = sensorValue;
            return;
        }

        console.error(`Invalid sensor: ${sensorValue}, falling back to auto-discovery`);
        this._resolvedSensorPath = GpuTempSensorDiscovery.discover();
    }

    /**
     * Reads GPU temperature from the sensor file and returns it in Celsius
     */
    private _readTemperature(): number {
        if (!this._resolvedSensorPath) return 0;

        try {
            const [success, tempBytes] = GLib.file_get_contents(this._resolvedSensorPath);
            if (!success || !tempBytes) return 0;

            const tempInfo = new TextDecoder('utf-8').decode(tempBytes);
            const tempValueMillidegrees = parseInt(tempInfo.trim(), 10);
            return tempValueMillidegrees / 1000;
        } catch (error) {
            console.error('Error reading GPU temperature:', error);
            return 0;
        }
    }

    /**
     * Gets the GPU temperature variable
     *
     * @returns Variable containing temperature in Celsius
     */
    public get temperature(): Variable<number> {
        return this._temperature;
    }

    /**
     * Gets the sensor configuration variable
     *
     * @returns Variable containing sensor path or 'auto'
     */
    public get sensor(): Variable<string> {
        return this._sensor;
    }

    /**
     * Gets the currently resolved sensor file path
     *
     * @returns The actual sensor path being used
     */
    public get currentSensorPath(): string | undefined {
        return this._resolvedSensorPath;
    }

    /**
     * Manually refreshes the temperature reading
     */
    public refresh(): void {
        this._temperature.set(this._readTemperature());
    }

    /**
     * Updates the sensor path and refreshes the temperature
     *
     * @param sensor - New sensor path or 'auto' for auto-discovery
     */
    public updateSensor(sensor: string): void {
        this._sensor.set(sensor);
        this.refresh();
    }

    /**
     * Updates the polling frequency
     *
     * @param frequency - New polling interval in milliseconds
     */
    public updateFrequency(frequency: number): void {
        this._updateFrequency.set(frequency);
    }

    /**
     * Initializes the GPU temperature monitoring poller
     */
    public initialize(): void {
        if (this._isInitialized) return;

        this._resolveSensorPath();
        this._tempPoller.initialize();
        this._isInitialized = true;
    }

    /**
     * Stops the temperature polling
     */
    public stopPoller(): void {
        this._tempPoller.stop();
    }

    /**
     * Starts the temperature polling
     */
    public startPoller(): void {
        this._tempPoller.start();
    }

    /**
     * Cleans up resources and stops monitoring
     */
    public destroy(): void {
        this._tempPoller.stop();
        this._temperature.drop();
        this._sensor.drop();
        this._updateFrequency.drop();
    }
}

export default GpuTempService;
