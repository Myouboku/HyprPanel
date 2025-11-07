import { Module } from '../../shared/module';
import { bind, Variable } from 'astal';
import { Astal } from 'astal/gtk3';
import { BarBoxChild } from 'src/components/bar/types';
import options from 'src/configuration';
import { InputHandlerService } from '../../utils/input/inputHandler';
import GpuUsageService from 'src/services/system/gpuUsage';

const inputHandler = InputHandlerService.getInstance();

const { label, round, leftClick, rightClick, middleClick, scrollUp, scrollDown, pollingInterval, icon } =
    options.bar.customModules.gpu;

const gpuService = new GpuUsageService({ frequency: pollingInterval });

export const Gpu = (): BarBoxChild => {
    gpuService.initialize();

    const labelBinding = Variable.derive(
        [bind(gpuService.gpu), bind(round)],
        (gpuUsg: number, round: boolean) => {
            const percentage = gpuUsg * 100;
            return round ? `${Math.round(percentage)}%` : `${percentage.toFixed(2)}%`;
        },
    );

    let inputHandlerBindings: Variable<void>;

    const gpuModule = Module({
        textIcon: bind(icon),
        label: labelBinding(),
        tooltipText: 'GPU',
        boxClass: 'gpu',
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
                labelBinding.drop();
                gpuService.destroy();
            },
        },
    });

    return gpuModule;
};
