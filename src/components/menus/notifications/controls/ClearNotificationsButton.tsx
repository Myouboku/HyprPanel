import { bind } from 'astal';
import type { Astal, Gtk } from 'astal/gtk3';
import AstalNotifd from 'gi://AstalNotifd?version=0.1';
import options from 'src/configuration';
import { isPrimaryClick } from 'src/lib/events/mouse';
import { clearNotifications, removingNotifications } from 'src/lib/shared/notifications';

const notifdService = AstalNotifd.get_default();

const { clearAnimationDuration } = options.notifications;

export const ClearNotificationsButton = (): JSX.Element => {
    return (
        <button
            className={'clear-notifications-button'}
            tooltipText={'Clear Notifications'}
            onClick={(_: Gtk.Widget, event: Astal.ClickEvent) => {
                if (!isPrimaryClick(event)) {
                    return;
                }

                if (removingNotifications.get() === true) {
                    return;
                }

                clearNotifications(notifdService.get_notifications(), clearAnimationDuration.get());
            }}
        >
            <label
                className={bind(removingNotifications).as((removing) => {
                    return removing === true
                        ? 'clear-notifications-label txt-icon removing'
                        : 'clear-notifications-label txt-icon';
                })}
                label={''}
            />
        </button>
    );
};
