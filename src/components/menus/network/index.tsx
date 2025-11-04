import DropdownMenu from '../shared/dropdown/index.js';
import { Ethernet } from './ethernet/index.js';
import { Wifi } from './wifi/index.js';
import { Vpn } from './vpn/index.js';
import { bind, Variable } from 'astal';
import { NoWifi } from './wifi/WirelessAPs/NoWifi.js';
import { RevealerTransitionMap } from 'src/components/settings/constants.js';
import AstalNetwork from 'gi://AstalNetwork?version=0.1';
import options from 'src/configuration';

const networkService = AstalNetwork.get_default();

export default (): JSX.Element => {
    const { showEthernet, showWifi, showVpn } = options.bar.network;

    const wifiContent = Variable.derive([bind(networkService, 'wifi')], (wifi) => {
        if (wifi === null) {
            return <NoWifi visible={bind(showWifi)} />;
        }
        return <Wifi visible={bind(showWifi)} />;
    });

    return (
        <DropdownMenu
            name={'networkmenu'}
            transition={bind(options.menus.transition).as((transition) => RevealerTransitionMap[transition])}
        >
            <box className={'menu-items network'}>
                <box className={'menu-items-container network'} vertical hexpand>
                    <Ethernet visible={bind(showEthernet)} />
                    {wifiContent()}
                    <Vpn visible={bind(showVpn)} />
                </box>
            </box>
        </DropdownMenu>
    );
};
