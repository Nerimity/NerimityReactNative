import React, { JSX, useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useUpdateChecker } from './src/hooks/useUpdateChecker';
import { RawMessage } from './src/RawData';
import { MessageItem } from './src/components/MessageItem';
import Colors from './src/components/Colors';

function App(): JSX.Element {
  const [messages, setMessages] = React.useState<RawMessage[]>([]);
  useUpdateChecker();

  const fetchMessages = async () => {
    const channelId = '1289157729608441857'; //nerimity
    // const channelId = '1387155227274289152'; //testacc dm
    const url = `https://nerimity.com/api/channels/${channelId}/messages?limit=50`;
    const headers = {
      authorization: '',
    };
    const res = await fetch(url, { headers });
    const json = await res.json();
    console.log(json);
    setMessages(json);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ backgroundColor: Colors.backgroundColor }}>
        <ScrollView>
          <Text style={{ color: 'white' }}>
            Hello
            <View>
              <Text style={{ color: 'red' }}>World!</Text>
            </View>
            test
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
