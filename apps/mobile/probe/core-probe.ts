/**
 * VTID-05183 — bundle probe (NATIVE-CI `npm run bundle:core-probe`). Imports
 * every @vitana/core entry and @vitana/tokens so Metro bundles the whole
 * closure for iOS and Android; probe/check-probe.js then asserts the bundle
 * holds no production host, nothing from the repo-root node_modules and one
 * React. Lives outside app/, so it is no route (and no parity-ledger row).
 */
import { version as reactVersion } from 'react';
import * as businessMode from '@vitana/core/business-mode';
import * as config from '@vitana/core/config';
import * as dataRouting from '@vitana/core/data-routing';
import * as gateway from '@vitana/core/gateway';
import * as language from '@vitana/core/language';
import * as nav from '@vitana/core/nav';
import * as orbNavigation from '@vitana/core/orb-navigation';
import * as permissions from '@vitana/core/permissions';
import * as registry from '@vitana/core/registry';
import * as roles from '@vitana/core/roles';
import * as storage from '@vitana/core/storage';
import * as supabase from '@vitana/core/supabase';
import * as tenants from '@vitana/core/tenants';
import * as tokens from '@vitana/tokens';

(globalThis as Record<string, unknown>).__vitanaCoreProbe = {
  reactVersion,
  businessMode,
  config,
  dataRouting,
  gateway,
  language,
  nav,
  orbNavigation,
  permissions,
  registry,
  roles,
  storage,
  supabase,
  tenants,
  tokens,
};
