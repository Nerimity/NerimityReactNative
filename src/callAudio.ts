import { Platform } from 'react-native';
import inCallManager from 'react-native-incall-manager';

/**
 * The native video player (react-native-video) changes the Android audio mode
 * to MODE_NORMAL and turns the speakerphone on when it mounts. That silently
 * breaks an ongoing InCallManager call: call audio stops following the wired
 * headset / Bluetooth SCO route and falls back to the phone speaker.
 *
 * CallProvider keeps the last known call route here so the video player can
 * ask for a call-compatible audio output and hand the route back afterwards.
 */
let callActive = false;
let callRoute = '';

export const setCallAudioState = (active: boolean, route: string) => {
  callActive = active;
  callRoute = route;
};

/**
 * react-native-video prop: "earpiece" keeps MODE_IN_COMMUNICATION (the mode
 * InCallManager uses), so a headset/Bluetooth route is no longer overridden.
 */
export const getVideoAudioOutput = (): 'speaker' | 'earpiece' | undefined => {
  if (!callActive || Platform.OS !== 'android') return undefined;
  return callRoute === 'SPEAKER_PHONE' ? 'speaker' : 'earpiece';
};

/** Re-apply the call route after a media player has changed the audio mode. */
export const restoreCallAudio = async () => {
  if (!callActive || Platform.OS !== 'android') return;

  const restoreAutomatic = () => {
    // undefined = automatic route; also re-enters MODE_IN_COMMUNICATION.
    try {
      inCallManager.setForceSpeakerphoneOn(undefined as any);
    } catch (error) {
      console.warn('Could not restore automatic call route:', error);
    }
  };

  try {
    if (callRoute) {
      await inCallManager.chooseAudioRoute(callRoute);
    } else {
      restoreAutomatic();
    }
  } catch (error) {
    console.warn('Could not restore call audio route:', error);
    restoreAutomatic();
  }
};
