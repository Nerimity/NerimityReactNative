import {
  Button,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useCall, VoiceUser } from '../CallProvider';
import { useWebView } from '../WebViewProvider';
import { dmChannelMatch, serverChannelMatch } from '../UrlPatternMatchers';
import { useUserStore } from '../UserStoreProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getUserId } from '../EncryptedStore';
import {
  lockLandscape,
  lockPortrait,
  unlockOrientation,
} from '../orientation';

export const CallUI = () => {
  const call = useCall();
  const webview = useWebView();
  const { users } = useUserStore();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedStreamIndex, setSelectedStreamIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenControlsVisible, setFullscreenControlsVisible] =
    useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFullscreenControls = useCallback(() => {
    setFullscreenControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      setFullscreenControlsVisible(false);
    }, 4000);
  }, []);

  useEffect(() => {
    if (!fullscreen) {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      setFullscreenControlsVisible(true);
      return;
    }
    showFullscreenControls();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [fullscreen, showFullscreenControls]);

  const toggleRotation = useCallback(() => {
    if (isLandscape) {
      lockPortrait();
      setIsLandscape(false);
    } else {
      lockLandscape();
      setIsLandscape(true);
    }
  }, [isLandscape]);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    setIsLandscape(false);
    // Portrait is the app default; never leave the Activity rotated.
    lockPortrait();
  }, []);

  useEffect(
    () => () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      unlockOrientation();
    },
    [],
  );

  const storeCurrentUserId = async () => {
    setCurrentUserId(await getUserId());
  };

  useEffect(() => {
    storeCurrentUserId();
  }, []);

  const currentChannelId = () => {
    const channel =
      dmChannelMatch(webview.currentUrl) ||
      serverChannelMatch(webview.currentUrl);
    return channel?.channelId;
  };

  const channelVoiceUsers = () => {
    if (!currentChannelId()) return [];
    return call.voiceUsers.filter(
      user => user.channelId === currentChannelId(),
    );
  };

  // const handleCall = async () => {
  //   call.joinCall(currentChannelId() || '');
  // };
  const handleEndCall = async () => {
    call.endCall();
  };

  const streams = channelVoiceUsers().flatMap(voice =>
    (voice.videoStreams || []).map(info => ({ voice, info })),
  );
  const selectedIndex = streams.length
    ? Math.min(selectedStreamIndex, streams.length - 1)
    : 0;
  const selectedStream = streams[selectedIndex];

  // Covers the call ending (or the stream disappearing) while fullscreen.
  useEffect(() => {
    if ((!fullscreen || !selectedStream) && isLandscape) {
      lockPortrait();
      setIsLandscape(false);
    }
  }, [fullscreen, selectedStream, isLandscape]);

  const switchStream = (direction: number) => {
    if (streams.length < 2) return;
    setSelectedStreamIndex(
      (selectedIndex + direction + streams.length) % streams.length,
    );
  };

  return call.joinedChannelId ? (
    <View style={style.container}>
      {selectedStream && (
        <View style={style.videoContainer}>
          <RTCView
            streamURL={selectedStream.info.url}
            style={style.video}
            objectFit="cover"
          />
          <View style={style.videoTopBar}>
            <Text style={style.videoLabel} numberOfLines={1}>
              {users[selectedStream.voice.userId]?.username ||
                selectedStream.voice.userId}
            </Text>
          </View>
          <View style={style.videoActions}>
            <Button
              title={selectedStream.info.muted ? 'Sound: Off' : 'Sound: On'}
              color={selectedStream.info.muted ? '#f23f43' : '#23a55a'}
              onPress={() =>
                call.toggleStreamAudio(selectedStream.info.url)
              }
            />
            <Button title="Fullscreen" onPress={() => setFullscreen(true)} />
          </View>
          {streams.length > 1 && (
            <View style={style.videoSwitcher}>
              <Button title="‹" onPress={() => switchStream(-1)} />
              <Text style={style.videoCounter}>
                {selectedIndex + 1}/{streams.length}
              </Text>
              <Button title="›" onPress={() => switchStream(1)} />
            </View>
          )}
          {streams.length > 1 && (
            <View style={style.videoChips}>
              {streams.map((item, index) => (
                <View key={item.info.url} style={style.videoChip}>
                  <Button
                    title={
                      users[item.voice.userId]?.username || item.voice.userId
                    }
                    color={index === selectedIndex ? '#5865f2' : '#8e9196'}
                    onPress={() => setSelectedStreamIndex(index)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {call.screenStreamUrl && (
        <View style={style.videoContainer}>
          <RTCView
            streamURL={call.screenStreamUrl}
            style={style.video}
            objectFit="contain"
          />
          <View style={style.videoTopBar}>
            <Text style={style.videoLabel} numberOfLines={1}>
              Your screen (sharing)
            </Text>
          </View>
        </View>
      )}

      <View style={style.voiceItems}>
        {channelVoiceUsers().map(voice => (
          <VoiceItem
            currentUserId={currentUserId}
            key={voice.userId}
            voice={voice}
          />
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={style.controls}
      >
        <ControlButton
          title={call.isMicMuted ? 'Mic: Off' : 'Mic: On'}
          color={call.isMicMuted ? '#f23f43' : '#23a55a'}
          onPress={call.toggleMic}
        />
        <ControlButton
          title={`Output: ${audioRouteLabel(call.audioDevice)}`}
          color="#4e5058"
          onPress={() => void call.cycleAudioRoute()}
        />
        <ControlButton
          title={call.isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          color={call.isScreenSharing ? '#f23f43' : '#5865f2'}
          onPress={() => {
            if (call.isScreenSharing) call.stopScreenShare();
            else void call.shareScreen();
          }}
        />
        <ControlButton
          title="End Call"
          color="#d83c42"
          onPress={handleEndCall}
        />
      </ScrollView>

      <Modal
        visible={fullscreen && !!selectedStream}
        animationType="fade"
        transparent={false}
        onRequestClose={closeFullscreen}
      >
        {selectedStream && (
          <View style={style.fullscreenContainer}>
            <TouchableWithoutFeedback onPress={showFullscreenControls}>
              <RTCView
                streamURL={selectedStream.info.url}
                style={style.fullscreenVideo}
                objectFit="contain"
              />
            </TouchableWithoutFeedback>
            <View
              style={[
                style.fullscreenOverlay,
                !fullscreenControlsVisible && style.fullscreenOverlayHidden,
              ]}
              pointerEvents={fullscreenControlsVisible ? 'box-none' : 'none'}
            >
              <View style={style.fullscreenTopBar}>
                <TouchableOpacity
                  style={style.fullscreenRotateButton}
                  onPress={toggleRotation}
                  activeOpacity={0.7}
                >
                  <Text style={style.fullscreenButtonText}>
                    {isLandscape ? '↻ Portrait' : '↻ Landscape'}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[style.videoLabel, style.fullscreenTitle]}
                  numberOfLines={1}
                >
                  {users[selectedStream.voice.userId]?.username ||
                    selectedStream.voice.userId}
                </Text>
                <TouchableOpacity
                  style={style.fullscreenCloseButton}
                  onPress={closeFullscreen}
                  activeOpacity={0.7}
                >
                  <Text style={style.fullscreenCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
              <View style={style.fullscreenControls}>
                <FullscreenButton
                  title={
                    selectedStream.info.muted ? 'Sound: Off' : 'Sound: On'
                  }
                  color={selectedStream.info.muted ? '#f23f43' : '#23a55a'}
                  onPress={() =>
                    call.toggleStreamAudio(selectedStream.info.url)
                  }
                />
                {streams.length > 1 && (
                  <>
                    <FullscreenButton
                      title="‹"
                      color="#4e5058"
                      onPress={() => switchStream(-1)}
                    />
                    <FullscreenButton
                      title="›"
                      color="#4e5058"
                      onPress={() => switchStream(1)}
                    />
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  ) : null;
};

const audioRouteLabel = (route: string) => {
  switch (route) {
    case 'BLUETOOTH':
      return 'Bluetooth';
    case 'WIRED_HEADSET':
      return 'Wired Headset';
    case 'SPEAKER_PHONE':
      return 'Speaker';
    case 'EARPIECE':
      return 'Earpiece';
    default:
      return 'Auto';
  }
};

const ControlButton = (props: {
  title: string;
  onPress: () => void;
  color?: string;
}) => (
  <TouchableOpacity
    style={[style.controlButton, { backgroundColor: props.color || '#5865f2' }]}
    onPress={props.onPress}
    activeOpacity={0.7}
  >
    <Text style={style.controlButtonText} numberOfLines={1}>
      {props.title}
    </Text>
  </TouchableOpacity>
);

// Buttons at the bottom of the fullscreen player. Each one keeps its own
// small translucent pill instead of a full-width black bar that used to
// cover the Close button in the top bar.
const FullscreenButton = (props: {
  title: string;
  onPress: () => void;
  color?: string;
}) => (
  <TouchableOpacity
    style={[style.fullscreenButton, { backgroundColor: props.color || '#5865f2' }]}
    onPress={props.onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Text style={style.fullscreenButtonText} numberOfLines={1}>
      {props.title}
    </Text>
  </TouchableOpacity>
);

const VoiceItem = (props: {
  voice: VoiceUser;
  currentUserId: string | null;
}) => {
  const call = useCall();

  const { users } = useUserStore();

  const voice = props.voice;

  const shouldDim = (() => {
    if (voice.userId === props.currentUserId) return false;
    if (call.joinedChannelId !== props.voice.channelId) return false;
    return !props.voice.connected;
  })();

  return (
    <View style={[style.voiceItem, shouldDim ? style.voiceDisconnected : {}]}>
      <Avatar user={users[voice.userId]} size={60} />
      <Text style={{ color: 'white' }}>{users[voice.userId]?.username}</Text>
    </View>
  );
};

const Avatar = (props: {
  user: { avatar?: string; hexColor: string };
  size: number;
}) => {
  const url = (() => {
    if (!props.user.avatar) return null;
    return `https://cdn.nerimity.com/${props.user.avatar}?type=webp`;
  })();

  return (
    <View
      style={[style.avatarContainer, { width: props.size, height: props.size }]}
    >
      <View
        style={[style.avatarInner, { width: props.size, height: props.size }]}
      >
        {url ? (
          <Image
            style={[
              style.avatarImage,
              { width: props.size, height: props.size },
            ]}
            source={{ uri: url }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              style.avatarColor,
              { backgroundColor: props.user.hexColor },
            ]}
          />
        )}
      </View>
    </View>
  );
};

const style = StyleSheet.create({
  container: {},
  videoContainer: {
    marginHorizontal: 10,
    marginTop: 10,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
  },
  videoTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoLabel: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  videoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 2,
  },
  fullscreenTitle: {
    flex: 1,
    marginHorizontal: 10,
    textAlign: 'center',
  },
  fullscreenControls: {
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  fullscreenButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  fullscreenRotateButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  videoSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  videoCounter: {
    color: 'white',
    fontSize: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  videoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  videoChip: {
    maxWidth: 120,
  },
  avatarContainer: {
    flexShrink: 0,
  },
  avatarInner: {
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImage: {},
  avatarColor: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    flexShrink: 0,
  },
  voiceItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    padding: 10,
  },
  voiceItem: {
    alignItems: 'center',
    marginBottom: 10,
  },
  voiceDisconnected: {
    opacity: 0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 10,
  },
  controlButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // The top bar is absolutely positioned; the controls are the only item
    // in flow, so keep them at the bottom instead of on top of Close.
    justifyContent: 'flex-end',
  },
  fullscreenOverlayHidden: {
    opacity: 0,
  },
  fullscreenCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  fullscreenCloseText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
