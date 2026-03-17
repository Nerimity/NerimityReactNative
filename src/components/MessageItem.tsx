import { StyleSheet, Text, View } from 'react-native';
import { RawMessage } from '../RawData';
import Colors from './Colors';
import { Avatar } from './Avatar';
import { Markup } from './Markup';

export const MessageItem = (props: { message: RawMessage }) => {
  return (
    <View style={styles.messageItemContainer}>
      <Avatar size={40} resize={46} user={props.message.createdBy} />
      <View style={styles.detailsContainer}>
        <Text style={styles.username}>{props.message.createdBy.username}</Text>
        <Text style={styles.contentText}>
          <Markup text={props.message.content || ''} message={props.message} />
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageItemContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  username: {
    fontSize: 16,
    color: Colors.messageUsernameColor,
    fontWeight: 'bold',
  },
  contentText: {
    fontSize: 16,
    color: Colors.messageContentColor,
  },
  detailsContainer: {
    flex: 1,
  },
});
