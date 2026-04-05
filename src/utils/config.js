/* global __PODCAST_CONFIG__ */
const raw = __PODCAST_CONFIG__;

const config = {
  ...raw,
  // Normalize locale for browser APIs (he_IL → he-IL)
  browserLocale: raw.locale.replace("_", "-"),
};

export default config;
