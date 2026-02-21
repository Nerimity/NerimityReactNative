import React, {forwardRef, useImperativeHandle, useRef} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Video, {VideoRef} from 'react-native-video';
import {Button} from './Button';

import {msKeyboardArrowLeft} from '@material-symbols-react-native/rounded-300';
import {SvgXml} from 'react-native-svg';
import Colors from '../Colors';

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
    const [showOverlay, setShowOverlay] = React.useState(true);
    const hideOverlayTimeout = useRef<NodeJS.Timeout | null>(null);

    const stopVideo = () => {
      videoRef.current?.setFullScreen(false);
      props.onVideoEnd();
    };

    useImperativeHandle(ref, () => ({
      stopVideo,
    }));

    const handleTouchEnd = () => {
      setShowOverlay(true);
      if (hideOverlayTimeout.current) {
        clearTimeout(hideOverlayTimeout.current);
      }
      hideOverlayTimeout.current = setTimeout(() => {
        setShowOverlay(false);
      }, 5000);
    };
    return (
      <View
        style={styles.container}
        onTouchEnd={handleTouchEnd}
        pointerEvents="box-none">
        {showOverlay && <Overlay onClose={stopVideo} />}
        <Video
          ref={videoRef}
          source={{uri: props.videoUrl!}}
          fullscreen
          controls
          playInBackground={false}
          onProgress={console.log}
          onLoad={e => console.log(e)}
          style={styles.video}
        />
      </View>
    );
  },
);

const Overlay = (props: {onClose: () => void}) => {
  return (
    <View style={styles.overlay}>
      <OverlayHeader onClose={props.onClose} />
    </View>
  );
};

const OverlayHeader = (props: {onClose: () => void}) => {
  return (
    <View style={styles.header}>
      <Button onPress={props.onClose} padding={6} style={styles.backButton}>
        <SvgXml
          xml={msKeyboardArrowLeft.xml}
          width={28}
          height={28}
          fill={Colors.primaryColor}
        />
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  video: {
    backgroundColor: 'black',
    position: 'absolute',
    zIndex: 1111,
    width: '100%',
    height: '100%',
  },
  container: {
    backgroundColor: 'black',
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    zIndex: 1112,
    width: '100%',
    height: '100%',
  },
  header: {
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    marginLeft: 10,
  },
});
