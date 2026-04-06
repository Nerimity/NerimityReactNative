import { Button, Text, View } from 'react-native';
import { useCall } from '../CallProvider';
import { useWebView } from '../WebViewProvider';
import { dmChannelMatch, serverChannelMatch } from '../UrlPatternMatchers';
import { useUserStore } from '../UserStoreProvider';

export const CallUI = () => {
  const call = useCall();
  const webview = useWebView();
  const { users } = useUserStore();

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
    <View>
      {call.joinedChannelId !== currentChannelId() ? (
        <Button title="Call" onPress={handleCall} />
      ) : (
        <Button title="End Call" onPress={handleEndCall} />
      )}
      {channelVoiceUsers().map(voice => (
        <View key={voice.userId}>
          <Text style={{ color: 'white' }}>
            {users[voice.userId]?.username} -{' '}
            {voice.connected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      ))}
    </View>
  ) : null;
};
