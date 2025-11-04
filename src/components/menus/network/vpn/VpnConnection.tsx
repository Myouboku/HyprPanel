import { Gtk } from 'astal/gtk3';
import { bind } from 'astal/binding';
import { NetworkService } from 'src/services/network';
import { VpnConnection as VpnConnectionType } from 'src/services/network/vpn';
import Spinner from 'src/components/shared/Spinner';

const networkService = NetworkService.getInstance();

interface VpnConnectionProps {
    vpn: VpnConnectionType;
}

/**
 * VpnConnection component displays a single VPN connection item
 *
 * @param vpn - The VPN connection to display
 * @returns A JSX element representing the VPN connection
 */
export const VpnConnection = ({ vpn }: VpnConnectionProps): JSX.Element => {
    const handleClick = (): void => {
        networkService.vpn.toggleVpn(vpn.name).catch((err: unknown) => {
            console.error('Error toggling VPN:', err);
        });
    };

    return (
        <button className={'network-element-item vpn'} onClick={handleClick}>
            <box hexpand>
                <label
                    className={bind(networkService.vpn.activeVpn).as((activeVpn) => {
                        const isActive = activeVpn === vpn.name;
                        return `network-icon vpn ${isActive ? 'active' : ''} txt-icon`;
                    })}
                    label={bind(networkService.vpn.activeVpn).as((activeVpn) => {
                        const isActive = activeVpn === vpn.name;
                        return isActive ? '󰖂' : '󰌙';
                    })}
                />
                <box className={'connection-container'} valign={Gtk.Align.CENTER} vertical hexpand>
                    <label
                        className={'active-connection'}
                        valign={Gtk.Align.CENTER}
                        halign={Gtk.Align.START}
                        truncate
                        wrap
                        label={vpn.name}
                    />
                    <label
                        className={'connection-status dim'}
                        halign={Gtk.Align.START}
                        truncate
                        wrap
                        label={bind(networkService.vpn.connecting).as((connecting) => {
                            if (connecting === vpn.name) {
                                return 'Connecting...';
                            }
                            return networkService.vpn.getVpnStateText(vpn);
                        })}
                    />
                </box>
                <box className={'network-element-controls-container'} halign={Gtk.Align.END}>
                    {bind(networkService.vpn.connecting).as((connecting) => {
                        if (connecting === vpn.name) {
                            return <Spinner className={'spinner wap'} active={true} />;
                        }
                        return <box />;
                    })}
                </box>
            </box>
        </button>
    );
};
