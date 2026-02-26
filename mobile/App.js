import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState, useEffect } from 'react';

// Set EXPO_PUBLIC_APP_URL in .env (dev) or eas.json env (production builds)
const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'http://10.100.102.16:3000';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Android hardware back button — navigate back in WebView instead of exiting
  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [canGoBack]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="auto" />
        {hasError ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: 'red', fontSize: 18, textAlign: 'center' }}>Error loading app.</Text>
            <Text style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>{errorMessage}</Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: `${APP_URL}/?t=${Date.now()}` }}
            style={styles.webview}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error: ', nativeEvent);
              setHasError(true);
              setErrorMessage(nativeEvent.description || 'Unknown error');
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView received HTTP status code: ', nativeEvent.statusCode);
              if (nativeEvent.statusCode >= 400) {
                setHasError(true);
                setErrorMessage(`HTTP Error: ${nativeEvent.statusCode}`);
              }
            }}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            startInLoadingState={true}
            mixedContentMode="always"
            originWhitelist={['*']}
            cacheEnabled={false}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
});
