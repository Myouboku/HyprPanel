import AstalNotifd from 'gi://AstalNotifd?version=0.1';
import { Gtk } from 'astal/gtk3';
import { bind, Variable } from 'astal';
import { Placeholder } from './Placeholder';
import { NotificationCard } from 'src/components/notifications/Notification';
import options from 'src/configuration';
import {
    dismissNotificationWithAnimation,
    dismissingNotifications,
    filterNotifications,
} from 'src/lib/shared/notifications';

const notifdService = AstalNotifd.get_default();

const { displayedTotal, ignore, showActionsOnHover, clearAnimationDuration } = options.notifications;

type NotificationCardWidget = Gtk.Widget & {
    toggleClassName: (className: string, enabled?: boolean) => void;
};

export const NotificationsContainer = ({ curPage }: NotificationsContainerProps): JSX.Element => {
    return (
        <scrollable vscroll={Gtk.PolicyType.AUTOMATIC}>
            <box
                className={'menu-content-container notifications'}
                halign={Gtk.Align.FILL}
                spacing={0}
                vexpand
            >
                {Variable.derive(
                    [
                        bind(notifdService, 'notifications'),
                        bind(curPage),
                        bind(displayedTotal),
                        bind(ignore),
                        bind(showActionsOnHover),
                    ],
                    (notifications, currentPage, totalDisplayed, ignored, hoverActions) => {
                        const filteredNotifications = filterNotifications(notifications, ignored).sort(
                            (a, b) => b.time - a.time,
                        );

                        if (filteredNotifications.length <= 0) {
                            return <Placeholder />;
                        }

                        const pageStart = (currentPage - 1) * totalDisplayed;
                        const pageEnd = currentPage * totalDisplayed;

                        const handleDismiss = (notification: AstalNotifd.Notification): void => {
                            dismissNotificationWithAnimation(notification, clearAnimationDuration.get());
                        };

                        return (
                            <box
                                className={'notification-card-content-container'}
                                valign={Gtk.Align.START}
                                vexpand={false}
                                vertical
                            >
                                {filteredNotifications
                                    .slice(pageStart, pageEnd)
                                    .map((notification: AstalNotifd.Notification) => {
                                        return (
                                            <NotificationCard
                                                className={'notification-card menu'}
                                                css={bind(clearAnimationDuration).as(
                                                    (duration) => `animation-duration: ${duration}ms;`,
                                                )}
                                                notification={notification}
                                                showActions={hoverActions}
                                                onDismiss={handleDismiss}
                                                setup={(self: NotificationCardWidget) => {
                                                    const updateClass = (
                                                        dismissing: Set<AstalNotifd.Notification>,
                                                    ): void => {
                                                        self.toggleClassName(
                                                            'removing',
                                                            dismissing.has(notification),
                                                        );
                                                    };

                                                    updateClass(dismissingNotifications.get());

                                                    const unsubscribe =
                                                        dismissingNotifications.subscribe(updateClass);

                                                    self.connect('destroy', unsubscribe);
                                                }}
                                            />
                                        );
                                    })}
                            </box>
                        );
                    },
                )()}
            </box>
        </scrollable>
    );
};

interface NotificationsContainerProps {
    curPage: Variable<number>;
}
