import { execAsync, Variable } from 'astal';
import AstalNetwork from 'gi://AstalNetwork?version=0.1';
import NM from 'gi://NM?version=1.0';
import { SystemUtilities } from 'src/core/system/SystemUtilities';

/**
 * Represents a VPN connection
 */
export interface VpnConnection {
    name: string;
    state: string;
    device: string;
}

/**
 * VpnManager handles all VPN-related functionality for managing VPN connections
 */
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

    /**
     * Sets up bindings to monitor VPN connection changes
     */
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

    /**
     * Monitors an active connection for state changes
     *
     * @param activeConn - The active connection to monitor
     */
    private _monitorActiveConnection(activeConn: NM.ActiveConnection): void {
        if (!(activeConn instanceof NM.VpnConnection)) {
            return;
        }

        const connPath = activeConn.get_path();

        // Don't monitor if already monitoring this connection
        if (this._connectionMonitors.has(connPath)) {
            return;
        }

        // Listen for state changes on this connection
        const handlerId = activeConn.connect('notify::state', () => {
            this._updateActiveVpnFromClient();
            this._loadVpnConnections();
        });

        this._connectionMonitors.set(connPath, handlerId);
    }

    /**
     * Monitors all existing active VPN connections at startup
     */
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

    /**
     * Cleans up all connection monitors
     */
    private _cleanupConnectionMonitors(): void {
        if (!this._nmClient) {
            return;
        }

        const activeConnections = this._nmClient.get_active_connections();

        this._connectionMonitors.forEach((handlerId, connPath) => {
            // Find the connection by path
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

    /**
     * Loads all VPN connections from NetworkManager via the NM.Client
     */
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

            if (settings && settings.get_connection_type() === 'vpn') {
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

        this.vpnConnections.set(vpnConnections);
        this._updateActiveVpn(vpnConnections);
    }

    /**
     * Gets the state of a connection by checking active connections
     *
     * @param connection - The connection to check
     * @returns The state string
     */
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

    /**
     * Gets the device associated with a connection
     *
     * @param connection - The connection to check
     * @returns The device name
     */
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

    /**
     * Converts NM.ActiveConnectionState to a string
     *
     * @param state - The NM state
     * @returns The state string
     */
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

    /**
     * Updates the active VPN connection from the NM.Client
     */
    private _updateActiveVpnFromClient(): void {
        if (!this._nmClient) {
            this.activeVpn.set(undefined);
            return;
        }

        const activeConnections = this._nmClient.get_active_connections();

        for (let i = 0; i < activeConnections.length; i++) {
            const activeConn = activeConnections[i] as NM.ActiveConnection;

            if (activeConn instanceof NM.VpnConnection) {
                const connection = activeConn.get_connection();
                if (connection) {
                    const settings = connection.get_setting_connection();
                    if (settings) {
                        const id = settings.get_id();
                        if (id && activeConn.get_state() === NM.ActiveConnectionState.ACTIVATED) {
                            this.activeVpn.set(id);
                            this._loadVpnConnections();
                            return;
                        }
                    }
                }
            }
        }

        this.activeVpn.set(undefined);
        this._loadVpnConnections();
    }

    /**
     * Updates the active VPN connection
     *
     * @param connections - The list of VPN connections
     */
    private _updateActiveVpn(connections: VpnConnection[]): void {
        const active = connections.find((vpn) => vpn.state === 'activated');
        this.activeVpn.set(active?.name);
    }

    /**
     * Called when the VPN service changes to update bindings
     */
    public onVpnServiceChanged(): void {
        this._cleanupConnectionMonitors();
        this._nmClient = this._astalNetwork.get_client();
        this._setupBindings();
    }

    /**
     * Refreshes the list of VPN connections
     */
    public async refreshVpnConnections(): Promise<void> {
        this._loadVpnConnections();
    }

    /**
     * Checks if a VPN connection is active
     *
     * @param vpnName - The name of the VPN connection
     * @returns True if the VPN is active, false otherwise
     */
    public isVpnActive(vpnName: string): boolean {
        return this.activeVpn.get() === vpnName;
    }

    /**
     * Checks if a VPN connection is currently connecting
     *
     * @param vpnName - The name of the VPN connection
     * @returns True if the VPN is connecting, false otherwise
     */
    public isVpnConnecting(vpnName: string): boolean {
        return this.connecting.get() === vpnName;
    }

    /**
     * Connects to a VPN
     *
     * @param vpnName - The name of the VPN connection to connect to
     */
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

    /**
     * Disconnects from a VPN
     *
     * @param vpnName - The name of the VPN connection to disconnect from
     */
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

    /**
     * Toggles the VPN connection state
     *
     * @param vpnName - The name of the VPN connection to toggle
     */
    public async toggleVpn(vpnName: string): Promise<void> {
        if (this.isVpnActive(vpnName)) {
            await this.disconnectFromVpn(vpnName);
        } else {
            await this.connectToVpn(vpnName);
        }
    }

    /**
     * Gets the display state text for a VPN connection
     *
     * @param vpn - The VPN connection
     * @returns The display state text
     */
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
