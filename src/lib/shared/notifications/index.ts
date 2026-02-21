import AstalNotifd from 'gi://AstalNotifd?version=0.1';
import { Variable } from 'astal';
import { iconExists } from 'src/lib/icons/helpers';
import icons from 'src/lib/icons/icons';

const normalizeName = (name: string): string => name.toLowerCase().replace(/\s+/g, '_');

export const removingNotifications = Variable(false);
export const dismissingNotifications = Variable<Set<AstalNotifd.Notification>>(new Set());

const clampAnimationDuration = (duration: number): number => {
    return Math.max(0, duration);
};

const addDismissingNotification = (notification: AstalNotifd.Notification): void => {
    const current = dismissingNotifications.get();

    if (current.has(notification)) {
        return;
    }

    const next = new Set(current);
    next.add(notification);
    dismissingNotifications.set(next);
};

const removeDismissingNotification = (notification: AstalNotifd.Notification): void => {
    const current = dismissingNotifications.get();

    if (!current.has(notification)) {
        return;
    }

    const next = new Set(current);
    next.delete(notification);
    dismissingNotifications.set(next);
};

export const dismissNotificationWithAnimation = (
    notification: AstalNotifd.Notification,
    animationDuration: number,
): void => {
    const duration = clampAnimationDuration(animationDuration);

    if (duration === 0) {
        notification.dismiss();
        return;
    }

    if (dismissingNotifications.get().has(notification)) {
        return;
    }

    addDismissingNotification(notification);

    setTimeout(() => {
        notification.dismiss();
        removeDismissingNotification(notification);
    }, duration);
};

export const isNotificationIgnored = (
    notification: AstalNotifd.Notification | null,
    filter: string[],
): boolean => {
    if (!notification) {
        return false;
    }

    const notificationFilters = new Set(filter.map(normalizeName));
    const normalizedAppName = normalizeName(notification.app_name);

    return notificationFilters.has(normalizedAppName);
};

export const filterNotifications = (
    notifications: AstalNotifd.Notification[],
    filter: string[],
): AstalNotifd.Notification[] => {
    const filteredNotifications = notifications.filter((notif: AstalNotifd.Notification) => {
        return !isNotificationIgnored(notif, filter);
    });

    return filteredNotifications;
};

export const getNotificationIcon = (app_name: string, app_icon: string, app_entry: string): string => {
    const icon = icons.fallback.notification;

    // Priority 1: app_entry (most reliable for Flatpak apps with reverse-DNS naming)
    if (app_entry && iconExists(app_entry)) {
        return app_entry;
    }

    // Priority 2: app_icon
    if (app_icon && iconExists(app_icon)) {
        return app_icon;
    }

    // Priority 3: app_name
    if (iconExists(app_name)) {
        return app_name;
    }

    // Priority 4: app_name.toLowerCase()
    if (app_name && iconExists(app_name.toLowerCase())) {
        return app_name.toLowerCase();
    }

    // Fallback to default notification icon
    return icon;
};

export const clearNotifications = async (
    notifications: AstalNotifd.Notification[],
    animationDuration: number,
): Promise<void> => {
    if (notifications.length === 0) {
        return;
    }

    const duration = clampAnimationDuration(animationDuration);

    removingNotifications.set(true);

    notifications.forEach((notification) => {
        dismissNotificationWithAnimation(notification, duration);
    });

    if (duration > 0) {
        await new Promise((resolve) => setTimeout(resolve, duration));
    }
    removingNotifications.set(false);
};
