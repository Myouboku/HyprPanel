import { execAsync } from 'astal';

/**
 * Service for playing notification sounds.
 * Uses canberra-gtk-play for system sound IDs and pw-play for custom audio files.
 * This ensures maximum compatibility: system sounds respect the theme, and custom files support all audio formats.
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
     * Plays a notification sound using the appropriate audio backend
     *
     * @param soundIdOrPath - The sound event ID (e.g., 'message-new-instant', 'bell')
     * or a file path to a custom audio file
     * Defaults to 'message-new-instant' if not specified
     *
     * Uses canberra-gtk-play for system sound IDs (respects theme)
     * Uses pw-play for custom file paths (supports all audio formats: MP3, FLAC, WAV, OGG, etc.)
     */
    public playNotificationSound(soundIdOrPath: string = 'message-new-instant'): void {
        const isFilePath = soundIdOrPath.includes('/') || soundIdOrPath.startsWith('~');

        if (isFilePath) {
            execAsync(['pw-play', soundIdOrPath]).catch((error) => {
                console.warn(`Failed to play notification sound from file '${soundIdOrPath}':`, error);
            });
        } else {
            execAsync(['canberra-gtk-play', '-i', soundIdOrPath]).catch((error) => {
                console.warn(`Failed to play notification sound '${soundIdOrPath}':`, error);
            });
        }
    }
}
