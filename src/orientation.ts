import { NativeModules, Platform } from 'react-native';

const NativeOrientation = NativeModules.NerimityOrientation;

/** Rotate the Activity to landscape while the fullscreen video is open. */
export const lockLandscape = () => {
  if (Platform.OS === 'android') NativeOrientation?.lockLandscape?.();
};

/** Force portrait (the app default). */
export const lockPortrait = () => {
  if (Platform.OS === 'android') NativeOrientation?.lockPortrait?.();
};

/** Give orientation control back to the system. */
export const unlockOrientation = () => {
  if (Platform.OS === 'android') NativeOrientation?.unlock?.();
};
