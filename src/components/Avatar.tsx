import { Image, View } from 'react-native';
import env from '../env';

export const Avatar = (props: {
  size: number;
  resize?: 46;
  user: { avatar?: string; hexColor: string; username: string };
}) => {
  const sizeStyle = {
    width: props.size,
    height: props.size,
  };

  const imageUrl =
    props.user.avatar &&
    `${env.NERIMITY_CDN}${props.user.avatar}${
      props.resize ? `?size=${props.resize}` : ''
    }`;

  return (
    <View
      style={[
        sizeStyle,
        {
          backgroundColor: !imageUrl ? props.user.hexColor : undefined,
        },
      ]}
    >
      {imageUrl && (
        <Image
          style={[
            sizeStyle,
            {
              borderRadius: props.size,
            },
          ]}
          source={{ uri: imageUrl }}
        />
      )}
    </View>
  );
};
