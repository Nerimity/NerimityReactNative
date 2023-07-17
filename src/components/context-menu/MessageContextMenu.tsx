import { ToastAndroid } from "react-native-windows";
import { MessageType, RawMessage } from "../../store/RawData";
import Colors from "../ui/Colors";
import { ContextMenu, ContextMenuOption } from "../ui/ContextMenu";
import Clipboard from '@react-native-clipboard/clipboard';
import MessageItem from "../MessageItem";
import { useStore } from "../../store/store";
import { ROLE_PERMISSIONS } from "../../utils/bitwise";
import { observer } from "mobx-react-lite";

export const MessageContextMenu = observer((props: {close: () => void, serverId?: string; message: RawMessage}) => {
  const {channelProperties, account, serverMembers} = useStore();

  const onCopyClick = () => {
    ToastAndroid.show("Message Copied.", ToastAndroid.SHORT)
    Clipboard.setString(props.message.content || "");
  }

  const onCopyIdClick = () => {
    ToastAndroid.show("Message ID Copied.", ToastAndroid.SHORT)
    Clipboard.setString(props.message.id || "");
  }
  
  const onQuoteClick = () => {
    ToastAndroid.show("Message Quoted.", ToastAndroid.SHORT);
    const properties = channelProperties.get(props.message.channelId);
    properties?.setContent(properties?.content + `[q:${props.message.id}]`)
  }


  const showDelete = () => {
    if (account.user?.id === props.message.createdBy.id) return true;
    if (!props.serverId) return false;

    const member = serverMembers.get(props.serverId, account.user?.id!);
    return member?.hasPermission?.(ROLE_PERMISSIONS.MANAGE_CHANNELS);
  }

  const showQuote = props.message.type === MessageType.CONTENT;

  const items: ContextMenuOption[] = [
    {separator: true},
    ...(showQuote ? [{ icon: 'format-quote', title: 'Quote Message', onPress: onQuoteClick }] : []),
    // ...(showDelete() ? [{ icon: 'delete', title: 'Delete Message', color: Colors.alertColor }] : []),
    // ...(showQuote || showDelete() ? [{separator: true}]: []),
    ...(showQuote ? [{separator: true}]: []),
    ...(showQuote ? [{ icon: 'content-copy', title: 'Copy Message', onPress: onCopyClick }] : []),
    { icon: 'content-copy', title: 'Copy ID', onPress: onCopyIdClick },
  ]

  const Header = () => {
    return <MessageItem preview serverId={props.serverId} item={props.message} />
  }
  return (
    <ContextMenu header={<Header/>} items={items} close={props.close}  />
  )
});