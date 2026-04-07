import { Button, Image, StyleSheet, Text, View } from 'react-native';
import { useCall, VoiceUser } from '../CallProvider';
import { useWebView } from '../WebViewProvider';
import { dmChannelMatch, serverChannelMatch } from '../UrlPatternMatchers';
import { useUserStore } from '../UserStoreProvider';
import { useEffect, useState } from 'react';
import { getUserId } from '../EncryptedStore';

export const CallUI = () => {
  const call = useCall();
  const webview = useWebView();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  const handleCall = async () => {
    call.joinCall(currentChannelId() || '');
  };
  const handleEndCall = async () => {
    call.endCall();
  };

  return currentChannelId() ? (
    <View style={style.container}>
      <View style={style.voiceItems}>
        {channelVoiceUsers().map(voice => (
          <VoiceItem
            currentUserId={currentUserId}
            key={voice.userId}
            voice={voice}
          />
        ))}
      </View>
      {call.joinedChannelId !== currentChannelId() ? (
        <Button title="Call" onPress={handleCall} />
      ) : (
        <Button title="End Call" onPress={handleEndCall} />
      )}
    </View>
  ) : null;
};

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
});
