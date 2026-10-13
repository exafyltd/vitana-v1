// VTID-05157 — Expo's default preset (Metro and jest-expo both read this file).
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
