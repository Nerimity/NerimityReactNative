import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MessageType, RawMessage} from '../store/RawData';
import Avatar from './ui/Avatar';
import {formatTimestamp} from '../utils/date';
import {useStore} from '../store/store';

export default function MessageItem(props: {item: RawMessage; index: number}) {
  const {messages} = useStore();
  const channelMessages = messages.cache[props.item.channelId];

  const beforeMessage = channelMessages[props.index + 1];

  const currentTime = props.item.createdAt;
  const beforeMessageTime = beforeMessage?.createdAt!;

  const isSameCreator =
    beforeMessage && beforeMessage?.createdBy?.id === props.item?.createdBy?.id;
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
}

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

const Content = (props: {message: RawMessage}) => {
  return (
    <View>
      <Text>{props.message.content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageItemContainer: {
    paddingLeft: 5,
    paddingRight: 5,
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
});
