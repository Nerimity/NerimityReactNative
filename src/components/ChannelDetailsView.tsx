import {NavigationProp, RouteProp, useRoute} from '@react-navigation/native';
import React from 'react';

import {View, StyleSheet, Text, ScrollView} from 'react-native';
import {RootStackParamList} from '../../App';
import {useStore} from '../store/store';

import Header from './ui/Header';
import Colors from './ui/Colors';
import {ServerMember} from '../store/serverMembers';
import {ServerRole} from '../store/serverRoles';
import Avatar from './ui/Avatar';
import {observer} from 'mobx-react-lite';

export type ChannelDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  'ChannelDetails'
>;
export type ChannelDetailsScreenNavigationProp =
  NavigationProp<RootStackParamList>;

export default function ChannelDetailsView() {
  return (
    <View style={styles.pageContainer}>
      <PageHeader />
      <ServerMemberList />
    </View>
  );
}

const PageHeader = () => {
  const route = useRoute<ChannelDetailsScreenRouteProp>();
  const {serverMembers} = useStore();

  const memberCount = serverMembers.array(route.params?.serverId!).length;

  return <Header title={memberCount + ' members'} />;
};

const ServerMemberList = observer(() => {
  const route = useRoute<ChannelDetailsScreenRouteProp>();
  const {servers} = useStore();

  const server = servers.get(route.params.serverId!);

  const roles = server?.getRolesWithMembers();

  return (
    <ScrollView style={styles.memberListContainer}>
      {roles &&
        roles.map(item =>
          !item.role.hideRole && item.members.length ? (
            <RoleItem
              key={item.role.id}
              role={item.role}
              members={item.members}
            />
          ) : null,
        )}
      {server && (
        <RoleItem
          role={server.defaultRole}
          members={server.getOfflineMembers()}
        />
      )}
    </ScrollView>
  );
});

const RoleItem = (props: {role: ServerRole; members: ServerMember[]}) => {
  return (
    <View style={styles.roleContainer}>
      <Text style={styles.roleTitle}>
        {props.role.name} ({props.members.length})
      </Text>
      {props.members.map(member => (
        <MemberItem member={member} role={props.role} key={member.userId} />
      ))}
    </View>
  );
};
const MemberItem = (props: {member: ServerMember; role: ServerRole}) => {
  return (
    <View style={styles.memberItemContainer}>
      <Avatar size={40} user={props.member.user} />
      <Text
        numberOfLines={1}
        style={[styles.memberUsername, {color: props.role.hexColor}]}>
        {props.member.user.username}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.paneColor,
    flexDirection: 'column',
    height: '100%',
  },
  memberListContainer: {
    padding: 10,
  },
  roleContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 5,
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 2,
  },
  roleTitle: {
    paddingLeft: 5,
  },
  memberItemContainer: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 5,
  },
  memberUsername: {
    flex: 1,
  },
});
