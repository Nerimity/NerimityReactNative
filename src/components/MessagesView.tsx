import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, {
  Fragment,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  View,
  StyleSheet,
  TextInput,
  StatusBar,
  AppState,
  Text,
} from 'react-native';
import {RootStackParamList} from '../../App';
import {useStore} from '../store/store';
import {observer} from 'mobx-react-lite';
import MessageItem from './MessageItem';

import CustomButton from './ui/CustomButton';
import Header from './ui/Header';
import Colors from './ui/Colors';
import {FlashList} from '@shopify/flash-list';
import {ChannelDetailsScreenNavigationProp} from './ChannelDetailsView';
import {RawMessage} from '../store/RawData';
import {ServerEvents} from '../store/EventNames';
import {postChannelTyping} from '../services/MessageService';
import Icon from 'react-native-vector-icons/MaterialIcons';
export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Message'>;
export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

const useChannelMessages = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {messages, channels} = useStore();
  const channel = channels.get(route.params.channelId);
  const channelMessages = messages.channelMessages(route.params.channelId);

  useEffect(() => {
    const onFocus = () => {
      channel?.dismissNotification();
    };

    const event = AppState.addEventListener('focus', onFocus);

    return () => event.remove();
  }, [channel]);

  useEffect(() => {
    messages.fetchAndCacheMessages(route.params.channelId);
  }, [messages, route.params.channelId]);
  return channelMessages;
};

export default function MessagesView() {
  return (
    <View style={styles.pageContainer}>
      <StatusBar backgroundColor={Colors.paneColor} />
      <PageHeader />
      <MessageList />
      <InputArea />
    </View>
  );
}

const MessageList = observer(() => {
  const {channels} = useStore();
  const messages = useChannelMessages();
  const route = useRoute<MainScreenRouteProp>();
  const channel = channels.get(route.params.channelId);

  const channelMessages = messages?.slice();

  const [unreadMarker, setUnreadMarker] = useState<{
    lastSeenAt: number | null;
    messageId: string | null;
  }>({lastSeenAt: null, messageId: null});

  const updateUnreadMarker = useCallback(
    (ignoreFocus = false) => {
      if (!ignoreFocus && AppState.currentState === 'active') {
        return;
      }

      const lastSeenAt = channel?.lastSeen || -1;
      const message = [...(channelMessages || [])]
        .reverse()
        .find(m => m.createdAt - lastSeenAt >= 0);
      setUnreadMarker({
        lastSeenAt,
        messageId: message?.id || null,
      });
    },
    [channel?.lastSeen, channelMessages],
  );

  const prevMessageLength = useRef<undefined | number>(undefined);

  useEffect(() => {
    if (channelMessages?.length) {
      updateUnreadMarker(prevMessageLength.current === undefined);
      prevMessageLength.current = channelMessages.length;
    }
    channelMessages && channel?.dismissNotification();
  }, [channelMessages?.length]);

  // useEffect(() => {
  // }, [channel, messages?.length]);

  return (
    <FlashList
      data={channelMessages || []}
      estimatedItemSize={53}
      contentContainerStyle={styles.flashListContentContainer}
      inverted
      showsVerticalScrollIndicator={false}
      keyExtractor={item => item.id}
      renderItem={props => {
        return (
          <>
            {props.item.id === unreadMarker.messageId && <UnreadMarker />}
            <MessageItem
              item={props.item}
              index={props.index}
              serverId={route.params.serverId}
            />
          </>
        );
      }}
    />
  );
});

const UnreadMarker = () => {
  return (
    <View style={styles.unreadMarkerContainer}>
      <View style={styles.unreadMarkerLine} />
      <View style={styles.unreadMarker}>
        <Icon name="mark-chat-unread" color="white" />
        <Text style={styles.unreadMarkerText}>New Messages</Text>
      </View>
      <View style={styles.unreadMarkerLine} />
    </View>
  );
};

const InputArea = () => {
  return (
    <View>
      <TypingIndicator />
      <CustomInput />
    </View>
  );
};

interface TypingPayload {
  userId: string;
  channelId: string;
}

const TypingIndicator = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {socket, users} = useStore();
  const [typingUserIds, setTypingUserIds] = useState<
    Record<string, number | undefined>
  >({});

  const onTyping = useCallback(
    (event: TypingPayload) => {
      if (event.channelId !== route.params.channelId) {
        return;
      }
      if (typingUserIds[event.userId]) {
        clearTimeout(typingUserIds[event.userId]!);
      }
      const timeoutId = setTimeout(
        () =>
          setTypingUserIds(current => {
            const copy = {...current};
            delete copy[event.userId];
            return copy;
          }),
        5000,
      );
      setTypingUserIds({...typingUserIds, [event.userId]: timeoutId});
    },
    [route.params.channelId, typingUserIds],
  );

  const onMessageCreated = useCallback(
    (event: {message: RawMessage}) => {
      if (event.message.channelId !== route.params.channelId) {
        return;
      }
      const timeoutId = typingUserIds[event.message.createdBy.id];
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTypingUserIds(current => {
          const copy = {...current};
          delete copy[event.message.createdBy.id];
          return copy;
        });
      }
    },
    [route.params.channelId, typingUserIds],
  );
  const onMessageUpdated = useCallback(
    (evt: any) => onMessageCreated({message: evt.updated}),
    [onMessageCreated],
  );

  useEffect(() => {
    socket.io.on(ServerEvents.CHANNEL_TYPING, onTyping);
    socket.io.on(ServerEvents.MESSAGE_CREATED, onMessageCreated);
    socket.io.on(ServerEvents.MESSAGE_UPDATED, onMessageUpdated);

    return () => {
      socket.io.off(ServerEvents.CHANNEL_TYPING, onTyping);
      socket.io.off(ServerEvents.MESSAGE_CREATED, onMessageCreated);
      socket.io.off(ServerEvents.MESSAGE_UPDATED, onMessageUpdated);
    };
  }, [onMessageCreated, onMessageUpdated, onTyping, socket.io]);

  const typingUsers = useMemo(
    () => Object.keys(typingUserIds).map(userId => users.get(userId)),
    [typingUserIds, users],
  );

  if (!typingUsers.length) {
    return null;
  }

  return (
    <Floating>
      <Text style={styles.typingIndicatorText} numberOfLines={1}>
        {typingUsers.length === 1 && (
          <Text>
            <B>{typingUsers[0]?.username}</B> is typing...
          </Text>
        )}
        {typingUsers.length === 2 && (
          <Text>
            <B>{typingUsers[0]?.username}</B> and{' '}
            <B>{typingUsers[0]?.username}</B> are typing...
          </Text>
        )}
        {typingUsers.length === 3 && (
          <Text>
            <B>{typingUsers[0]?.username}</B>, <B>{typingUsers[1]?.username}</B>{' '}
            and <B>{typingUsers[2]?.username}</B> are typing...
          </Text>
        )}
        {typingUsers.length > 3 && (
          <Text>
            <B>{typingUsers[0]?.username}</B>, <B>{typingUsers[1]?.username}</B>{' '}
            and <B>{typingUsers[2]?.username}</B> and{' '}
            <B>{(typingUsers.length - 3).toString()}</B> others are typing...
          </Text>
        )}
      </Text>
    </Floating>
  );
};

const B = (props: {children?: string}) => (
  <Text style={styles.b} children={props.children} />
);

const Floating = (props: {
  children: React.JSX.Element | React.JSX.Element[];
}) => {
  return <View style={styles.floating} children={props.children} />;
};

const CustomInput = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {messages} = useStore();
  const [message, setMessage] = useState('');
  const [typingTimeoutId, setTypingTimeoutId] = useState<null | number>(null);
  const onSend = useCallback(() => {
    const formattedMessage = message.trim();
    setMessage('');
    if (!formattedMessage.length) {
      return;
    }
    startTransition(() => {
      messages.postMessage(route.params.channelId, formattedMessage);
    });
    typingTimeoutId && clearTimeout(typingTimeoutId);
    setTypingTimeoutId(null);
  }, [message, messages, route.params.channelId, typingTimeoutId]);

  const onInput = (text: string) => {
    setMessage(text);
    if (typingTimeoutId) {
      return;
    }
    postChannelTyping(route.params.channelId);
    setTypingTimeoutId(setTimeout(() => setTypingTimeoutId(null), 4000));
  };

  return (
    <View style={styles.customInputContainer}>
      <TextInput
        style={styles.customInput}
        placeholder="Message..."
        multiline
        onChangeText={onInput}
        defaultValue={message}
      />
      <CustomButton icon="send" onPress={onSend} styles={styles.sendButton} />
    </View>
  );
};

const PageHeader = () => {
  const route = useRoute<MainScreenRouteProp>();
  const nav = useNavigation<ChannelDetailsScreenNavigationProp>();
  const {channels} = useStore();

  const channel = channels.cache[route.params.channelId];
  const name = channel?.name || channel.recipient?.username;
  return (
    <Header
      title={name || '...'}
      channelId={channel.id}
      serverId={channel.serverId}
      userId={channel.recipient?.id}
      onPress={() =>
        nav.navigate('ChannelDetails', {
          channelId: channel.id,
          serverId: channel.serverId,
        })
      }
    />
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.paneColor,
    flexDirection: 'column',
    height: '100%',
  },
  flashListContentContainer: {
    paddingTop: 20,
  },
  customInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    margin: 5,
    marginTop: 0,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderBottomColor: Colors.primaryColor,
    borderBottomWidth: 2,
    paddingLeft: 10,
    alignItems: 'flex-end',
  },
  customInput: {
    flex: 1,
  },
  sendButton: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  b: {fontWeight: 'bold'},
  floating: {
    position: 'absolute',
    zIndex: 1111,
    backgroundColor: Colors.paneColor,
    padding: 3,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 12,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderStyle: 'solid',
    top: -10,
    left: 10,
  },
  typingIndicatorText: {
    fontSize: 10,
  },
  unreadMarkerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 5,
    backgroundColor: Colors.alertColor,
    borderRadius: 6,
  },
  unreadMarkerText: {
    fontSize: 12,
  },
  unreadMarkerLine: {
    height: 1,
    backgroundColor: Colors.alertColor,
    flex: 1,
  },
});
