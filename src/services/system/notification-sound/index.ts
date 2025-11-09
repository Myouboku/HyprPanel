import { execAsync } from 'astal';

/**
 * Service for playing notification sounds using libcanberra-gtk.
 * Uses canberra-gtk-play which is compatible with both PipeWire and PulseAudio.
 */
export class NotificationSoundService {
    private static instance: NotificationSoundService;

    private constructor() {}

    /**
     * Gets the singleton instance of NotificationSoundService
     *
     * @returns The NotificationSoundService instance
     */
    public static getInstance(): NotificationSoundService {
        if (!NotificationSoundService.instance) {
            NotificationSoundService.instance = new NotificationSoundService();
        }
        return NotificationSoundService.instance;
    }

    /**
     * Plays a notification sound using canberra-gtk-play
     *
     * @param soundId - The sound event ID (e.g., 'message-new-instant', 'bell')
     * Defaults to 'message-new-instant' if not specified
     */
    public playNotificationSound(soundId: string = 'message-new-instant'): void {
        execAsync(['canberra-gtk-play', '-i', soundId]).catch((error) => {
            console.warn(`Failed to play notification sound '${soundId}':`, error);
        });
    }
}
