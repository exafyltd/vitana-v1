/**
 * VTID-05181 — Android part of the VitanaVoice config plugin (plan Change 13): audio
 * permissions, the development-only cleartext config for the local fake gateway, and the
 * composition with the iOS part (VTID-05180) under one `{ profile }` plugin entry.
 */
import { existsSync } from 'fs';
import { join } from 'path';
import type { ExpoConfig } from 'expo/config';
import { buildConfig } from '../../app.config';

/* eslint-disable @typescript-eslint/no-require-imports */
const withVitanaVoice = require('../../modules/vitana-voice/plugin/withVitanaVoice');
const android = require('../../modules/vitana-voice/plugin/withVitanaVoiceAndroid');
/* eslint-enable @typescript-eslint/no-require-imports */

type ModConfig = ExpoConfig & { mods?: { android?: Record<string, unknown>; ios?: Record<string, unknown> } };
const PLUGIN = './modules/vitana-voice/plugin/withVitanaVoice';
const apply = (profile: string): ModConfig => withVitanaVoice({ name: 'Vitana Dev', slug: 'vitana-mobile' }, { profile });

describe('app.config wires the plugin with the profile', () => {
  it.each(['development', 'test-g1'])('%s', (profile) => {
    expect(buildConfig(profile).plugins).toContainEqual([PLUGIN, { profile }]);
    expect(existsSync(join(__dirname, '../..', `${PLUGIN}.js`))).toBe(true);
  });
});

describe('withVitanaVoice (Android part)', () => {
  it('refuses an unknown or production profile', () => {
    expect(() => apply('production')).toThrow(/unknown profile/);
    expect(() => withVitanaVoice({ name: 'x', slug: 'x' }, {})).toThrow(/unknown profile/);
  });

  it('requests the audio permissions the engine needs', () => {
    expect(android.ANDROID_PERMISSIONS).toEqual([
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.BLUETOOTH_CONNECT',
    ]);
    expect(apply('test-g1').mods?.android?.manifest).toBeDefined();
  });

  it('adds the cleartext config in development only', () => {
    expect(apply('development').mods?.android?.dangerous).toBeDefined();
    expect(apply('test-g1').mods?.android?.dangerous).toBeUndefined();
  });

  it('evaluates without reading any i18n file (Android has no permission text)', () => {
    expect(() => apply('development')).not.toThrow();
  });
});

describe('development-only cleartext (local fake gateway, plan Change 7)', () => {
  it('accepts private and loopback IPv4 only', () => {
    for (const ok of ['10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.20', '127.0.0.1']) expect(android.isPrivateIPv4(ok)).toBe(true);
    for (const bad of ['8.8.8.8', '172.32.0.1', '192.169.0.1', '1.2.3', '300.1.1.1', 'gateway.vitanaland.com', 'localhost']) {
      expect(android.isPrivateIPv4(bad)).toBe(false);
    }
  });

  it('adds hosts from VITANA_DEV_CLEARTEXT_HOSTS and refuses public ones', () => {
    expect(android.devCleartextHosts({})).toEqual(android.BASE_CLEARTEXT_HOSTS);
    expect(android.devCleartextHosts({ VITANA_DEV_CLEARTEXT_HOSTS: '192.168.1.20, 10.0.0.7' })).toEqual([
      ...android.BASE_CLEARTEXT_HOSTS,
      '192.168.1.20',
      '10.0.0.7',
    ]);
    expect(() => android.devCleartextHosts({ VITANA_DEV_CLEARTEXT_HOSTS: '52.1.2.3' })).toThrow(/refused "52.1.2.3"/);
    expect(() => android.devCleartextHosts({ VITANA_DEV_CLEARTEXT_HOSTS: 'gateway.vitanaland.com' })).toThrow(/refused/);
  });

  it('writes a config where only the listed hosts allow cleartext', () => {
    const xml: string = android.networkSecurityConfigXml(['localhost', '192.168.1.20']);
    expect(xml).toContain('<base-config cleartextTrafficPermitted="false" />');
    expect(xml).toContain('<domain includeSubdomains="false">192.168.1.20</domain>');
    expect(xml).not.toMatch(/vitanaland/);
  });

  it('points the application at it and never silently replaces another config', () => {
    const manifest: { manifest: { $: object; application: Array<{ $: Record<string, string> }> } } = {
      manifest: { $: {}, application: [{ $: { 'android:name': '.MainApplication' } }] },
    };
    android.applyNetworkSecurityConfig(manifest);
    expect(manifest.manifest.application[0].$['android:networkSecurityConfig']).toBe(android.NSC_REF);
    const other = { manifest: { $: {}, application: [{ $: { 'android:name': '.MainApplication', 'android:networkSecurityConfig': '@xml/other' } }] } };
    expect(() => android.applyNetworkSecurityConfig(other)).toThrow(/already sets/);
  });
});
