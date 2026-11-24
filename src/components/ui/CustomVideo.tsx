import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Video, { AudioOutput, VideoRef } from 'react-native-video';
import { restoreCallAudio } from '../../callAudio';

export interface CustomVideoProps {
  videoUrl: string;
  onVideoEnd: () => void;
  /**
   * While a voice call is active, "earpiece" keeps the Android audio mode in
   * MODE_IN_COMMUNICATION instead of letting the player force MODE_NORMAL +
   * speakerphone (which moves call audio to the phone speaker).
   */
  audioOutput?: AudioOutput;
}

export interface CustomVideoRef {
  stopVideo: () => void;
}

export const CustomVideo = forwardRef<CustomVideoRef, CustomVideoProps>(
  (props, ref) => {
    const videoRef = useRef<VideoRef | null>(null);

    // Also covers the hardware back button and any unmount path.
    useEffect(
      () => () => {
        void restoreCallAudio();
      },
      [],
    );

    const finish = () => {
      void restoreCallAudio();
      props.onVideoEnd();
    };

    useImperativeHandle(ref, () => ({
      stopVideo: () => {
        videoRef.current?.setFullScreen(false);
        finish();
      },
    }));

    return (
      <Video
        ref={videoRef}
        source={{ uri: props.videoUrl! }}
        controls
        fullscreen
        // Never steal audio focus from the voice call.
        disableFocus
        audioOutput={props.audioOutput}
        onFullscreenPlayerDidDismiss={() => {
          videoRef.current?.setFullScreen(false);
          finish();
        }}
        playInBackground={false}
        style={styles.container}
      />
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    position: 'absolute',
    zIndex: 1,
    width: '100%',
    height: '100%',
  },
});
