import { Variable, bind } from 'astal';
import { Astal } from 'astal/gtk3';
import AstalBluetooth from 'gi://AstalBluetooth?version=0.1';
import { BarBoxChild } from 'src/components/bar/types.js';
import options from 'src/configuration';
import { SystemUtilities } from 'src/core/system/SystemUtilities';
import { onMiddleClick, onPrimaryClick, onScroll, onSecondaryClick } from 'src/lib/shared/eventHandlers';
import { runAsyncCommand } from '../../utils/input/commandExecutor';
import { throttledScrollHandler } from '../../utils/input/throttle';
import { openDropdownMenu } from '../../utils/menu';

const bluetoothService = AstalBluetooth.get_default();
const btStatus = SystemUtilities.checkServiceStatus(['bluetooth.service']);

const { rightClick, middleClick, scrollDown, scrollUp } = options.bar.bluetooth;

const Bluetooth = (): BarBoxChild => {
    const BluetoothIcon = ({ isPowered }: BluetoothIconProps): JSX.Element => (
        <label className={'bar-button-icon bluetooth txt-icon bar'} label={isPowered ? '󰂯' : '󰂲'} />
    );

    const BluetoothLabel = ({
        isPowered,
        devices,
        showDeviceNameWhenSingle,
    }: BluetoothLabelProps): JSX.Element => {
        const connectDevices = devices.filter((device) => device.connected);

        let label = '';

        if (btStatus === 'MISSING') {
            label = 'Unavailable';
        } else if (isPowered && connectDevices.length) {
            if (showDeviceNameWhenSingle && connectDevices.length === 1) {
                label = ` ${connectDevices[0].name}`;
            } else {
                label = ` Connected (${connectDevices.length})`;
            }
        } else if (isPowered) {
            label = 'On';
        } else {
            label = 'Off';
        }

        return <label label={label} className={'bar-button-label bluetooth'} />;
    };

    const componentClassName = Variable.derive(
        [options.theme.bar.buttons.style, options.bar.bluetooth.label],
        (style, showLabel) => {
            const styleMap = {
                default: 'style1',
                split: 'style2',
                wave: 'style3',
                wave2: 'style3',
            };
            return `bluetooth-container ${styleMap[style]} ${!showLabel ? 'no-label' : ''}`;
        },
    );

    const componentBinding = Variable.derive(
        [
            bind(options.bar.bluetooth.label),
            bind(options.bar.bluetooth.showDeviceNameWhenSingle),
            bind(bluetoothService, 'isPowered'),
            bind(bluetoothService, 'devices'),

            bind(bluetoothService, 'isConnected'),
        ],
        (
            showLabel: boolean,
            showDeviceNameWhenSingle: boolean,
            isPowered: boolean,
            devices: AstalBluetooth.Device[],
        ): JSX.Element => {
            if (showLabel) {
                return (
                    <box>
                        <BluetoothIcon isPowered={isPowered} />
                        <BluetoothLabel
                            isPowered={isPowered}
                            devices={devices}
                            showDeviceNameWhenSingle={showDeviceNameWhenSingle}
                        />
                    </box>
                );
            }

            return <BluetoothIcon isPowered={isPowered} />;
        },
    );

    const component = <box className={componentClassName()}>{componentBinding()}</box>;

    return {
        component,
        isVisible: true,
        boxClass: 'bluetooth',
        props: {
            setup: (self: Astal.Button): void => {
                let disconnectFunctions: (() => void)[] = [];

                Variable.derive(
                    [
                        bind(rightClick),
                        bind(middleClick),
                        bind(scrollUp),
                        bind(scrollDown),
                        bind(options.bar.scrollSpeed),
                    ],
                    () => {
                        disconnectFunctions.forEach((disconnect) => disconnect());
                        disconnectFunctions = [];

                        const throttledHandler = throttledScrollHandler(options.bar.scrollSpeed.get());

                        disconnectFunctions.push(
                            onPrimaryClick(self, (clicked, event) => {
                                openDropdownMenu(clicked, event, 'bluetoothmenu');
                            }),
                        );

                        disconnectFunctions.push(
                            onSecondaryClick(self, (clicked, event) => {
                                runAsyncCommand(rightClick.get(), { clicked, event });
                            }),
                        );

                        disconnectFunctions.push(
                            onMiddleClick(self, (clicked, event) => {
                                runAsyncCommand(middleClick.get(), { clicked, event });
                            }),
                        );

                        disconnectFunctions.push(
                            onScroll(self, throttledHandler, scrollUp.get(), scrollDown.get()),
                        );
                    },
                );
            },
            onDestroy: (): void => {
                componentClassName.drop();
                componentBinding.drop();
            },
        },
    };
};

interface BluetoothIconProps {
    isPowered: boolean;
}

interface BluetoothLabelProps {
    isPowered: boolean;
    devices: AstalBluetooth.Device[];
    showDeviceNameWhenSingle: boolean;
}

export { Bluetooth };
