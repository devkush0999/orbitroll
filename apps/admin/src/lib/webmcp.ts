'use client';
import { useEffect } from 'react';
import { backend, result } from './supabase';
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => Promise<unknown>;
};
export function useAdminTools(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    const tool: Tool = {
      name: 'read_recent_orbit_roll_runs',
      description:
        'Read the current administrator’s recent verified game runs and audit history. Does not moderate or publish anything.',
      inputSchema: {
        type: 'object',
        properties: { offset: { type: 'integer', minimum: 0, maximum: 10000 } },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input))
          throw new Error('Expected an object.');
        const args = input as Record<string, unknown>;
        const offset = args.offset ?? 0;
        if (
          Object.keys(args).some((key) => key !== 'offset') ||
          typeof offset !== 'number' ||
          !Number.isInteger(offset) ||
          offset < 0 ||
          offset > 10000
        )
          throw new Error('Invalid offset.');
        return result(backend().rpc('admin_overview', { p_offset: offset }));
      },
    };
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [enabled]);
}
