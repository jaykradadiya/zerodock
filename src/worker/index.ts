interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  FEEDBACK_WEBHOOK_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route: POST /api/feedback
    if (url.pathname === '/api/feedback' && request.method === 'POST') {
      try {
        const body = (await request.json()) as Record<string, unknown>;

        if (!body || typeof body !== 'object') {
          return new Response(JSON.stringify({ error: 'Invalid payload' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // If a destination webhook URL is configured in Cloudflare environment
        if (env.FEEDBACK_WEBHOOK_URL) {
          try {
            await fetch(env.FEEDBACK_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
          } catch (webhookErr) {
            console.error('[ZeroDock Feedback] Webhook forward error:', webhookErr);
          }
        } else {
          // Cloudflare Workers Observability captures console logs
          console.log('[ZeroDock Feedback Received]', JSON.stringify(body));
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Feedback received successfully. Thank you!',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Default: Delegate to Cloudflare static asset fetcher
    return env.ASSETS.fetch(request);
  },
};
