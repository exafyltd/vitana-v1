/**
 * VTID-04765: account deletion erases every table that holds the user's rows.
 *
 * request-account-deletion calls the `erase_user_data(p_user_id)` RPC
 * (vitana-platform migration 20261001120000) before it deletes the auth user.
 * The RPC finds every public table with a uuid `user_id` itself, so memory,
 * diary and health tables are covered without this file keeping a list.
 *
 * The one rule this module owns: the auth user is deleted only when the
 * erasure finished without errors. Deleting the account while rows remain
 * would leave personal data behind with no account left to erase it from.
 *
 * Deploy order: the migration lands first. Until it does, PostgREST answers
 * PGRST202 ("function not found"); that case keeps the pre-VTID-04765
 * behaviour (hand-kept table list only) and is logged loudly, so shipping
 * the edge function first never blocks a member from deleting their account.
 */

export interface EraseRpcError {
  code?: string;
  message?: string;
}

export interface EraseResult {
  deleted?: Record<string, number>;
  retained?: string[];
  errors?: Record<string, string>;
  passes?: number;
}

export type EraseDecision =
  | { proceed: true; erased: boolean; detail: string }
  | { proceed: false; detail: string };

const FUNCTION_MISSING_CODES = new Set(['PGRST202', '42883']);

export function decideAfterErase(
  error: EraseRpcError | null | undefined,
  result: EraseResult | null | undefined,
): EraseDecision {
  if (error) {
    if (error.code && FUNCTION_MISSING_CODES.has(error.code)) {
      return {
        proceed: true,
        erased: false,
        detail: `erase_user_data not deployed (${error.code}); only the hand-kept table list was erased`,
      };
    }
    return { proceed: false, detail: `erase_user_data failed: ${error.message || error.code || 'unknown error'}` };
  }
  if (!result || typeof result !== 'object') {
    return { proceed: false, detail: 'erase_user_data returned no result' };
  }
  const failed = Object.keys(result.errors || {});
  if (failed.length > 0) {
    return { proceed: false, detail: `erase_user_data could not erase: ${failed.join(', ')}` };
  }
  const tables = Object.keys(result.deleted || {}).length;
  const rows = Object.values(result.deleted || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  return { proceed: true, erased: true, detail: `erased ${rows} rows from ${tables} tables` };
}
