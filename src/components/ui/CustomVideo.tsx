import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Video, { VideoRef } from 'react-native-video';

export interface CustomVideoProps {
  videoUrl: string;
  onVideoEnd: () => void;
}

export interface CustomVideoRef {
  stopVideo: () => void;
}

export const CustomVideo = forwardRef<CustomVideoRef, CustomVideoProps>(
  (props, ref) => {
    const videoRef = useRef<VideoRef | null>(null);

    useImperativeHandle(ref, () => ({
      stopVideo: () => {
        videoRef.current?.setFullScreen(false);
        props.onVideoEnd();
      },
    }));

    return (
      <Video
        ref={videoRef}
        source={{ uri: props.videoUrl! }}
        controls
        fullscreen
        onFullscreenPlayerDidDismiss={() => {
          videoRef.current?.setFullScreen(false);
          props.onVideoEnd();
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
