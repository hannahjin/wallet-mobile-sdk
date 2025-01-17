import { StyleSheet, View, Text, Linking, Platform } from 'react-native';
import {
  addDiagnosticLogListener,
  getAndroidIntentUrl,
  MobileWalletProtocolProvider,
  SecureStorage,
  useMobileWalletProtocolHost,
} from '@coinbase/mobile-wallet-protocol-host';
import React, { useEffect } from 'react';

import { MMKV } from 'react-native-mmkv';
import { ActionsScreen } from './ActionsScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mmkv = new MMKV();
const storage: SecureStorage = {
  get: async function <T>(key: string): Promise<T | undefined> {
    const dataJson = mmkv.getString(key);
    if (dataJson === undefined) {
      return undefined;
    }
    return Promise.resolve(JSON.parse(dataJson) as T);
  },
  set: async function <T>(key: string, value: T): Promise<void> {
    const encoded = JSON.stringify(value);
    mmkv.set(key, encoded);
  },
  remove: async function (key: string): Promise<void> {
    mmkv.delete(key);
  },
};

export default function Root() {
  return (
    <SafeAreaProvider>
      <MobileWalletProtocolProvider secureStorage={storage} sessionExpiryDays={7}>
        <App />
      </MobileWalletProtocolProvider>
    </SafeAreaProvider>
  );
}

function App() {
  const { message, handleRequestUrl } = useMobileWalletProtocolHost();

  // Handle incoming deeplinks
  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('Linking URL:', url);

      const handled = await handleRequestUrl(url);
      if (!handled) {
        // Handle other cases...
      }
    });

    (async function handleInitialUrl() {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        Linking.emit('url', { url: initialUrl });
      }
    })();

    return () => subscription.remove();
  }, [handleRequestUrl]);

  // Handle Android intents
  useEffect(() => {
    if (Platform.OS === 'android') {
      (async function handleAndroidIntent() {
        const intentUrl = await getAndroidIntentUrl();
        if (intentUrl) {
          await handleRequestUrl(intentUrl);
        }
      })();
    }
  }, [handleRequestUrl]);

  // Diagnostic events
  useEffect(() => {
    const removeListener = addDiagnosticLogListener((event) => {
      console.log('Event:', JSON.stringify(event));
    });

    return () => removeListener();
  }, []);

  return message ? (
    <View style={styles.screen}>
      <ActionsScreen message={message} />
    </View>
  ) : (
    <View style={styles.container}>
      <Text>No requests</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: { width: '100%', height: '100%' },
});
