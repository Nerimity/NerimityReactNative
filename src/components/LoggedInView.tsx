import React, {startTransition} from 'react';
import {observer} from 'mobx-react-lite';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  ViewStyle,
  StyleProp,
  View,
  StyleSheet,
} from 'react-native';
import {useStore} from '../store/store';
import {Server} from '../store/servers';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  MainScreenNavigationProp,
  MainScreenRouteProp,
  RootStackParamList,
} from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

const styles = StyleSheet.create({
  pageContainer: {flexDirection: 'row', height: '100%'},
  serverListContainer: {backgroundColor: '#131416', height: '100%'},
  serverItemContainer: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 30,
  },
  serverItemPressable: {alignItems: 'center', justifyContent: 'center'},
  selectedHandle: {
    height: 15,
    position: 'absolute',
    left: 5,
    width: 2,
    backgroundColor: '#77a8f3',
  },
  avatarContainer: {
    margin: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
});

export default function LoggedInView(props: Props) {
  return (
    <View style={styles.pageContainer}>
      <View>
        <ServerListPane />
      </View>
      <Text>{props.route.params?.serverId || 'Not Selected'}</Text>
    </View>
  );
}

const ServerListPane = observer(() => {
  const {servers} = useStore();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.serverListContainer}>
      {servers.array.map(server => (
        <ServerItem server={server} key={server.id} />
      ))}
    </ScrollView>
  );
});

const ServerItem = (props: {server: Server}) => {
  const nav = useNavigation<MainScreenNavigationProp>();
  const route = useRoute<MainScreenRouteProp>();

  const selected = route.params?.serverId === props.server.id;

  return (
    <View style={styles.serverItemContainer}>
      <Pressable
        style={styles.serverItemPressable}
        android_ripple={{color: 'gray'}}
        onPress={() =>
          startTransition(() =>
            nav.navigate('Main', {serverId: props.server.id}),
          )
        }>
        <SelectedHandle selected={selected} />
        <Avatar size={50} server={props.server} />
      </Pressable>
    </View>
  );
};

const SelectedHandle = (props: {selected?: boolean}) => {
  return props.selected ? <View style={styles.selectedHandle} /> : null;
};

interface AvatarProps {
  server?: {avatar?: string; avatarUrl: string; hexColor: string};
  user?: {avatar?: string; avatarUrl: string; hexColor: string};
  size: number;
}
const Avatar = (props: AvatarProps) => {
  const serverOrUser = props.server || props.user;

  const avatarStyles: StyleProp<ViewStyle> = {
    backgroundColor: serverOrUser?.avatar ? undefined : serverOrUser?.hexColor,
    borderRadius: props.size,
    width: props.size,
    height: props.size,
  };

  return (
    <View style={[styles.avatarContainer, avatarStyles]}>
      {!!serverOrUser?.avatar && (
        <Image
          source={{
            uri: serverOrUser.avatarUrl,
            width: props.size,
            height: props.size,
          }}
        />
      )}
    </View>
  );
};
