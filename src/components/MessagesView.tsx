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
  Image,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { RootStackParamList } from '../../App';
import { useStore } from '../store/store';
import { observer } from 'mobx-react-lite';
import MessageItem from './MessageItem';

import CustomButton from './ui/CustomButton';
import Header from './ui/Header';
import Colors from './ui/Colors';
import { FlashList } from '@shopify/flash-list';
import { ChannelDetailsScreenNavigationProp } from './ChannelDetailsView';
import { RawMessage } from '../store/RawData';
import { ServerEvents } from '../store/EventNames';
import { postChannelTyping } from '../services/MessageService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Message'>;
export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

const useChannelMessages = () => {
  const route = useRoute<MainScreenRouteProp>();
  const { messages, channels } = useStore();
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

export default observer(() => {
  const { socket } = useStore();

  return (
    <View style={styles.pageContainer}>
      <StatusBar backgroundColor={Colors.paneColor} />
      <PageHeader />
      {socket.isAuthenticated && (
        <>
          <MessageList />
          <InputArea />
        </>
      )}
    </View>
  );
});

const MessageList = observer(() => {
  const { channels, channelProperties } = useStore();
  const messages = useChannelMessages();
  const route = useRoute<MainScreenRouteProp>();
  const navigation = useNavigation();
  const channel = channels.get(route.params.channelId);

  const channelMessages = messages?.slice();

  const [unreadMarker, setUnreadMarker] = useState<{
    lastSeenAt: number | null;
    messageId: string | null;
  }>({ lastSeenAt: null, messageId: null });

  useEffect(() => {
    if (!channel) {
      navigation.goBack();
      return;
    }
    channelProperties.initChannelProperty(channel.id)
  }, [channel, navigation]);

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
      <FloatingAttachment />
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
  const { socket, users } = useStore();
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
            const copy = { ...current };
            delete copy[event.userId];
            return copy;
          }),
        5000,
      );
      setTypingUserIds({ ...typingUserIds, [event.userId]: timeoutId });
    },
    [route.params.channelId, typingUserIds],
  );

  const onMessageCreated = useCallback(
    (event: { message: RawMessage }) => {
      if (event.message.channelId !== route.params.channelId) {
        return;
      }
      const timeoutId = typingUserIds[event.message.createdBy.id];
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTypingUserIds(current => {
          const copy = { ...current };
          delete copy[event.message.createdBy.id];
          return copy;
        });
      }
    },
    [route.params.channelId, typingUserIds],
  );
  const onMessageUpdated = useCallback(
    (evt: any) => onMessageCreated({ message: evt.updated }),
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
            <B>{typingUsers[1]?.username}</B> are typing...
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

const FloatingAttachment = observer(() => {
  const route = useRoute<MainScreenRouteProp>();
  const { channelProperties } = useStore();
  const attachment = channelProperties.get(route.params.channelId)?.attachment;
  if (!attachment) return null;

  return (
    <Floating offsetTop={-50} style={{right: 10}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Icon name='attach-file' size={20} />
        <Image source={{uri: attachment.uri, width: 50, height: 50}} resizeMode='contain'  />
        <Text numberOfLines={1} style={{flex: 1}}>{attachment.name}</Text>
      </View>
    </Floating>
  );  
});

const B = (props: { children?: string }) => (
  <Text style={styles.b} children={props.children} />
);

const Floating = (props: {
  children: React.JSX.Element | React.JSX.Element[];
  offsetTop?: number;
  style?: any
}) => {
 
  return <View style={{...styles.floating, ...props.style, top: props.offsetTop || -10}} children={props.children} />;
};

const CustomInput = observer(() => {
  const route = useRoute<MainScreenRouteProp>();
  const { messages, channelProperties } = useStore();
  const [typingTimeoutId, setTypingTimeoutId] = useState<null | number>(null);

  const channelProperty = channelProperties.get(route.params.channelId);

  const onSend = useCallback(() => {
    const content = channelProperty.content || "";
    const formattedMessage = content.trim();
    channelProperty.setContent('');
    if (!formattedMessage.length && !channelProperty.attachment) {
      return;
    }
    startTransition(() => {
      messages.postMessage(route.params.channelId, formattedMessage, channelProperty.attachment);
    });
    channelProperty.setAttachment(undefined);
    typingTimeoutId && clearTimeout(typingTimeoutId);
    setTypingTimeoutId(null);
  }, [messages, route.params.channelId, typingTimeoutId]);

  const onInput = (text: string) => {
    channelProperty.setContent(text);
    if (typingTimeoutId) {
      return;
    }
    postChannelTyping(route.params.channelId);
    setTypingTimeoutId(setTimeout(() => setTypingTimeoutId(null), 4000));
  };

  const onAttach = async () => {
    const response = await launchImageLibrary({
      includeBase64: false,
      mediaType: 'photo',
      includeExtra: false,
      selectionLimit: 1,
      presentationStyle: 'popover'
    })
    if (response.didCancel) return;
    if (response.errorMessage) return;
    const asset = response.assets?.[0];
    if (!asset) return;
    channelProperty.setAttachment({
      name: asset.fileName!,
      uri: asset.uri!,
      type: asset.type!,
    })
  }

  const onAttachRemove = () => {
    channelProperty.setAttachment(undefined);
  }

  return (
    <View style={styles.customInputContainer}>
      {!channelProperty?.attachment && <CustomButton icon="attach-file" onPress={onAttach} styles={styles.inputButton} />}
      {channelProperty?.attachment && <CustomButton color={Colors.alertColor} icon="close" onPress={onAttachRemove} styles={styles.inputButton} />}
      <TextInput
        style={styles.customInput}
        placeholder="Message..."
        multiline
        onChangeText={onInput}
        defaultValue={channelProperty?.content || ""}
      />
      <CustomButton icon="send" onPress={onSend} styles={styles.inputButton} />
    </View>
  );
});

const PageHeader = observer(() => {
  const route = useRoute<MainScreenRouteProp>();
  const nav = useNavigation<ChannelDetailsScreenNavigationProp>();
  const { channels } = useStore();

  const channel = channels.cache[route.params.channelId];
  const name = channel?.name || channel?.recipient?.username;
  return (
    <Header
      title={name || '...'}
      channelId={channel?.id}
      serverId={channel?.serverId}
      userId={channel?.recipient?.id}
      onPress={() =>
        nav.navigate('ChannelDetails', {
          channelId: channel.id,
          serverId: channel.serverId,
        })
      }
    />
  );
});

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

    alignItems: 'flex-end',
    gap: 5
  },
  customInput: {
    flex: 1,
  },
  inputButton: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  b: { fontWeight: 'bold' },
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
