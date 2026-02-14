import { bind, Variable } from 'astal';
import { Gtk } from 'astal/gtk3';
import AstalBluetooth from 'gi://AstalBluetooth?version=0.1';
import { getBatteryIcon } from 'src/components/bar/modules/battery/helpers';
import Separator from 'src/components/shared/Separator';

export const DeviceStatus = ({ device }: DeviceStatusProps): JSX.Element => {
    const revealerBinding = Variable.derive(
        [bind(device, 'connected'), bind(device, 'paired')],
        (connected, paired) => {
            return connected || paired;
        },
    );

    const statusLabelBinding = Variable.derive(
        [bind(device, 'connected'), bind(device, 'paired')],
        (connected, paired) => {
            if (connected) {
                return 'Connected';
            }

            if (paired) {
                return 'Paired';
            }

            return '';
        },
    );

    const batteryPercentageBinding = Variable.derive(
        [bind(device, 'batteryPercentage')],
        (batteryPercentage) => {
            if (!Number.isFinite(batteryPercentage) || batteryPercentage <= 0) {
                return 0;
            }

            const normalizedPercentage = batteryPercentage <= 1 ? batteryPercentage * 100 : batteryPercentage;
            return Math.min(100, Math.max(0, Math.round(normalizedPercentage)));
        },
    );

    const batteryLabelBinding = Variable.derive([bind(batteryPercentageBinding)], (batteryPercentage) => {
        if (batteryPercentage <= 0) {
            return '';
        }

        return `${batteryPercentage}%`;
    });

    const batteryIconBinding = Variable.derive([bind(batteryPercentageBinding)], (batteryPercentage) => {
        if (batteryPercentage <= 0) {
            return '';
        }

        return getBatteryIcon(batteryPercentage, false, batteryPercentage >= 100);
    });

    const batteryRevealBinding = Variable.derive(
        [bind(device, 'connected'), bind(batteryPercentageBinding)],
        (connected, batteryPercentage) => {
            return connected && batteryPercentage > 0;
        },
    );

    return (
        <revealer
            halign={Gtk.Align.START}
            revealChild={revealerBinding()}
            onDestroy={() => {
                revealerBinding.drop();
                statusLabelBinding.drop();
                batteryPercentageBinding.drop();
                batteryLabelBinding.drop();
                batteryIconBinding.drop();
                batteryRevealBinding.drop();
            }}
        >
            <box>
                <label
                    halign={Gtk.Align.START}
                    className={'connection-status dim'}
                    label={bind(statusLabelBinding)}
                />
                <revealer revealChild={batteryRevealBinding()}>
                    <box>
                        <Separator className="menu-separator bluetooth-battery" />
                        <label
                            halign={Gtk.Align.START}
                            className={'connection-status dim battery'}
                            label={bind(batteryLabelBinding)}
                        />
                        <label
                            halign={Gtk.Align.START}
                            className={'connection-status dim battery txt-icon'}
                            label={bind(batteryIconBinding)}
                        />
                    </box>
                </revealer>
            </box>
        </revealer>
    );
};

interface DeviceStatusProps {
    device: AstalBluetooth.Device;
}
