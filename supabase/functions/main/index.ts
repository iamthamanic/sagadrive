/**
 * main — Edge Runtime dispatcher for all supabase/functions/* workers.
 * Location: supabase/functions/main/index.ts
 *
 * Expected path: /<function-name>/…
 * Also accepts /functions/v1/<function-name>/… if a proxy forgot to strip.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

declare const EdgeRuntime: {
  userWorkers: {
    create: (opts: {
      servicePath: string;
      memoryLimitMb?: number;
      workerTimeoutMs?: number;
      noModuleCache?: boolean;
      importMapPath?: string | null;
      envVars?: Array<[string, string]>;
    }) => Promise<{ fetch: (req: Request) => Promise<Response> }>;
  };
};

const BLOCKED = new Set(['main', '_shared']);

function resolveServiceName(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  if (segments[0] === 'functions' && segments[1] === 'v1') {
    return segments[2] ?? null;
  }
  return segments[0] ?? null;
}

console.log('SagaDrive edge main dispatcher started');

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const serviceName = resolveServiceName(url.pathname);

    if (!serviceName) {
      return new Response(JSON.stringify({ error: 'missing function name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (BLOCKED.has(serviceName) || serviceName.includes('..')) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const servicePath = `/home/deno/functions/${serviceName}`;
    const envVarsObj = {
      ...Deno.env.toObject(),
      SUPABASE_FUNCTION_SLUG: serviceName,
    };
    const envVars = Object.entries(envVarsObj) as Array<[string, string]>;

    const worker = await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb: 256,
      workerTimeoutMs: 5 * 60 * 1000,
      noModuleCache: false,
      importMapPath: '/home/deno/import_map.json',
      envVars,
    });

    return await worker.fetch(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('edge main dispatch failed', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
