#!/usr/bin/env node
// Hand-curated DE translations for the highest-frequency English toast
// strings. Walks src/i18n/de/toasts.json and replaces matching English
// placeholders + clears their _pending_review flag.
//
// Idempotent: skips entries that already differ from the EN source.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DE_PATH = join(ROOT, 'src/i18n/de/toasts.json');
const EN_PATH = join(ROOT, 'src/i18n/en/toasts.json');

// EN → DE for the most repeated strings. du-form, friendly tone, wellness app voice.
const SEED = {
  'Error': 'Fehler',
  'Success': 'Erfolg',
  'Saved': 'Gespeichert',
  'Loading': 'Wird geladen',
  'Loading...': 'Wird geladen…',
  'Loading recommendations…': 'Empfehlungen werden geladen…',
  'Please try again': 'Bitte versuche es erneut',
  'Please try again.': 'Bitte versuche es erneut.',
  'Try again': 'Erneut versuchen',
  'Link copied': 'Link kopiert',
  'Link copied to clipboard': 'Link in Zwischenablage kopiert',
  'Copied!': 'Kopiert!',
  'Upload failed': 'Upload fehlgeschlagen',
  'Save failed': 'Speichern fehlgeschlagen',
  'Could not save': 'Konnte nicht gespeichert werden',
  'Share failed': 'Teilen fehlgeschlagen',
  'Update Failed': 'Aktualisierung fehlgeschlagen',
  'Sign in required': 'Anmeldung erforderlich',
  'Authentication Required': 'Anmeldung erforderlich',
  'Please sign in to continue': 'Bitte melde dich an, um fortzufahren',
  'Not logged in': 'Nicht angemeldet',
  'Please fill in all required fields': 'Bitte fülle alle Pflichtfelder aus',
  'Missing fields': 'Fehlende Felder',
  'Failed to send message': 'Nachricht konnte nicht gesendet werden',
  'Failed to create room': 'Raum konnte nicht erstellt werden',
  'Failed to join room': 'Raumbeitritt fehlgeschlagen',
  'Failed to download ticket': 'Ticket konnte nicht heruntergeladen werden',
  'Failed to copy link': 'Link konnte nicht kopiert werden',
  'Failed to load': 'Laden fehlgeschlagen',
  'Failed to load data': 'Daten konnten nicht geladen werden',
  'Connection Failed': 'Verbindung fehlgeschlagen',
  'Connection Error': 'Verbindungsfehler',
  'Not Supported': 'Nicht unterstützt',
  'Settings Saved': 'Einstellungen gespeichert',
  'Settings saved': 'Einstellungen gespeichert',
  'Rate Limit Reached': 'Anfragelimit erreicht',
  'Too many requests. Please wait a moment and try again.':
    'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.',
  'Could not complete task': 'Aufgabe konnte nicht abgeschlossen werden',
  'Confirmation email sent! Please check your inbox.':
    'Bestätigungs-E-Mail gesendet! Bitte überprüfe deinen Posteingang.',
  'Too many attempts. Please wait a few minutes.':
    'Zu viele Versuche. Bitte warte einige Minuten.',
  'Failed to resend email. Please try again.':
    'E-Mail konnte nicht erneut gesendet werden. Bitte versuche es erneut.',
  'Live room created': 'Live-Raum erstellt',
  'Group Created! 🎉': 'Gruppe erstellt! 🎉',
  'Content Created! 🎉': 'Inhalt erstellt! 🎉',
  'Incoming call': 'Eingehender Anruf',
  'Name required': 'Name erforderlich',
  'Please enter a group name.': 'Bitte gib einen Gruppennamen ein.',
  'Please log in to create a group.': 'Bitte melde dich an, um eine Gruppe zu erstellen.',
  'Room name required': 'Raumname erforderlich',
  'Please enter a name for your live room':
    'Bitte gib einen Namen für deinen Live-Raum ein',
  'Form Incomplete': 'Formular unvollständig',
};

const deCat = JSON.parse(readFileSync(DE_PATH, 'utf8'));
const enCat = JSON.parse(readFileSync(EN_PATH, 'utf8'));

let translated = 0;
let skipped = 0;

function walk(deNode, enNode, pathParts) {
  if (!deNode || typeof deNode !== 'object' || !enNode || typeof enNode !== 'object') return;
  for (const [k, v] of Object.entries(deNode)) {
    if (k.startsWith('_')) continue;
    const enV = enNode[k];
    if (typeof v === 'string') {
      // Only act on placeholdered entries (de === en) marked _pending_review
      const ns = pathParts[0] === 'toasts' && pathParts.length >= 2 ? pathParts[1] : null;
      const slug = k;
      const pending = ns && deCat?.toasts?.[ns]?._pending_review?.[slug] === true;
      if (!pending) {
        skipped++;
        continue;
      }
      if (typeof enV === 'string' && SEED[enV]) {
        deNode[k] = SEED[enV];
        delete deCat.toasts[ns]._pending_review[slug];
        translated++;
      }
    } else if (v && typeof v === 'object') {
      walk(v, enV, [...pathParts, k]);
    }
  }
}

walk(deCat, enCat, []);

// Prune empty _pending_review maps
function prune(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (obj._pending_review && Object.keys(obj._pending_review).length === 0) delete obj._pending_review;
  for (const v of Object.values(obj)) if (v && typeof v === 'object') prune(v);
}
prune(deCat);

writeFileSync(DE_PATH, JSON.stringify(deCat, null, 2) + '\n', 'utf8');
console.log(`[seed-de-common] translated ${translated} entries, ${skipped} skipped (not pending or no seed match)`);
