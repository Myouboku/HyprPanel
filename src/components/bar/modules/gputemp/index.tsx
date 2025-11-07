import { Module } from '../../shared/module';
import { bind, Variable } from 'astal';
import { Astal } from 'astal/gtk3';
import { BarBoxChild } from 'src/components/bar/types';
import { InputHandlerService } from '../../utils/input/inputHandler';
import GpuTempService from 'src/services/system/gputemp';
import options from 'src/configuration';
import { TemperatureConverter } from 'src/lib/units/temperature';
import { getGpuTempTooltip } from './helpers';

const inputHandler = InputHandlerService.getInstance();

const {
    label,
    round,
    showUnit,
    unit,
    leftClick,
    rightClick,
    middleClick,
    scrollUp,
    scrollDown,
    pollingInterval,
    icon,
} = options.bar.customModules.gpuTemp;

const gpuTempService = new GpuTempService({ frequency: pollingInterval });

export const GpuTemp = (): BarBoxChild => {
    gpuTempService.initialize();

    const bindings = Variable.derive([bind(round), bind(unit)], () => {
        gpuTempService.refresh();
    });

    const labelBinding = Variable.derive(
        [bind(gpuTempService.temperature), bind(unit), bind(showUnit), bind(round)],
        (gpuTemp, tempUnit, showUnit, roundValue) => {
            const tempConverter = TemperatureConverter.fromCelsius(gpuTemp);
            const isImperial = tempUnit === 'imperial';
            const precision = roundValue ? 0 : 2;

            if (showUnit) {
                return isImperial
                    ? tempConverter.formatFahrenheit(precision)
                    : tempConverter.formatCelsius(precision);
            }

            const temp = isImperial
                ? tempConverter.toFahrenheit(precision)
                : tempConverter.toCelsius(precision);

            return temp.toString();
        },
    );

    let inputHandlerBindings: Variable<void>;

    const gpuTempModule = Module({
        textIcon: bind(icon),
        label: labelBinding(),
        tooltipText: getGpuTempTooltip(gpuTempService),
        boxClass: 'gpu-temp',
        showLabelBinding: bind(label),
        props: {
            setup: (self: Astal.Button) => {
                inputHandlerBindings = inputHandler.attachHandlers(self, {
                    onPrimaryClick: {
                        cmd: leftClick,
                    },
                    onSecondaryClick: {
                        cmd: rightClick,
                    },
                    onMiddleClick: {
                        cmd: middleClick,
                    },
                    onScrollUp: {
                        cmd: scrollUp,
                    },
                    onScrollDown: {
                        cmd: scrollDown,
                    },
                });
            },
            onDestroy: () => {
                inputHandlerBindings.drop();
                gpuTempService.destroy();
                labelBinding.drop();
                bindings.drop();
            },
        },
    });

    return gpuTempModule;
};
