import { ToastAndroid } from "react-native-windows";
import { RawMessage } from "../../store/RawData";
import Colors from "../ui/Colors";
import { ContextMenu, ContextMenuOption } from "../ui/ContextMenu";
import Clipboard from '@react-native-clipboard/clipboard';
import MessageItem from "../MessageItem";
import { useStore } from "../../store/store";

export function MessageContextMenu(props: {close: () => void, message: RawMessage}) {
  const {channelProperties} = useStore();

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

  const items: ContextMenuOption[] = [
    {separator: true},
    { icon: 'format-quote', title: 'Quote Message', onPress: onQuoteClick },
    { icon: 'delete', title: 'Delete Message', color: Colors.alertColor },
    {separator: true},
    { icon: 'content-copy', title: 'Copy Message', onPress: onCopyClick },
    { icon: 'content-copy', title: 'Copy ID', onPress: onCopyIdClick },
  ]

  const Header = () => {
    return <MessageItem preview item={props.message} />
  }
  return (
    <ContextMenu header={<Header/>} items={items} close={props.close}  />
  )
}