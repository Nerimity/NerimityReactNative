import React from 'react';
import {View, StyleProp, ViewStyle, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';

interface AvatarProps {
  server?: {avatar?: string; hexColor: string};
  user?: {avatar?: string; hexColor: string};
  size: number;
}

export default function Avatar(props: AvatarProps) {
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
        <FastImage
          style={{width: props.size, height: props.size}}
          source={{
            uri: `https://cdn.nerimity.com/${serverOrUser.avatar}`,
            priority: FastImage.priority.normal,
          }}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    overflow: 'hidden',
    flexShrink: 0,
  },
});
