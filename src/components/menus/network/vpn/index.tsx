import { Gtk } from 'astal/gtk3';
import { bind } from 'astal/binding';
import { NetworkService } from 'src/services/network';
import { VpnConnection } from './VpnConnection';

const networkService = NetworkService.getInstance();

/**
 * Vpn component displays the VPN section in the network menu
 *
 * @returns A JSX element representing the VPN section
 */
export const Vpn = (): JSX.Element => {
    return (
        <box className={'menu-section-container vpn'} vertical>
            <box className={'menu-label-container'} halign={Gtk.Align.FILL}>
                <label className={'menu-label'} halign={Gtk.Align.START} hexpand label={'VPN'} />
            </box>
            <box className={'menu-items-section'} vertical>
                <box className={'menu-content'} vertical>
                    {bind(networkService.vpn.vpnConnections).as((vpnConnections) => {
                        if (vpnConnections.length === 0) {
                            return (
                                <box className={'network-element-item'}>
                                    <label
                                        className={'waps-not-found dim'}
                                        halign={Gtk.Align.CENTER}
                                        hexpand
                                        label={'No VPN connections configured'}
                                    />
                                </box>
                            );
                        }

                        return vpnConnections.map((vpn) => <VpnConnection vpn={vpn} />);
                    })}
                </box>
            </box>
        </box>
    );
};
