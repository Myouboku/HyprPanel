import { bind, Binding } from 'astal';
import GpuTempService from 'src/services/system/gputemp';
import { TemperatureConverter } from 'src/lib/units/temperature';
import { GpuTempSensorDiscovery } from 'src/services/system/gputemp/sensorDiscovery';
import options from 'src/configuration';
import GLib from 'gi://GLib?version=2.0';

const { pollingInterval } = options.bar.customModules.gpuTemp;

/**
 * Creates a tooltip for the GPU temperature module showing sensor details
 */
export function getGpuTempTooltip(gpuTempService: GpuTempService): Binding<string> {
    return bind(gpuTempService.temperature).as((temp) => {
        const currentPath = gpuTempService.currentSensorPath;

        const tempC = TemperatureConverter.fromCelsius(temp).formatCelsius();
        const tempF = TemperatureConverter.fromCelsius(temp).formatFahrenheit();

        const lines = [
            'GPU Temperature',
            '─────────────────────────',
            `Current: ${tempC} (${tempF})`,
            '',
            'Sensor Information',
            '─────────────────────────',
        ];

        if (currentPath) {
            const sensorType = getSensorType(currentPath);
            const sensorName = getSensorName(currentPath);
            const chipName = getChipName(currentPath);

            lines.push('Mode: Auto-discovered', `Type: ${sensorType}`);

            if (chipName) {
                lines.push(`Chip: ${chipName}`);
            }

            lines.push(`Device: ${sensorName}`, `Path: ${currentPath}`);
        } else {
            lines.push('Status: No sensor found', 'No GPU temperature sensor detected');
        }

        const interval = pollingInterval.get();
        lines.push('', `Update interval: ${interval}ms`);

        const allSensors = GpuTempSensorDiscovery.getAllSensors();
        if (allSensors.length > 1) {
            lines.push('', `Available sensors: ${allSensors.length}`);
        }

        return lines.join('\n');
    });
}

/**
 * Determines sensor type from path
 */
function getSensorType(path: string): string {
    if (path.includes('/sys/class/hwmon/')) return 'Hardware Monitor';
    return 'Unknown';
}

/**
 * Extracts sensor name from path
 */
function getSensorName(path: string): string {
    if (path.includes('/sys/class/hwmon/')) {
        const match = path.match(/hwmon(\d+)/);
        return match ? `hwmon${match[1]}` : 'Unknown';
    }

    return 'Unknown';
}

/**
 * Gets the actual chip name for hwmon sensors
 */
function getChipName(path: string): string | undefined {
    if (!path.includes('/sys/class/hwmon/')) return undefined;

    try {
        const match = path.match(/\/sys\/class\/hwmon\/hwmon\d+/);
        if (!match) return undefined;

        const nameFile = `${match[0]}/name`;
        const [success, bytes] = GLib.file_get_contents(nameFile);

        if (success && bytes) {
            return new TextDecoder('utf-8').decode(bytes).trim();
        }
    } catch (error) {
        if (error instanceof Error) {
            console.debug(`Failed to get chip name: ${error.message}`);
        }
    }

    return undefined;
}
