import React from 'react';
import {GestureResponderEvent, Pressable, StyleSheet, Text} from 'react-native';

export default function Header(props: {
  title: string;
  onPress?(event: GestureResponderEvent): void;
}) {
  return (
    <Pressable style={styles.header} onPress={props.onPress}>
      <Text numberOfLines={1} style={styles.headerText}>
        {props.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    padding: 15,
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
