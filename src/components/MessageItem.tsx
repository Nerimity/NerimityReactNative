import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  Vibration,
  View,
} from 'react-native';
import {MessageType, RawAttachment, RawMessage} from '../store/RawData';
import Avatar from './ui/Avatar';
import {formatTimestamp} from '../utils/date';
import {useStore} from '../store/store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {observer} from 'mobx-react-lite';
import {Message, MessageSentStatus} from '../store/messages';
import Markup, {MentionUser} from './Markup';
import FastImage from 'react-native-fast-image';
import {useWindowDimensions} from 'react-native';
import env from '../utils/env';
import {useCustomPortal} from '../utils/CustomPortal';
import {MessageContextMenu} from './context-menu/MessageContextMenu';
import Colors from './ui/Colors';

interface MessageItemProps {
  item: RawMessage;
  index?: number;
  serverId?: string;
  preview?: boolean;
}

export default React.memo(
  function MessageItem(props: MessageItemProps) {
    const {createPortal} = useCustomPortal();
    const {messages, channelProperties} = useStore();
    const channelMessages = messages.cache[props.item.channelId];

    const beforeMessage =
      props.index !== undefined ? channelMessages[props.index + 1] : undefined;

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

    const isSystemMessage = props.item.type !== MessageType.CONTENT;

    const onPress = () => {
      if (props.preview) {
        return;
      }
      createPortal(
        close => (
          <MessageContextMenu
            serverId={props.serverId}
            message={props.item}
            close={close}
          />
        ),
        'message-context-menu',
      );
    };

    const onLongPress = () => {
      if (props.preview) {
        return;
      }
      if (props.item.type !== MessageType.CONTENT) {
        return;
      }
      Vibration.vibrate(50);
      ToastAndroid.show('Message Quoted.', ToastAndroid.SHORT);
      const properties = channelProperties.get(props.item.channelId);
      properties?.setContent(properties?.content + `[q:${props.item.id}]`);
    };

    return (
      <Pressable
        unstable_pressDelay={100}
        android_ripple={{color: 'gray'}}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={600}
        style={[
          styles.messageItemContainer,
          isCompact ? styles.compactMessageItemContainer : undefined,
        ]}>
        {isSystemMessage ? (
          <SystemMessage message={props.item} />
        ) : (
          <>
            {!isCompact && <Avatar size={35} user={props.item.createdBy} />}
            <View style={styles.messageInnerContainer}>
              {!isCompact && <Details {...props} />}
              <Content message={props.item} preview={props.preview} />
            </View>
          </>
        )}
      </Pressable>
    );
  },
  (p, n) => p.item === n.item,
);

const Details = observer((props: MessageItemProps) => {
  const {serverMembers} = useStore();
  const createdBy = props.item.createdBy;
  const timestamp = formatTimestamp(props.item.createdAt);

  const roleColor = props.serverId
    ? serverMembers.get(props.serverId, createdBy.id)?.roleColor
    : undefined;

  return (
    <View style={styles.detailsContainer}>
      <Text style={{color: roleColor}}>{createdBy.username}</Text>
      <Text style={styles.timestamp}>{timestamp}</Text>
    </View>
  );
});

const Content = observer((props: {message: RawMessage; preview?: boolean}) => {
  return (
    <View style={{width: '100%'}}>
      <Markup
        text={props.message.content || ''}
        message={props.message}
        afterComponent={MessageStatus({message: props.message})}
      />

      <Embeds message={props.message} preview={props.preview} />
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

const Embeds = (props: {message: Message; preview?: boolean}) => {
  return (
    <>
      {!!props.message?.attachments?.length && (
        <ImageEmbed
          attachment={props.message.attachments[0]}
          widthOffset={-65}
          maxHeight={props.preview ? 100 : undefined}
        />
      )}
    </>
  );
};
const ImageEmbed = (props: {
  attachment: RawAttachment;
  widthOffset?: number;
  maxHeight?: number;
}) => {
  const {width, height} = useWindowDimensions();

  const maxWidth = clamp(width + (props.widthOffset || 0), 600);

  const style = clampImageSize(
    props.attachment.width!,
    props.attachment.height!,
    maxWidth,
    props.maxHeight ? props.maxHeight : height / 2,
  );
  return (
    <FastImage
      style={[style, styles.imageEmbed]}
      source={{
        uri: env.NERIMITY_CDN + props.attachment.path,
        priority: FastImage.priority.normal,
      }}
      resizeMode="contain"
    />
  );
};

const SystemMessage = (props: {message: RawMessage}) => {
  const systemMessage = (() => {
    switch (props.message.type) {
      case MessageType.JOIN_SERVER:
        return {
          icon: 'login',
          color: Colors.primaryColor,
          message: 'has joined the server.',
        };
      case MessageType.LEAVE_SERVER:
        return {
          icon: 'logout',
          color: Colors.alertColor,
          message: 'has left the server.',
        };
      case MessageType.KICK_USER:
        return {
          icon: 'logout',
          color: Colors.alertColor,
          message: 'has been kicked.',
        };
      case MessageType.BAN_USER:
        return {
          icon: 'block',
          color: Colors.alertColor,
          message: 'has been banned.',
        };
      case MessageType.STARTED_CALL:
        return {
          icon: 'call',
          color: Colors.successColor,
          message: 'started a call.',
        };
      default:
        return undefined;
    }
  })();

  if (!systemMessage) {
    return null;
  }

  return (
    <View style={styles.systemMessageContainer}>
      <Icon name={systemMessage.icon} color={systemMessage.color} size={18} />
      <Text style={styles.systemMessageContent}>
        <MentionUser user={props.message.createdBy} /> {systemMessage.message}
      </Text>
    </View>
  );
};

export function clamp(num: number, max: number) {
  return num >= max ? max : num;
}

function clampImageSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) {
  const aspectRatio = width / height;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  return {width: width, height: height};
}

const styles = StyleSheet.create({
  messageItemContainer: {
    paddingLeft: 10,
    paddingRight: 10,
    marginTop: 15,
    gap: 5,
    flexDirection: 'row',
  },
  compactMessageItemContainer: {
    marginLeft: 40,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    paddingVertical: 2,
  },
  messageInnerContainer: {flex: 1, flexWrap: 'wrap'},
  detailsContainer: {flexDirection: 'row', gap: 5, alignItems: 'center'},
  timestamp: {fontSize: 12, opacity: 0.6},
  systemMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  systemMessageContent: {
    alignSelf: 'center',
    marginBottom: 5,
  },
  messageStatus: {
    height: 10,
    width: 13,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  imageEmbed: {
    borderRadius: 8,
  },
});
