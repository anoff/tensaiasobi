import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tensaiasobi.app',
  appName: 'tensaiasobi',
  webDir: 'dist',
  backgroundColor: '#f0f9ff',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#f0f9ff',
      overlaysWebView: true,
    },
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
