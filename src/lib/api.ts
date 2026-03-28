export interface GenerateSkillRequest {
  runId: string;
  messages: Array<Record<string, unknown>>;
  current_skill_yaml?: string;
  context?: Record<string, unknown>;
}

export interface BackendStreamEvent {
  type:
    | 'run_started'
    | 'session_event'
    | 'run_complete'
    | 'run_error';
  run_id: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  const configuredPort = (import.meta.env.VITE_API_PORT as string | undefined)?.trim() ?? '8082';

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${configuredPort}/api`;
  }

  return `http://127.0.0.1:${configuredPort}/api`;
};

const resolveWsBaseUrl = () => {
  const configuredBaseUrl = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
};

const apiBaseUrl = resolveApiBaseUrl();
const wsBaseUrl = resolveWsBaseUrl();

export const streamSkillGeneration = (
  payload: GenerateSkillRequest,
  onEvent: (event: BackendStreamEvent) => void,
) =>
  new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(`${wsBaseUrl}/agent-run`);
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      fn();
    };

    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          type: 'start_run',
          run_id: payload.runId,
          messages: payload.messages,
          current_skill_yaml: payload.current_skill_yaml ?? '',
          context: payload.context ?? {},
        }),
      );
    });

    socket.addEventListener('message', (message) => {
      const event = JSON.parse(String(message.data)) as BackendStreamEvent;
      onEvent(event);

      if (event.type === 'run_complete') {
        finish(() => {
          socket.close();
          resolve();
        });
      }

      if (event.type === 'run_error') {
        const detail = typeof event.payload?.detail === 'string' ? event.payload.detail : null;
        const errorMessage = typeof event.payload?.message === 'string' ? event.payload.message : 'Agent run failed.';
        finish(() => {
          socket.close();
          reject(new Error(detail ? `${errorMessage} ${detail}` : errorMessage));
        });
      }
    });

    socket.addEventListener('error', () => {
      finish(() => {
        socket.close();
        reject(new Error('WebSocket connection failed.'));
      });
    });

    socket.addEventListener('close', (event) => {
      if (settled) {
        return;
      }
      finish(() => {
        reject(new Error(event.reason || 'WebSocket closed before the run completed.'));
      });
    });
  });

export const requestBackendHealth = async () => {
  const response = await fetch(`${apiBaseUrl}/health`);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? 'Backend health request failed.');
  }

  return data as { ok: boolean };
};
