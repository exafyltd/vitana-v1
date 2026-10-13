/**
 * VTID-05180 — config plugin for the native ORB voice module (plan Change 13).
 * app.config.ts: plugins: [['./modules/vitana-voice/plugin/withVitanaVoice', { profile }]]
 *
 * iOS (N6b): withVitanaVoiceIos.js. Android (N6c, VTID-05181): withVitanaVoiceAndroid.js —
 * audio permissions and the development-only network security config.
 */
const fs = require('fs');
const path = require('path');
const withVitanaVoiceAndroid = require('./withVitanaVoiceAndroid');

const PROFILES = ['development', 'test-g1'];

// N6b and N6c are separate PRs that may merge in either order: the iOS part is
// applied whenever its file is present (it always is once VTID-05180 has merged).
const IOS_PLUGIN = path.join(__dirname, 'withVitanaVoiceIos.js');
const withVitanaVoiceIos = fs.existsSync(IOS_PLUGIN) ? require(IOS_PLUGIN) : null;

function withVitanaVoice(config, props = {}) {
  if (!PROFILES.includes(props.profile)) {
    throw new Error(
      `withVitanaVoice: unknown profile "${props.profile}". Pass { profile } from app.config.ts (${PROFILES.join(', ')}).`,
    );
  }
  config = withVitanaVoiceAndroid(config, props);
  return withVitanaVoiceIos ? withVitanaVoiceIos(config, props) : config;
}

module.exports = withVitanaVoice;
module.exports.PROFILES = PROFILES;
