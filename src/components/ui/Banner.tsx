import React from 'react';
import {View, StyleProp, ViewStyle, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';

interface BannerProps {
  server?: {banner?: string; hexColor: string};
  user?: {banner?: string; hexColor: string};
  height?: number;
  animate?: boolean;
  children?: React.JSX.Element | React.JSX.Element[];
}

export default function Banner(props: BannerProps) {
  const serverOrUser = props.server || props.user;

  const bannerStyles: StyleProp<ViewStyle> = {
    height: props.height !== undefined ? props.height : 120,
  };

  const imageStyles = {
    backgroundColor: serverOrUser?.banner ? undefined : serverOrUser?.hexColor,
  };

  const animate =
    serverOrUser?.banner?.endsWith('gif') && !props.animate ? '?type=webp' : '';

  const uri = serverOrUser?.banner
    ? `https://cdn.nerimity.com/${serverOrUser?.banner}${animate}`
    : undefined;

  return (
    <View style={[styles.bannerContainer, bannerStyles]}>
      <View style={[styles.imageContainer, imageStyles]}>
        <View style={styles.imageDimmer} />
        {uri && (
          <FastImage
            style={styles.image}
            source={{
              uri,
              priority: FastImage.priority.normal,
            }}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={styles.children} children={props.children} />
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    flexShrink: 0,

    margin: 10,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    height: '100%',
    width: '100%',
  },
  image: {width: '100%', height: '100%'},
  imageDimmer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1111,
  },
  children: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
