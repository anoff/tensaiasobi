import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tensaiasobi.app',
  appName: 'tensaiasobi',
  webDir: 'dist',
  // Matches the play-mat paper colour so there is no flash while the web view loads.
  backgroundColor: '#ffe7c2',
  plugins: {
    StatusBar: {
      // LIGHT = dark text for light backgrounds (the app is always on light paper).
      style: 'LIGHT',
      overlaysWebView: true,
    },
  },
  // ios.contentInset stays at the default ('never'): the web layout pads itself with
  // env(safe-area-inset-*) (pt-safe / pb-safe), so a native inset would double it.
};

export default config;
