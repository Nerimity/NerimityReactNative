import React, { JSX } from 'react';
import { ScrollView, View } from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useUpdateChecker } from './src/hooks/useUpdateChecker';
import { RawMessage } from './src/RawData';
import { MessageItem } from './src/components/MessageItem';
import Colors from './src/components/Colors';

function App(): JSX.Element {
  const [messages, _setMessages] = React.useState<RawMessage[]>([]);
  useUpdateChecker();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ backgroundColor: Colors.backgroundColor }}>
        <ScrollView>
          <View style={{ gap: 8 }}>
            {messages.map(message => (
              <MessageItem key={message.id} message={message} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
