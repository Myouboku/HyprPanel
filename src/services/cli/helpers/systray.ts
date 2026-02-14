import AstalTray from 'gi://AstalTray';
import { errorHandler } from 'src/core/errors/handler';

let systemTrayInstance: AstalTray.Tray | null = null;

const getSystemTray = (): AstalTray.Tray => {
    if (systemTrayInstance === null) {
        systemTrayInstance = AstalTray.get_default();
    }

    return systemTrayInstance;
};

/**
 * Retrieves all system tray items and returns their IDs
 *
 * @returns A newline-separated string of system tray item IDs
 */
export function getSystrayItems(): string | undefined {
    try {
        const items = getSystemTray()
            .get_items()
            .map((systrayItem) => systrayItem.id)
            .join('\n');

        return items;
    } catch (error) {
        errorHandler(error);
        return undefined;
    }
}
