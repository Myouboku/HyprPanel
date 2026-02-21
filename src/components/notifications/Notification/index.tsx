import AstalNotifd from 'gi://AstalNotifd?version=0.1';
import type { Binding } from 'astal';
import { Astal, Gtk, Widget } from 'astal/gtk3';
import { isSecondaryClick } from 'src/lib/events/mouse';
import { Actions } from '../Actions';
import { Body } from '../Body';
import { CloseButton } from '../CloseButton';
import { Header } from '../Header';
import { notifHasImg } from '../helpers';
import { Image } from '../Image';

const NotificationContent = ({ actionBox, notification }: NotificationContentProps): JSX.Element => {
    return (
        <box
            className={`notification-card-content ${!notifHasImg(notification) ? 'noimg' : ''}`}
            hexpand
            vertical
        >
            <Header notification={notification} />
            <Body notification={notification} />
            {actionBox}
        </box>
    );
};

export const NotificationCard = ({
    notification,
    showActions,
    onDismiss,
    ...props
}: NotificationCardProps): JSX.Element => {
    let actionBox: ActionBox | null;

    if (notification.get_actions().length) {
        actionBox = <Actions notification={notification} showActions={showActions} />;
    } else {
        actionBox = null;
    }

    const handleDismiss = (): void => {
        if (onDismiss) {
            onDismiss(notification);
            return;
        }

        notification.dismiss();
    };

    return (
        <eventbox
            onClick={(_: Gtk.Widget, event: Astal.ClickEvent) => {
                if (isSecondaryClick(event)) {
                    handleDismiss();
                }
            }}
            onHover={() => {
                if (actionBox !== null && showActions === true) {
                    actionBox.revealChild = true;
                }
            }}
            onHoverLost={() => {
                if (actionBox !== null && showActions === true) {
                    actionBox.revealChild = false;
                }
            }}
        >
            <box className={'notification-card'} {...props} hexpand valign={Gtk.Align.START}>
                <Image notification={notification} />
                <NotificationContent notification={notification} actionBox={actionBox} />
                <CloseButton notification={notification} onDismiss={handleDismiss} />
            </box>
        </eventbox>
    );
};

interface NotificationCardProps extends Widget.BoxProps {
    className?: string | Binding<string>;
    css?: string | Binding<string>;
    notification: AstalNotifd.Notification;
    showActions: boolean;
    onDismiss?: (notification: AstalNotifd.Notification) => void;
}

interface ActionBox extends Gtk.Widget {
    revealChild?: boolean;
}

interface NotificationContentProps {
    actionBox: ActionBox | null;
    notification: AstalNotifd.Notification;
}
