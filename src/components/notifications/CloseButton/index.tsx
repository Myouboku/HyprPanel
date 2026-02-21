import { Gtk } from 'astal/gtk3';
import AstalNotifd from 'gi://AstalNotifd?version=0.1';

export const CloseButton = ({ notification, onDismiss }: CloseButtonProps): JSX.Element => {
    const handleDismiss = (): void => {
        if (onDismiss) {
            onDismiss();
            return;
        }

        notification.dismiss();
    };

    return (
        <button className={'close-notification-button'} onClick={handleDismiss}>
            <label className={'txt-icon notification-close'} label={'󰅜'} halign={Gtk.Align.CENTER}></label>
        </button>
    );
};

interface CloseButtonProps {
    notification: AstalNotifd.Notification;
    onDismiss?: () => void;
}
