import React from 'react';
import {View, StyleProp, ViewStyle, StyleSheet, Image} from 'react-native';
import FastImage from 'react-native-fast-image';
import DefaultProfile from '../../assets/profile.png';
const DefaultProfileUri = Image.resolveAssetSource(DefaultProfile).uri;

interface AvatarProps {
  server?: {avatar?: string; hexColor: string};
  user?: {avatar?: string; hexColor: string};
  size: number;
  animate?: boolean;
}

export default function Avatar(props: AvatarProps) {
  const serverOrUser = props.server || props.user;

  const avatarStyles: StyleProp<ViewStyle> = {
    backgroundColor: serverOrUser?.avatar ? undefined : serverOrUser?.hexColor,
    borderRadius: props.size,
    width: props.size,
    height: props.size,
  };

  const animate =
    serverOrUser?.avatar?.endsWith('gif') && !props.animate ? '?type=webp' : '';

  const uri = serverOrUser?.avatar
    ? `https://cdn.nerimity.com/${serverOrUser.avatar}${animate}`
    : DefaultProfileUri;

  return (
    <View style={[styles.avatarContainer, avatarStyles]}>
      <FastImage
        style={{width: props.size, height: props.size}}
        source={{
          uri,
          priority: FastImage.priority.normal,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    overflow: 'hidden',
    flexShrink: 0,
  },
});
