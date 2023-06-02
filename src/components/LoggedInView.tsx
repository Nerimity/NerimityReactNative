import React, {startTransition, useEffect} from 'react';
import {observer} from 'mobx-react-lite';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  ViewStyle,
  StyleProp,
  View,
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

export default function LoggedInView(props: Props) {
  return (
    <View style={{flexDirection: 'row', height: '100%'}}>
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
      style={{backgroundColor: '#131416', height: '100%'}}>
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
    <View
      style={{alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 30}}>
      <Pressable
        style={{alignItems: 'center', justifyContent: 'center'}}
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
  const styles: StyleProp<ViewStyle> = {
    height: 15,
    position: 'absolute',
    left: 5,
    width: 2,
    backgroundColor: '#77a8f3',
  };
  return props.selected ? <View style={styles} /> : null;
};

interface AvatarProps {
  server?: {avatar?: string; avatarUrl: string; hexColor: string};
  user?: {avatar?: string; avatarUrl: string; hexColor: string};
  size: number;
}
const Avatar = (props: AvatarProps) => {
  const serverOrUser = props.server || props.user;

  const styles: StyleProp<ViewStyle> = {
    width: props.size,
    height: props.size,
    margin: 10,
    borderRadius: props.size,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: serverOrUser?.avatar ? undefined : serverOrUser?.hexColor,
  };

  return (
    <View style={styles}>
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
