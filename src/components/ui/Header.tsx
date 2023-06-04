import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export default function Header(props: {title: string}) {
  return (
    <View style={styles.header}>
      <Text numberOfLines={1} style={styles.headerText}>
        {props.title}
      </Text>
    </View>
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
