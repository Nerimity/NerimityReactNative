import React from 'react';
import {Image, View, StyleProp, ViewStyle, StyleSheet} from 'react-native';

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
        <Image
          source={{
            uri: `https://cdn.nerimity.com/${serverOrUser.avatar}`,
            width: props.size,
            height: props.size,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    margin: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
});
