import type { FeedbackPayload, FeedbackResponse, FeedbackMetadata } from '../types/feedback';

/**
 * Returns privacy-preserving client metadata.
 * Never accesses user workspace inputs, files, tokens, or clipboard.
 */
export function getTechnicalMetadata(activeToolName?: string): FeedbackMetadata {
  return {
    tool: activeToolName || undefined,
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown',
    theme:
      typeof document !== 'undefined'
        ? document.documentElement.getAttribute('data-theme') || 'default'
        : 'default',
    appVersion: '1.0.0',
  };
}

/**
 * Formats feedback into clean GitHub-flavored markdown for clipboard export.
 */
export function formatFeedbackAsMarkdown(payload: FeedbackPayload): string {
  const categoryLabels = {
    feature: '💡 Feature Request',
    'tool-request': '🛠️ New Tool Suggestion',
    bug: '🐛 Bug Report',
    general: '💬 General Feedback',
  };

  const lines = [
    `### ${categoryLabels[payload.category] || payload.category}: ${payload.title}`,
    '',
    '**Description:**',
    payload.description,
    '',
  ];

  if (payload.rating) {
    lines.push(`**Rating:** ${'⭐'.repeat(payload.rating)} (${payload.rating}/5)`, '');
  }

  if (payload.email) {
    lines.push(`**Contact Email:** ${payload.email}`, '');
  }

  if (payload.metadata) {
    lines.push(
      '---',
      '<details>',
      '<summary>Diagnostic Metadata (Non-sensitive)</summary>',
      '',
      `- **Active Tool:** ${payload.metadata.tool || 'None'}`,
      `- **Route:** \`${payload.metadata.path}\``,
      `- **Screen:** ${payload.metadata.screenSize}`,
      `- **Theme:** ${payload.metadata.theme}`,
      `- **User Agent:** \`${payload.metadata.userAgent}\``,
      `- **App Version:** ${payload.metadata.appVersion}`,
      `- **Timestamp:** ${payload.timestamp}`,
      '</details>',
      ''
    );
  }

  return lines.join('\n');
}

/**
 * Directly submits feedback payload to the serverless API or configured webhook.
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  const endpoint = import.meta.env.VITE_FEEDBACK_API_URL || '/api/feedback';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    let bodyPayload: unknown = payload;

    // Detect Discord webhook URL
    if (endpoint.includes('discord.com/api/webhooks')) {
      const colorMap: Record<string, number> = {
        feature: 0x8b7cf7, // primary purple
        'tool-request': 0x0ea5e9, // cyan
        bug: 0xef4444, // red
        general: 0x10b981, // green
      };

      bodyPayload = {
        username: 'ZeroDock Feedback Bot',
        avatar_url: 'https://zerodock.jayradadiya.workers.dev/favicon.svg',
        embeds: [
          {
            title: `[${payload.category.toUpperCase()}] ${payload.title}`,
            description: payload.description,
            color: colorMap[payload.category] || 0x6c5ce7,
            fields: [
              ...(payload.rating ? [{ name: 'Rating', value: `${payload.rating}/5 ⭐`, inline: true }] : []),
              ...(payload.email ? [{ name: 'Contact', value: payload.email, inline: true }] : []),
              ...(payload.metadata?.tool ? [{ name: 'Tool', value: payload.metadata.tool, inline: true }] : []),
              ...(payload.metadata?.path ? [{ name: 'Path', value: payload.metadata.path, inline: true }] : []),
              ...(payload.metadata?.screenSize ? [{ name: 'Screen', value: payload.metadata.screenSize, inline: true }] : []),
            ],
            footer: {
              text: `ZeroDock v${payload.metadata?.appVersion || '1.0.0'} · ${payload.timestamp}`,
            },
          },
        ],
      };
    } else if (endpoint.includes('hooks.slack.com')) {
      // Detect Slack webhook URL
      bodyPayload = {
        text: `*ZeroDock Feedback [${payload.category.toUpperCase()}]*: *${payload.title}*\n${payload.description}\n_Contact: ${payload.email || 'Anonymous'}_`,
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // In dev mode, if the API endpoint isn't set up yet, simulate success so local testing works
      if (import.meta.env.DEV && response.status === 404) {
        console.warn(
          '[ZeroDock Dev Feedback]: Endpoint returned 404. Falling back to local console mock:',
          payload
        );
        return {
          success: true,
          message: 'Feedback received in development mode.',
        };
      }

      const errorText = await response.text().catch(() => 'Server error');
      throw new Error(`Submission failed (HTTP ${response.status}): ${errorText}`);
    }

    const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      success: true,
      message: (result?.message as string) || 'Thank you! Your feedback has been received.',
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Feedback submission timed out. Please check your internet connection.', {
        cause: err,
      });
    }

    const errorMsg = err instanceof Error ? err.message : String(err);

    // In local development, if network failed or endpoint refused connection, simulate success for preview
    if (import.meta.env.DEV && (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError'))) {
      console.warn(
        '[ZeroDock Dev Feedback]: Network fetch failed. Simulating local dev success for testing:',
        payload
      );
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        success: true,
        message: 'Feedback received in local development preview mode.',
      };
    }

    throw err instanceof Error ? err : new Error(String(err));
  }
}
