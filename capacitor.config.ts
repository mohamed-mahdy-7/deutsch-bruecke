import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The app is a PWA first and a native shell second. `npm run cap:sync`
 * builds the web workspace into `apps/web/dist`, then copies it (and the native
 * speech plugins) into the Android and iOS projects.
 */
const config: CapacitorConfig = {
  appId: "app.bruecke.deutsch",
  appName: "Deutsch Brücke",
  webDir: "apps/web/dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SpeechRecognition: {
      // The plugin reads this as its default language when a call omits one.
      language: "de-DE",
    },
  },
};

export default config;
