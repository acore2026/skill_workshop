export interface GenerateSkillRequest {
  runId: string;
  messages: Array<Record<string, unknown>>;
  current_skill_markdown?: string;
  reasoning_enabled?: boolean;
  context?: Record<string, unknown>;
}

export interface ToolCatalogParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ToolCatalogEntry {
  name: string;
  description: string;
  required_params: string[];
  all_params: string[];
  parameters: ToolCatalogParameter[];
}

export interface ToolCatalogResponse {
  tools: ToolCatalogEntry[];
  tool_names: string[];
  by_name: Record<string, ToolCatalogEntry>;
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

const getEnv = (key: string) => {
  const metaEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return metaEnv?.[key]?.trim();
};

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = getEnv('VITE_API_BASE_URL');
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  const configuredPort = getEnv('VITE_API_PORT') ?? '8082';

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${configuredPort}/api`;
  }

  return `http://127.0.0.1:${configuredPort}/api`;
};

const resolveWsBaseUrl = () => {
  const configuredBaseUrl = getEnv('VITE_WS_BASE_URL');
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
          current_skill_markdown: payload.current_skill_markdown ?? '',
          reasoning_enabled: payload.reasoning_enabled ?? true,
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

export const requestToolCatalog = async () => {
  const response = await fetch(`${apiBaseUrl}/tools`);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? 'Tool catalog request failed.');
  }

  return data as ToolCatalogResponse;
};
