import React, {forwardRef, useImperativeHandle, useRef} from 'react';
import {ToastAndroid} from 'react-native';
import {MessageType, RawMessage} from '../../store/RawData';
import Colors from '../ui/Colors';
import {ContextMenu, ContextMenuOption} from '../ui/ContextMenu';
import Clipboard from '@react-native-clipboard/clipboard';
import MessageItem from '../MessageItem';
import {useStore} from '../../store/store';
import {ROLE_PERMISSIONS} from '../../utils/bitwise';
import {observer} from 'mobx-react-lite';
import {Text, View} from 'react-native';
import {Modal, ModalRef} from '../ui/Modal';
import CustomButton from '../ui/CustomButton';
import {deleteMessage} from '../../services/MessageService';

interface MessageContextMenuProps {
  serverId?: string;
  message: RawMessage;
}

export const MessageContextMenu = observer(
  forwardRef<ModalRef, MessageContextMenuProps>((props, forwardedRef) => {
    const {channelProperties, account, serverMembers} = useStore();
    const messageDeleteModalRef = useRef<ModalRef>(null);
    const modalRef = useRef<ModalRef>(null);

    useImperativeHandle(forwardedRef, () => modalRef.current as ModalRef);

    const onCopyClick = () => {
      ToastAndroid.show('Message Copied.', ToastAndroid.SHORT);
      Clipboard.setString(props.message.content || '');
      modalRef.current?.modal.dismiss();
    };

    const onCopyIdClick = () => {
      ToastAndroid.show('Message ID Copied.', ToastAndroid.SHORT);
      Clipboard.setString(props.message.id || '');
      modalRef.current?.modal.dismiss();
    };

    const onQuoteClick = () => {
      ToastAndroid.show('Message Quoted.', ToastAndroid.SHORT);
      const properties = channelProperties.get(props.message.channelId);
      properties?.setContent(properties?.content + `[q:${props.message.id}]`);
      modalRef.current?.modal.dismiss();
    };

    const showDeleteModal = () => {
      messageDeleteModalRef.current?.modal.present();
    };
    const closeDeleteMessageModal = () => {
      messageDeleteModalRef.current?.modal.dismiss();
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
              onPress: showDeleteModal,
            },
          ]
        : []),
      ...(showQuote || showDelete() ? [{separator: true}] : []),
      ...(showQuote
        ? [{icon: 'content-copy', title: 'Copy Message', onPress: onCopyClick}]
        : []),
      {icon: 'content-copy', title: 'Copy ID', onPress: onCopyIdClick},
    ];

    const Header = (
      <MessageItem preview serverId={props.serverId} item={props.message} />
    );
    return (
      <>
        <DeleteMessageModal
          ref={messageDeleteModalRef}
          close={closeDeleteMessageModal}
          message={props.message}
          serverId={props.serverId}
        />
        <ContextMenu ref={modalRef} header={Header} items={items} />
      </>
    );
  }),
);

interface DeleteMessageModalProps {
  close: () => void;
  message: RawMessage;
  serverId?: string;
}
const DeleteMessageModal = forwardRef<ModalRef, DeleteMessageModalProps>(
  (props, ref) => {
    const onDeleteClick = async () => {
      props.close();
      await deleteMessage({
        channelId: props.message.channelId,
        messageId: props.message.id,
      });
    };

    return (
      <Modal
        ref={ref}
        title="Delete Message"
        icon="delete"
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
  },
);
