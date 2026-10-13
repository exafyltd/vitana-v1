/**
 * VTID-05180 — config plugin for the native ORB voice module (plan Change 13).
 * app.config.ts: plugins: [['./modules/vitana-voice/plugin/withVitanaVoice', { profile }]]
 *
 * iOS (N6b): withVitanaVoiceIos.js. Android permissions and the dev network
 * security config are the Android module's part of this plugin (N6c).
 */
const withVitanaVoiceIos = require('./withVitanaVoiceIos');

const PROFILES = ['development', 'test-g1'];

function withVitanaVoice(config, props = {}) {
  if (!PROFILES.includes(props.profile)) {
    throw new Error(
      `withVitanaVoice: unknown profile "${props.profile}". Pass { profile } from app.config.ts (${PROFILES.join(', ')}).`,
    );
  }
  return withVitanaVoiceIos(config, props);
}

module.exports = withVitanaVoice;
module.exports.PROFILES = PROFILES;
