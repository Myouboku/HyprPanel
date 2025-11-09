import { Gtk } from 'astal/gtk3';
import FileChooserButton from 'src/components/shared/FileChooserButton';
import { Opt } from 'src/lib/options';

const handleFileSet =
    <T,>(opt: Opt<T>) =>
    (self: Gtk.FileChooserButton): void => {
        const uri = self.get_uri();

        if (uri === null) {
            return;
        }

        try {
            const decodedPath = decodeURIComponent(uri.replace('file://', ''));
            opt.set(decodedPath as unknown as T);
        } catch (error) {
            console.error('Failed to decode URI:', error);
        }
    };

/**
 * AudioFileInputter component that provides a file chooser for audio files
 *
 * @param opt - The option to bind the selected file path to
 */
export const AudioFileInputter = <T extends string | number | boolean | object>({
    opt,
}: AudioFileInputterProps<T>): JSX.Element => {
    return (
        <FileChooserButton
            title="Select Audio File"
            on_file_set={(self) => {
                return handleFileSet(opt)(self);
            }}
            setup={(self) => {
                const currentValue = opt.get();
                if (typeof currentValue === 'string' && currentValue.length > 0) {
                    self.set_filename(currentValue);
                }

                self.hook(opt, () => {
                    const newValue = opt.get();
                    if (typeof newValue === 'string' && newValue.length > 0) {
                        self.set_filename(newValue);
                    } else {
                        self.unselect_all();
                    }
                });
            }}
        />
    );
};

interface AudioFileInputterProps<T> {
    opt: Opt<T>;
}
