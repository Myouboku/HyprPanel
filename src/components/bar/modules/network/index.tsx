import { openDropdownMenu } from '../../utils/menu';
import { bind, Variable } from 'astal';
import { onPrimaryClick, onSecondaryClick, onMiddleClick, onScroll } from 'src/lib/shared/eventHandlers';
import { Astal, Gtk } from 'astal/gtk3';
import AstalNetwork from 'gi://AstalNetwork?version=0.1';
import { formatWifiInfo, wiredIcon, wirelessIcon } from './helpers';
import { BarBoxChild } from 'src/components/bar/types';
import options from 'src/configuration';
import { runAsyncCommand } from '../../utils/input/commandExecutor';
import { throttledScrollHandler } from '../../utils/input/throttle';
import { NetworkService } from 'src/services/network';

const networkService = AstalNetwork.get_default();
const vpnService = NetworkService.getInstance();
const {
    label,
    truncation,
    truncation_size,
    rightClick,
    middleClick,
    scrollDown,
    scrollUp,
    showWifiInfo,
    showEthernet,
    showWifi,
    showVpn,
} = options.bar.network;

const Network = (): BarBoxChild => {
    const iconBinding = Variable.derive(
        [bind(networkService, 'primary'), bind(wiredIcon), bind(wirelessIcon)],
        (primaryNetwork, wiredIcon, wifiIcon) => {
            return primaryNetwork === AstalNetwork.Primary.WIRED ? wiredIcon : wifiIcon;
        },
    );

    const lastValidIcon = Variable<JSX.Element>(
        <label className={'bar-button-icon network-icon'} label="󰖂 " />,
    );

    const networkIcon = Variable.derive(
        [bind(vpnService.vpn.activeVpn), bind(iconBinding)],
        (activeVpn, icon) => {
            let result: JSX.Element | null = null;

            if (activeVpn) {
                result = <label className={'bar-button-icon network-icon'} label="󰖂 " />;
            } else if (icon && icon !== '') {
                result = <icon className={'bar-button-icon network-icon'} icon={icon} />;
            }

            if (result !== null) {
                lastValidIcon.set(result);
                return result;
            }

            return lastValidIcon.get();
        },
    );

    const lastValidLabel = Variable<JSX.Element>(
        <label className={'bar-button-label network-label'} label="--" />,
    );

    const networkLabel = Variable.derive(
        [
            bind(networkService, 'primary'),
            bind(label),
            bind(truncation),
            bind(truncation_size),
            bind(showWifiInfo),

            bind(networkService, 'state'),
            bind(networkService, 'connectivity'),
            bind(vpnService.vpn.activeVpn),
            ...(networkService.wifi !== null ? [bind(networkService.wifi, 'enabled')] : []),
        ],
        (primaryNetwork, showLabel, trunc, tSize, showWifiInfo, _state, _connectivity, activeVpn) => {
            if (!showLabel) {
                return <box />;
            }

            let result: JSX.Element | null = null;

            if (activeVpn) {
                result = <label className={'bar-button-label network-label'} label={activeVpn} />;
            } else if (primaryNetwork === AstalNetwork.Primary.WIRED) {
                result = (
                    <label className={'bar-button-label network-label'} label={'Wired'.substring(0, tSize)} />
                );
            } else {
                const networkWifi = networkService.wifi;
                if (networkWifi !== null) {
                    if (!networkWifi.enabled) {
                        result = <label className={'bar-button-label network-label'} label="Off" />;
                    } else if (networkWifi.active_access_point !== null) {
                        result = (
                            <label
                                className={'bar-button-label network-label'}
                                label={`${trunc ? networkWifi.ssid.substring(0, tSize) : networkWifi.ssid}`}
                                tooltipText={showWifiInfo ? formatWifiInfo(networkWifi) : ''}
                            />
                        );
                    } else {
                        result = <label className={'bar-button-label network-label'} label="--" />;
                    }
                }
            }

            if (result !== null) {
                lastValidLabel.set(result);
                return result;
            }

            return lastValidLabel.get();
        },
    );

    const componentClassName = Variable.derive(
        [bind(options.theme.bar.buttons.style), bind(options.bar.network.label)],
        (style, showLabel) => {
            const styleMap = {
                default: 'style1',
                split: 'style2',
                wave: 'style3',
                wave2: 'style3',
            };
            return `network-container ${styleMap[style]} ${!showLabel ? 'no-label' : ''}`;
        },
    );

    const component = (
        <box
            vexpand
            valign={Gtk.Align.FILL}
            className={componentClassName()}
            onDestroy={() => {
                iconBinding.drop();
                lastValidIcon.drop();
                networkIcon.drop();
                lastValidLabel.drop();
                networkLabel.drop();
                componentClassName.drop();
            }}
        >
            {networkIcon()}
            {networkLabel()}
        </box>
    );

    return {
        component,
        isVisible: true,
        boxClass: 'network',
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
                                if (showEthernet.get() || showWifi.get() || showVpn.get()) {
                                    openDropdownMenu(clicked, event, 'networkmenu');
                                }
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
        },
    };
};

export { Network };
