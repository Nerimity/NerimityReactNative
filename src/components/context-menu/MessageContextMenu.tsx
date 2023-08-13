import React from 'react';
import {ToastAndroid} from 'react-native-windows';
import {MessageType, RawMessage} from '../../store/RawData';
import Colors from '../ui/Colors';
import {ContextMenu, ContextMenuOption} from '../ui/ContextMenu';
import Clipboard from '@react-native-clipboard/clipboard';
import MessageItem from '../MessageItem';
import {useStore} from '../../store/store';
import {ROLE_PERMISSIONS} from '../../utils/bitwise';
import {observer} from 'mobx-react-lite';
import {useCustomPortal} from '../../utils/CustomPortal';
import {Text, View} from 'react-native';
import {Modal} from '../ui/Modal';
import CustomButton from '../ui/CustomButton';
import {deleteMessage} from '../../services/MessageService';

export const MessageContextMenu = observer(
  (props: {close: () => void; serverId?: string; message: RawMessage}) => {
    const {channelProperties, account, serverMembers} = useStore();
    const {createPortal} = useCustomPortal();

    const onCopyClick = () => {
      ToastAndroid.show('Message Copied.', ToastAndroid.SHORT);
      Clipboard.setString(props.message.content || '');
    };

    const onCopyIdClick = () => {
      ToastAndroid.show('Message ID Copied.', ToastAndroid.SHORT);
      Clipboard.setString(props.message.id || '');
    };

    const onQuoteClick = () => {
      ToastAndroid.show('Message Quoted.', ToastAndroid.SHORT);
      const properties = channelProperties.get(props.message.channelId);
      properties?.setContent(properties?.content + `[q:${props.message.id}]`);
    };

    const onDeleteClick = () => {
      createPortal(
        close => (
          <DeleteMessageModal
            close={close}
            message={props.message}
            serverId={props.serverId}
          />
        ),
        'delete-message-modal',
      );
    };

    const showDelete = () => {
      if (account.user?.id === props.message.createdBy.id) {
        return true;
      }
      if (!props.serverId) {
        return false;
      }

      const member = serverMembers.get(props.serverId, account.user?.id!);
      return member?.hasPermission?.(ROLE_PERMISSIONS.MANAGE_CHANNELS);
    };

    const showQuote = props.message.type === MessageType.CONTENT;

    const items: ContextMenuOption[] = [
      {separator: true},
      ...(showQuote
        ? [
            {
              icon: 'format-quote',
              title: 'Quote Message',
              onPress: onQuoteClick,
            },
          ]
        : []),
      ...(showDelete()
        ? [
            {
              icon: 'delete',
              title: 'Delete Message',
              color: Colors.alertColor,
              onPress: onDeleteClick,
            },
          ]
        : []),
      ...(showQuote || showDelete() ? [{separator: true}] : []),
      ...(showQuote
        ? [{icon: 'content-copy', title: 'Copy Message', onPress: onCopyClick}]
        : []),
      {icon: 'content-copy', title: 'Copy ID', onPress: onCopyIdClick},
    ];

    const Header = () => {
      return (
        <MessageItem preview serverId={props.serverId} item={props.message} />
      );
    };
    return (
      <ContextMenu header={<Header />} items={items} close={props.close} />
    );
  },
);

const DeleteMessageModal = (props: {
  close: () => void;
  message: RawMessage;
  serverId?: string;
}) => {
  const onDeleteClick = async () => {
    props.close();
    await deleteMessage({
      channelId: props.message.channelId,
      messageId: props.message.id,
    });
  };

  return (
    <Modal
      title="Delete Message"
      icon="delete"
      close={props.close}
      color={Colors.alertColor}>
      <Text style={{marginLeft: 5}}>
        Would you like to delete this message?
      </Text>
      <MessageItem preview item={props.message} />
      <View style={{flexDirection: 'row', marginTop: 10}}>
        <CustomButton
          flex={1}
          title="Don't Delete"
          color={Colors.primaryColor}
          onPress={props.close}
          icon="close"
        />
        <CustomButton
          flex={1}
          title="Delete"
          color={Colors.alertColor}
          onPress={onDeleteClick}
          icon="delete"
        />
      </View>
    </Modal>
  );
};
