import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MessageType, RawMessage} from '../store/RawData';
import Avatar from './ui/Avatar';
import {formatTimestamp} from '../utils/date';
import {useStore} from '../store/store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {observer} from 'mobx-react-lite';
import {Message, MessageSentStatus} from '../store/messages';
export default React.memo(
  function MessageItem(props: {item: RawMessage; index: number}) {
    const {messages} = useStore();
    const channelMessages = messages.cache[props.item.channelId];

    const beforeMessage = channelMessages[props.index + 1];

    const currentTime = props.item.createdAt;
    const beforeMessageTime = beforeMessage?.createdAt!;

    const isSameCreator =
      beforeMessage &&
      beforeMessage?.createdBy?.id === props.item?.createdBy?.id;
    const isDateUnderFiveMinutes =
      beforeMessageTime && currentTime - beforeMessageTime < 300000;
    const isBeforeMessageContent =
      beforeMessage && beforeMessage.type === MessageType.CONTENT;

    const isCompact =
      isSameCreator && isDateUnderFiveMinutes && isBeforeMessageContent;

    return (
      <View
        style={[
          styles.messageItemContainer,
          isCompact ? styles.compactMessageItemContainer : undefined,
        ]}>
        {!isCompact && <Avatar size={40} user={props.item.createdBy} />}
        <View style={styles.messageInnerContainer}>
          {!isCompact && <Details message={props.item} />}
          <Content message={props.item} />
        </View>
      </View>
    );
  },
  (p, n) => p.item === n.item,
);

const Details = (props: {message: RawMessage}) => {
  const createdBy = props.message.createdBy;
  const timestamp = formatTimestamp(props.message.createdAt);
  return (
    <View style={styles.detailsContainer}>
      <Text>{createdBy.username}</Text>
      <Text style={styles.timestamp}>{timestamp}</Text>
    </View>
  );
};

const Content = observer((props: {message: RawMessage}) => {
  return (
    <View>
      <Text>
        {props.message.content}
        <MessageStatus message={props.message} />
      </Text>
    </View>
  );
});
const MessageStatus = (props: {message: Message}) => {
  let status: string | null = null;
  if (props.message.sentStatus === MessageSentStatus.FAILED) {
    status = 'error-outline';
  } else if (props.message.sentStatus === MessageSentStatus.SENDING) {
    status = 'query-builder';
  } else if (props.message.editedAt) {
    status = 'edit';
  }
  if (status) {
    return (
      <View style={styles.messageStatus}>
        <Icon name={status} size={10} />
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  messageItemContainer: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 3,
    gap: 5,
    flexDirection: 'row',
  },
  compactMessageItemContainer: {
    marginLeft: 45,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 0,
  },
  messageInnerContainer: {flex: 1, flexWrap: 'wrap'},
  detailsContainer: {flexDirection: 'row', gap: 5, alignItems: 'center'},
  timestamp: {fontSize: 12, opacity: 0.6},
  messageStatus: {
    height: 10,
    width: 15,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginLeft: 10,
  },
});
