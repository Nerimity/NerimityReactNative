import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, {startTransition, useCallback, useEffect, useState} from 'react';

import {View, StyleSheet, TextInput} from 'react-native';
import {RootStackParamList} from '../../App';
import {useStore} from '../store/store';
import {observer} from 'mobx-react-lite';
import MessageItem from './MessageItem';

import CustomButton from './ui/CustomButton';
import Header from './ui/Header';
import Colors from './ui/Colors';
import {FlashList} from '@shopify/flash-list';
import {ChannelDetailsScreenNavigationProp} from './ChannelDetailsView';

export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Message'>;
export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

const useChannelMessages = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {messages} = useStore();
  const channelMessages = messages.channelMessages(route.params.channelId);

  useEffect(() => {
    messages.fetchAndCacheMessages(route.params.channelId);
  }, [messages, route.params.channelId]);
  return channelMessages;
};

export default function MessagesView() {
  return (
    <View style={styles.pageContainer}>
      <PageHeader />
      <MessageList />
      <InputArea />
    </View>
  );
}

const MessageList = observer(() => {
  const messages = useChannelMessages();
  const route = useRoute<MainScreenRouteProp>();

  return (
    <FlashList
      data={(messages || []).slice()}
      estimatedItemSize={53}
      inverted
      showsVerticalScrollIndicator={false}
      keyExtractor={item => item.id}
      renderItem={props => {
        return (
          <MessageItem
            item={props.item}
            index={props.index}
            serverId={route.params.serverId}
          />
        );
      }}
    />
  );
});

const InputArea = () => {
  return (
    <View>
      <CustomInput />
    </View>
  );
};

const CustomInput = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {messages} = useStore();
  const [message, setMessage] = useState('');
  const onSend = useCallback(() => {
    startTransition(() => {
      const formattedMessage = message.trim();
      setMessage('');
      if (!formattedMessage.length) {
        return;
      }
      messages.postMessage(route.params.channelId, formattedMessage);
    });
  }, [message, messages, route.params.channelId]);

  return (
    <View style={styles.customInputContainer}>
      <TextInput
        style={styles.customInput}
        placeholder="Message..."
        multiline
        onChangeText={text => setMessage(text)}
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
  return (
    <Header
      title={channel?.name || '...'}
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
  customInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    margin: 5,
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
});
