import GLib from 'gi://GLib?version=2.0';
import { GpuSensorInfo } from './types';

export class GpuTempSensorDiscovery {
    private static readonly _PRIORITY_SENSORS = [
        /** AMD GPU */
        'amdgpu',
        /** NVIDIA GPU */
        'nvidia_gpu',
    ];

    private static readonly _HWMON_PATH = '/sys/class/hwmon';

    /**
     * Auto-discovers the best GPU temperature sensor available on the system
     * For AMD GPUs, returns the edge temperature (temp1_input)
     */
    public static discover(): string | undefined {
        const prioritySensor = this._findPrioritySensor();
        if (prioritySensor) return prioritySensor;

        return undefined;
    }

    /**
     * Gets all available GPU temperature sensors on the system
     */
    public static getAllSensors(): GpuSensorInfo[] {
        return this._getAllHwmonSensors();
    }

    /**
     * Validates if sensor path exists and is readable
     *
     * @param path - Sensor file path to validate
     */
    public static isValid(path: string): boolean {
        try {
            const [success] = GLib.file_get_contents(path);
            return success;
        } catch {
            return false;
        }
    }

    /**
     * Searches for priority GPU sensors (AMD amdgpu, NVIDIA nvidia_gpu) in order of preference
     */
    private static _findPrioritySensor(): string | undefined {
        for (const sensorName of this._PRIORITY_SENSORS) {
            const sensor = this._findHwmonSensor(sensorName);

            if (!sensor || !this.isValid(sensor)) continue;

            return sensor;
        }

        return undefined;
    }

    /**
     * Finds a specific hardware monitor sensor by chip name
     *
     * @param chipName - Name of the chip to search for (e.g., 'amdgpu', 'nvidia_gpu')
     */
    private static _findHwmonSensor(chipName: string): string | undefined {
        const dir = this._openDirectory(this._HWMON_PATH);
        if (!dir) return undefined;

        try {
            return this._searchDirectoryForChip(dir, chipName);
        } finally {
            dir.close();
        }
    }

    /**
     * Searches through a directory for a specific chip by name
     *
     * @param dir - Open directory handle to search through
     * @param chipName - Name of the chip to find
     */
    private static _searchDirectoryForChip(dir: GLib.Dir, chipName: string): string | undefined {
        let dirname: string | null;

        while ((dirname = dir.read_name()) !== null) {
            const sensor = this._checkHwmonDir(dirname, chipName);
            if (sensor) return sensor;
        }

        return undefined;
    }

    /**
     * Checks if a hwmon directory contains the specified chip and returns its temp sensor path
     * For AMD GPUs, returns temp1_input (edge temperature)
     *
     * @param dirname - Directory name to check (e.g., 'hwmon0')
     * @param chipName - Expected chip name to match against
     */
    private static _checkHwmonDir(dirname: string, chipName: string): string | undefined {
        const nameFile = `${this._HWMON_PATH}/${dirname}/name`;
        const name = this._readFileContent(nameFile);

        if (!name || name !== chipName) return undefined;

        return `${this._HWMON_PATH}/${dirname}/temp1_input`;
    }

    /**
     * Collects all hardware monitor GPU sensors from the system
     */
    private static _getAllHwmonSensors(): GpuSensorInfo[] {
        const dir = this._openDirectory(this._HWMON_PATH);
        if (!dir) return [];

        try {
            return this._collectHwmonSensors(dir);
        } finally {
            dir.close();
        }
    }

    /**
     * Iterates through hwmon directory entries and collects valid GPU sensor information
     *
     * @param dir - Open hwmon directory handle
     */
    private static _collectHwmonSensors(dir: GLib.Dir): GpuSensorInfo[] {
        const sensors: GpuSensorInfo[] = [];
        let dirname: string | null;

        while ((dirname = dir.read_name()) !== null) {
            const sensor = this._createHwmonSensorInfo(dirname);
            if (sensor) sensors.push(sensor);
        }

        return sensors;
    }

    /**
     * Creates sensor info object for a hwmon device if it's a GPU sensor
     *
     * @param dirname - hwmon directory name (e.g., 'hwmon0')
     */
    private static _createHwmonSensorInfo(dirname: string): GpuSensorInfo | undefined {
        const nameFile = `${this._HWMON_PATH}/${dirname}/name`;
        const name = this._readFileContent(nameFile);

        if (!name) return undefined;

        if (name !== 'amdgpu' && name !== 'nvidia_gpu') return undefined;

        const tempPath = `${this._HWMON_PATH}/${dirname}/temp1_input`;
        if (!this.isValid(tempPath)) return undefined;

        const label = this._readFileContent(`${this._HWMON_PATH}/${dirname}/temp1_label`);

        return {
            path: tempPath,
            name,
            type: name as 'amdgpu' | 'nvidia_gpu',
            label: label || 'edge',
        };
    }

    /**
     * Safely opens a directory for reading, returns undefined on failure
     *
     * @param path - Full path to the directory to open
     */
    private static _openDirectory(path: string): GLib.Dir | undefined {
        try {
            return GLib.Dir.open(path, 0);
        } catch {
            return undefined;
        }
    }

    /**
     * Reads and returns trimmed file content, returns undefined on failure
     *
     * @param path - Full path to the file to read
     */
    private static _readFileContent(path: string): string | undefined {
        try {
            const [success, bytes] = GLib.file_get_contents(path);
            if (!success || !bytes) return undefined;
            return new TextDecoder('utf-8').decode(bytes).trim();
        } catch {
            return undefined;
        }
    }
}
