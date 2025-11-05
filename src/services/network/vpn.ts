import { execAsync, Variable } from 'astal';
import AstalNetwork from 'gi://AstalNetwork?version=0.1';
import NM from 'gi://NM?version=1.0';
import { SystemUtilities } from 'src/core/system/SystemUtilities';

export interface VpnConnection {
    name: string;
    state: string;
    device: string;
}

export class VpnManager {
    private _astalNetwork: AstalNetwork.Network;
    private _nmClient: NM.Client | null = null;
    private _connectionMonitors: Map<string, number> = new Map();

    public vpnConnections: Variable<VpnConnection[]> = Variable([]);
    public activeVpn: Variable<string | undefined> = Variable(undefined);
    public connecting: Variable<string> = Variable('');

    constructor(networkService: AstalNetwork.Network) {
        this._astalNetwork = networkService;
        this._nmClient = this._astalNetwork.get_client();
        this._setupBindings();
    }

    private _setupBindings(): void {
        if (!this._nmClient) {
            console.error('NetworkManager client not available');
            return;
        }

        this._loadVpnConnections();
        this._monitorExistingConnections();

        this._nmClient.connect('connection-added', () => {
            this._loadVpnConnections();
        });

        this._nmClient.connect('connection-removed', () => {
            this._loadVpnConnections();
        });

        this._nmClient.connect(
            'active-connection-added',
            (_client: NM.Client, activeConn: NM.ActiveConnection) => {
                this._monitorActiveConnection(activeConn);
                this._updateActiveVpnFromClient();
            },
        );

        this._nmClient.connect(
            'active-connection-removed',
            (_client: NM.Client, activeConn: NM.ActiveConnection) => {
                const connPath = activeConn.get_path();
                const handlerId = this._connectionMonitors.get(connPath);
                if (handlerId !== undefined) {
                    activeConn.disconnect(handlerId);
                    this._connectionMonitors.delete(connPath);
                }
                this._updateActiveVpnFromClient();
            },
        );
    }

    private _monitorActiveConnection(activeConn: NM.ActiveConnection): void {
        const connection = activeConn.get_connection();
        if (!connection) {
            return;
        }

        const settings = connection.get_setting_connection();
        if (!settings) {
            return;
        }

        const connectionType = settings.get_connection_type();
        if (connectionType !== 'vpn' && connectionType !== 'wireguard') {
            return;
        }

        const connPath = activeConn.get_path();

        if (this._connectionMonitors.has(connPath)) {
            return;
        }

        const handlerId = activeConn.connect('notify::state', () => {
            this._updateActiveVpnFromClient();
            this._loadVpnConnections();
        });

        this._connectionMonitors.set(connPath, handlerId);
    }

    private _monitorExistingConnections(): void {
        if (!this._nmClient) {
            return;
        }

        const activeConnections = this._nmClient.get_active_connections();
        for (let i = 0; i < activeConnections.length; i++) {
            const activeConn = activeConnections[i] as NM.ActiveConnection;
            this._monitorActiveConnection(activeConn);
        }
    }

    private _cleanupConnectionMonitors(): void {
        if (!this._nmClient) {
            return;
        }

        const activeConnections = this._nmClient.get_active_connections();

        this._connectionMonitors.forEach((handlerId, connPath) => {
            for (let i = 0; i < activeConnections.length; i++) {
                const activeConn = activeConnections[i] as NM.ActiveConnection;
                if (activeConn.get_path() === connPath) {
                    activeConn.disconnect(handlerId);
                    break;
                }
            }
        });

        this._connectionMonitors.clear();
    }

    private _loadVpnConnections(): void {
        if (!this._nmClient) {
            this.vpnConnections.set([]);
            return;
        }

        const connections = this._nmClient.get_connections();
        const vpnConnections: VpnConnection[] = [];

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i] as NM.RemoteConnection;
            const settings = connection.get_setting_connection();

            if (settings) {
                const connectionType = settings.get_connection_type();
                if (connectionType === 'vpn' || connectionType === 'wireguard') {
                    const id = settings.get_id() || '';
                    const state = this._getConnectionState(connection);
                    const device = this._getConnectionDevice(connection);

                    vpnConnections.push({
                        name: id,
                        state: state,
                        device: device,
                    });
                }
            }
        }

        this.vpnConnections.set(vpnConnections);
        this._updateActiveVpn(vpnConnections);
    }

    private _getConnectionState(connection: NM.RemoteConnection): string {
        if (!this._nmClient) {
            return '';
        }

        const activeConnections = this._nmClient.get_active_connections();
        const connectionPath = connection.get_path();

        for (let i = 0; i < activeConnections.length; i++) {
            const activeConn = activeConnections[i] as NM.ActiveConnection;
            const activeConnPath = activeConn.get_connection()?.get_path();

            if (activeConnPath === connectionPath) {
                const state = activeConn.get_state();
                return this._nmStateToString(state);
            }
        }

        return '';
    }

    private _getConnectionDevice(connection: NM.RemoteConnection): string {
        if (!this._nmClient) {
            return '';
        }

        const activeConnections = this._nmClient.get_active_connections();
        const connectionPath = connection.get_path();

        for (let i = 0; i < activeConnections.length; i++) {
            const activeConn = activeConnections[i] as NM.ActiveConnection;
            const activeConnPath = activeConn.get_connection()?.get_path();

            if (activeConnPath === connectionPath) {
                const devices = activeConn.get_devices();
                if (devices && devices.length > 0) {
                    return devices[0].get_iface() || '';
                }
            }
        }

        return '';
    }

    private _nmStateToString(state: NM.ActiveConnectionState): string {
        switch (state) {
            case NM.ActiveConnectionState.ACTIVATED:
                return 'activated';
            case NM.ActiveConnectionState.ACTIVATING:
                return 'activating';
            case NM.ActiveConnectionState.DEACTIVATING:
                return 'deactivating';
            case NM.ActiveConnectionState.DEACTIVATED:
                return 'deactivated';
            default:
                return '';
        }
    }

    private _updateActiveVpnFromClient(): void {
        if (!this._nmClient) {
            this.activeVpn.set(undefined);
            return;
        }

        const activeConnections = this._nmClient.get_active_connections();

        for (let i = 0; i < activeConnections.length; i++) {
            const activeConn = activeConnections[i] as NM.ActiveConnection;
            const connection = activeConn.get_connection();

            if (!connection) {
                continue;
            }

            const settings = connection.get_setting_connection();
            if (!settings) {
                continue;
            }

            const connectionType = settings.get_connection_type();
            if (connectionType === 'vpn' || connectionType === 'wireguard') {
                const id = settings.get_id();
                if (id && activeConn.get_state() === NM.ActiveConnectionState.ACTIVATED) {
                    this.activeVpn.set(id);
                    this._loadVpnConnections();
                    return;
                }
            }
        }

        this.activeVpn.set(undefined);
        this._loadVpnConnections();
    }

    private _updateActiveVpn(connections: VpnConnection[]): void {
        const active = connections.find((vpn) => vpn.state === 'activated');
        this.activeVpn.set(active?.name);
    }

    public onVpnServiceChanged(): void {
        this._cleanupConnectionMonitors();
        this._nmClient = this._astalNetwork.get_client();
        this._setupBindings();
    }

    public async refreshVpnConnections(): Promise<void> {
        this._loadVpnConnections();
    }

    public isVpnActive(vpnName: string): boolean {
        return this.activeVpn.get() === vpnName;
    }

    public isVpnConnecting(vpnName: string): boolean {
        return this.connecting.get() === vpnName;
    }

    public async connectToVpn(vpnName: string): Promise<void> {
        if (this.isVpnActive(vpnName) || this.isVpnConnecting(vpnName)) {
            return;
        }

        this.connecting.set(vpnName);

        try {
            await execAsync(`nmcli connection up "${vpnName}"`);
            await this.refreshVpnConnections();
            this.connecting.set('');
            SystemUtilities.notify({
                summary: 'VPN',
                body: `Connected to ${vpnName}`,
            });
        } catch (err) {
            this.connecting.set('');
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            SystemUtilities.notify({
                summary: 'VPN',
                body: `Failed to connect to ${vpnName}: ${errorMessage}`,
            });
            throw err;
        }
    }

    public async disconnectFromVpn(vpnName: string): Promise<void> {
        if (!this.isVpnActive(vpnName)) {
            return;
        }

        this.connecting.set(vpnName);

        try {
            await execAsync(`nmcli connection down "${vpnName}"`);
            await this.refreshVpnConnections();
            this.connecting.set('');
            SystemUtilities.notify({
                summary: 'VPN',
                body: `Disconnected from ${vpnName}`,
            });
        } catch (err) {
            this.connecting.set('');
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            SystemUtilities.notify({
                summary: 'VPN',
                body: `Failed to disconnect from ${vpnName}: ${errorMessage}`,
            });
            throw err;
        }
    }

    public async toggleVpn(vpnName: string): Promise<void> {
        if (this.isVpnActive(vpnName)) {
            await this.disconnectFromVpn(vpnName);
        } else {
            await this.connectToVpn(vpnName);
        }
    }

    public getVpnStateText(vpn: VpnConnection): string {
        if (this.isVpnConnecting(vpn.name)) {
            return 'Connecting...';
        }

        switch (vpn.state) {
            case 'activated':
                return 'Connected';
            case 'activating':
                return 'Connecting...';
            case 'deactivating':
                return 'Disconnecting...';
            default:
                return 'Disconnected';
        }
    }
}
