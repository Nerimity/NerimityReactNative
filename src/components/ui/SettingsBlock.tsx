import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Show from './Show';

interface Props {
  label: string;
  icon?: string;
  description?: string;
  children?: JSX.Element;
}
export default function SettingsBlock(props: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Icon name={props.icon || 'texture'} size={28} />
        <View style={styles.textContainer}>
          <Text style={styles.label}>{props.label}</Text>
          <Show when={props.description}>
            <Text style={styles.description}>{props.description}</Text>
          </Show>
        </View>
      </View>
      <View style={styles.childrenContainer}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  textContainer: {},
  label: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  description: {
    color: 'rgba(255,255,255,0.5)',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  childrenContainer: {
    marginLeft: 38,
  },
});
