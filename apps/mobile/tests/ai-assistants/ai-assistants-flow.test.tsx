/**
 * VTID-05521 — the `useAIAssistants` management flow re-implemented natively
 * over the shell gateway (bearer token, `/api/v1/integrations/ai-assistants`):
 * the provider and connection lists loaded / empty / error, the connect sheet
 * (prefix check, `POST /apikey/:provider` then `POST /verify/:provider`,
 * success shows only `prefix•••last4`, unauthorized / network / failed call
 * keep the form with the error), disconnect (`DELETE /:provider`) and the
 * `['ai-assistants']` invalidation after a mutation. Fake gateway only.
 */
import '../helpers/no-network';
import './mocks';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createAssistantSupabase, createGateway, renderAssistant } from './helpers';
import { useAIConnections, useAIProviders, useDisconnectAIProvider } from '../../src/screens/ai-assistants/data/hooks';
import { AIAssistantConnectSheet } from '../../src/screens/ai-assistants/AIAssistantConnectSheet';

const PROVIDERS = [
  { provider: 'chatgpt', display_name: 'ChatGPT', description: null, docs_url: null, capabilities: ['chat'], auth_type: 'api_key', status: 'available', connection_id: null, last_verified_at: null, last_verify_status: null, allowed_models: [], cost_cap_usd_month: null },
  { provider: 'claude', display_name: 'Claude', description: null, docs_url: null, capabilities: ['chat'], auth_type: 'api_key', status: 'connected', connection_id: 'c-2', last_verified_at: '2026-11-01T10:00:00Z', last_verify_status: 'ok', allowed_models: [], cost_cap_usd_month: null },
];
const CONNECTIONS = [{ connection_id: 'c-2', provider: 'claude', status: 'connected', key_prefix: 'sk-ant-', key_last4: 'WXYZ', last_verified_at: null, last_verify_status: 'ok', connected_at: null, disconnected_at: null }];

function ProviderProbe(): ReactElement {
  const providers = useAIProviders();
  const connections = useAIConnections();
  const disconnect = useDisconnectAIProvider();
  if (providers.isLoading || connections.isLoading) return <Text testID="probe-loading">loading</Text>;
  if (providers.error) return <Text testID="probe-error">{String((providers.error as Error).message)}</Text>;
  return (
    <>
      <Text testID="probe-providers">{(providers.data ?? []).map((p) => `${p.provider}:${p.status}`).join(',') || 'empty'}</Text>
      <Text testID="probe-connections">{(connections.data ?? []).map((c) => `${c.provider}:${c.key_prefix}…${c.key_last4}`).join(',') || 'empty'}</Text>
      <Text testID="probe-disconnect" onPress={() => disconnect.mutate({ provider: 'claude' })}>
        disconnect
      </Text>
      {disconnect.error ? <Text testID="probe-disconnect-error">{(disconnect.error as Error).message}</Text> : null}
    </>
  );
}

describe('provider + connection lists', () => {
  it('loaded: GET /providers and /connections with the bearer token', async () => {
    const gateway = createGateway({
      'GET /integrations/ai-assistants/providers': { ok: true, providers: PROVIDERS },
      'GET /integrations/ai-assistants/connections': { ok: true, connections: CONNECTIONS },
    });
    renderAssistant(<ProviderProbe />, { supabase: createAssistantSupabase(), gateway });
    expect(await screen.findByTestId('probe-providers')).toHaveTextContent('chatgpt:available,claude:connected');
    // Only the stored prefix + last 4 ever come back; no raw key exists client-side.
    expect(screen.getByTestId('probe-connections')).toHaveTextContent('claude:sk-ant-…WXYZ');
    expect(gateway.calls.map((c) => [c.method, c.path, c.headers.authorization])).toEqual([
      ['GET', '/integrations/ai-assistants/providers', 'Bearer token-u-1'],
      ['GET', '/integrations/ai-assistants/connections', 'Bearer token-u-1'],
    ]);
  });

  it('empty: no providers / connections', async () => {
    const gateway = createGateway({
      'GET /integrations/ai-assistants/providers': { ok: true, providers: [] },
      'GET /integrations/ai-assistants/connections': { ok: true },
    });
    renderAssistant(<ProviderProbe />, { supabase: createAssistantSupabase(), gateway });
    expect(await screen.findByTestId('probe-providers')).toHaveTextContent('empty');
    expect(screen.getByTestId('probe-connections')).toHaveTextContent('empty');
  });

  it('error: a non-2xx and an ok:false body both surface as the web errors', async () => {
    const g1 = createGateway({ 'GET /integrations/ai-assistants/providers': { __status: 503, __body: {} }, 'GET /integrations/ai-assistants/connections': { ok: true, connections: [] } });
    renderAssistant(<ProviderProbe />, { supabase: createAssistantSupabase(), gateway: g1 });
    expect(await screen.findByTestId('probe-error')).toHaveTextContent('Failed to load AI providers: 503');
    screen.unmount();
    const g2 = createGateway({ 'GET /integrations/ai-assistants/providers': { ok: false, error: 'AI_DISABLED' }, 'GET /integrations/ai-assistants/connections': { ok: true, connections: [] } });
    renderAssistant(<ProviderProbe />, { supabase: createAssistantSupabase(), gateway: g2 });
    expect(await screen.findByTestId('probe-error')).toHaveTextContent('AI_DISABLED');
  });

  it('disconnect: DELETE /:provider, then the lists refetch', async () => {
    const gateway = createGateway({
      'GET /integrations/ai-assistants/providers': { ok: true, providers: PROVIDERS },
      'GET /integrations/ai-assistants/connections': { ok: true, connections: CONNECTIONS },
      'DELETE /integrations/ai-assistants/claude': { ok: true, provider: 'claude' },
    });
    renderAssistant(<ProviderProbe />, { supabase: createAssistantSupabase(), gateway });
    fireEvent.press(await screen.findByTestId('probe-disconnect'));
    await waitFor(() => expect(gateway.writes()).toEqual([expect.objectContaining({ method: 'DELETE', path: '/integrations/ai-assistants/claude', body: undefined })]));
    await waitFor(() => expect(gateway.calls.filter((c) => c.path.endsWith('/providers'))).toHaveLength(2));
  });

  it('disconnect failure surfaces the gateway error', async () => {
    const gateway = createGateway({
      'GET /integrations/ai-assistants/providers': { ok: true, providers: PROVIDERS },
      'GET /integrations/ai-assistants/connections': { ok: true, connections: CONNECTIONS },
      'DELETE /integrations/ai-assistants/claude': { __status: 404, __body: { ok: false, error: 'NOT_CONNECTED' } },
    });
    renderAssistant(<ProviderProbe />, { supabase: createAssistantSupabase(), gateway });
    fireEvent.press(await screen.findByTestId('probe-disconnect'));
    expect(await screen.findByTestId('probe-disconnect-error')).toHaveTextContent('NOT_CONNECTED');
  });
});

describe('connect sheet (AIAssistantConnectModal twin)', () => {
  const routes = (verify: unknown, connect: unknown = { ok: true, connection_id: 'c-1', key_prefix: 'sk-', key_last4: '1234' }) =>
    createGateway({
      'POST /integrations/ai-assistants/apikey/chatgpt': connect,
      'POST /integrations/ai-assistants/verify/chatgpt': verify,
      'GET /integrations/ai-assistants/providers': { ok: true, providers: PROVIDERS },
    });

  it('a key with the wrong prefix is refused before any request', async () => {
    const gateway = routes({ ok: true, status: 'ok', latency_ms: 10 });
    renderAssistant(<AIAssistantConnectSheet open provider="chatgpt" onClose={jest.fn()} />, { supabase: createAssistantSupabase(), gateway });
    fireEvent.changeText(await screen.findByTestId('ai-connect-key'), 'pk-wrong');
    fireEvent.press(screen.getByTestId('ai-connect-submit'));
    expect(await screen.findByTestId('ai-connect-error')).toHaveTextContent('Der API-Schlüssel muss mit „sk-“ beginnen.');
    expect(gateway.writes()).toEqual([]);
  });

  it('success: POST apikey (key sent once) → POST verify → only prefix•••last4 shown, key cleared', async () => {
    const gateway = routes({ ok: true, provider: 'chatgpt', status: 'ok', http_status: 200, latency_ms: 42, error: null });
    const onClose = jest.fn();
    const { qc } = renderAssistant(<AIAssistantConnectSheet open provider="chatgpt" onClose={onClose} />, { supabase: createAssistantSupabase(), gateway });
    const invalidate = jest.spyOn(qc, 'invalidateQueries');
    expect(await screen.findByTestId('ai-connect-key')).toHaveProp('secureTextEntry', true);
    fireEvent.changeText(screen.getByTestId('ai-connect-key'), 'sk-test-secret-1234');
    fireEvent.press(screen.getByTestId('ai-connect-submit'));
    expect(await screen.findByTestId('ai-connect-success')).toBeTruthy();
    expect(gateway.writes().map((c) => [c.method, c.path, c.body])).toEqual([
      ['POST', '/integrations/ai-assistants/apikey/chatgpt', { api_key: 'sk-test-secret-1234' }],
      ['POST', '/integrations/ai-assistants/verify/chatgpt', undefined],
    ]);
    expect(screen.getByTestId('ai-connect-key-hint')).toHaveTextContent('Schlüssel sk-•••1234— verifiziert in 42ms.');
    expect(screen.queryByText(/secret/)).toBeNull();
    // Both mutations invalidate the ['ai-assistants'] queries (web qc.invalidateQueries).
    await waitFor(() => expect(invalidate.mock.calls.filter(([f]) => JSON.stringify(f) === JSON.stringify({ queryKey: ['ai-assistants'] }))).toHaveLength(2));
    fireEvent.press(screen.getByTestId('ai-connect-done'));
    expect(onClose).toHaveBeenCalled();
  });

  it.each([
    ['unauthorized', 'Der Anbieter hat diesen Schlüssel abgelehnt (nicht autorisiert). Prüfe ihn in deinem Dashboard.'],
    ['network', 'Netzwerkfehler beim Erreichen des Anbieters. Bitte versuche es noch einmal.'],
  ])('verify status %s keeps the form with the error', async (status, message) => {
    const gateway = routes({ ok: false, provider: 'chatgpt', status, http_status: 401, latency_ms: 5, error: null });
    renderAssistant(<AIAssistantConnectSheet open provider="chatgpt" onClose={jest.fn()} />, { supabase: createAssistantSupabase(), gateway });
    fireEvent.changeText(await screen.findByTestId('ai-connect-key'), 'sk-bad');
    fireEvent.press(screen.getByTestId('ai-connect-submit'));
    expect(await screen.findByTestId('ai-connect-error')).toHaveTextContent(message);
    expect(screen.getByTestId('ai-connect-key')).toBeTruthy();
    expect(screen.queryByTestId('ai-connect-success')).toBeNull();
  });

  it('a failed connect call shows its error code; verify is never called', async () => {
    const gateway = routes({ ok: true, status: 'ok', latency_ms: 1 }, { __status: 400, __body: { ok: false, error: 'INVALID_KEY_FORMAT' } });
    renderAssistant(<AIAssistantConnectSheet open provider="chatgpt" onClose={jest.fn()} />, { supabase: createAssistantSupabase(), gateway });
    fireEvent.changeText(await screen.findByTestId('ai-connect-key'), 'sk-x');
    fireEvent.press(screen.getByTestId('ai-connect-submit'));
    expect(await screen.findByTestId('ai-connect-error')).toHaveTextContent('Verbindung fehlgeschlagen (INVALID_KEY_FORMAT).');
    expect(gateway.writes().map((c) => c.path)).toEqual(['/integrations/ai-assistants/apikey/chatgpt']);
  });

  it('verify 5xx is a transport failure', async () => {
    const gateway = routes({ __status: 502, __body: {} });
    renderAssistant(<AIAssistantConnectSheet open provider="chatgpt" onClose={jest.fn()} />, { supabase: createAssistantSupabase(), gateway });
    fireEvent.changeText(await screen.findByTestId('ai-connect-key'), 'sk-x');
    fireEvent.press(screen.getByTestId('ai-connect-submit'));
    expect(await screen.findByTestId('ai-connect-error')).toHaveTextContent('Verbindung fehlgeschlagen (VERIFY_FAILED_502).');
  });

  it('no provider renders nothing', () => {
    renderAssistant(<AIAssistantConnectSheet open={false} provider={null} onClose={jest.fn()} />, { supabase: createAssistantSupabase() });
    expect(screen.queryByTestId('ai-connect')).toBeNull();
  });
});
