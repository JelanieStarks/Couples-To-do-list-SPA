/**
 * settings
 * Central helpers for reading and broadcasting UI settings tweaks across components.
 */
export const SETTINGS_EVENT_NAME = 'jarvis-settings-updated';

export const emitSettingsEvent = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SETTINGS_EVENT_NAME));
};
