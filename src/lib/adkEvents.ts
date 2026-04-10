export interface ADKFunctionCall {
  id?: string;
  name: string;
  args?: Record<string, unknown>;
}

export interface ADKFunctionResponse {
  id?: string;
  name: string;
  response?: Record<string, unknown>;
}

export interface ADKSessionEventPayload {
  id?: string;
  timestamp?: string;
  invocation_id?: string;
  author?: string;
  branch?: string;
  partial?: boolean;
  turn_complete?: boolean;
  final_response?: boolean;
  text?: string;
  thought?: string;
  function_calls?: ADKFunctionCall[];
  function_responses?: ADKFunctionResponse[];
  data?: Record<string, unknown>;
  state_delta?: Record<string, unknown>;
  long_running_tool_ids?: string[];
}

const functionCallMarkupPattern = /<function_calls>[\s\S]*?<\/function_calls>/gi;
const invokePattern = /<invoke\s+name="([^"]+)">\s*([\s\S]*?)\s*<\/invoke>/gi;
const parameterPattern = /<parameter\s+name="([^"]+)">\s*([\s\S]*?)\s*<\/parameter>/gi;

export const getADKMessageId = (payload: ADKSessionEventPayload) =>
  [payload.author || 'assistant', payload.invocation_id || payload.id || `session-${Math.random().toString(36).slice(2)}`].join(':');

export const getADKDisplayText = (payload: ADKSessionEventPayload) => {
  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  if (text) {
    return stripFunctionCallMarkup(text);
  }
  return '';
};

export const getADKThoughtText = (payload: ADKSessionEventPayload) => {
  const thought = typeof payload.thought === 'string' ? payload.thought.trim() : '';
  if (thought) {
    return stripFunctionCallMarkup(thought);
  }
  return '';
};

export const getADKStage = (payload: ADKSessionEventPayload) => {
  switch ((payload.author || '').trim()) {
    case 'intent_analysis_agent':
      return 'analysis';
    case 'skill_writer_agent':
      return 'writer';
    case 'markdown_format_checker_agent':
      return 'checker';
    default:
      return 'run';
  }
};

export const getSkillInstallFromFunctionCall = (call: ADKFunctionCall) => {
  if (call.name !== 'install_skill_package') {
    return null;
  }
  const name = typeof call.args?.name === 'string' ? call.args.name : '6gcore_skill_creater';
  const version = typeof call.args?.version === 'string' ? call.args.version : 'latest';
  return { name, version };
};

export const summarizeFunctionResponse = (response: ADKFunctionResponse) => {
  const summary = response.response?.summary;
  if (typeof summary === 'string' && summary.trim()) {
    return summary;
  }
  const output = response.response?.output;
  if (output && typeof output === 'object') {
    const outputSummary = (output as Record<string, unknown>).summary;
    if (typeof outputSummary === 'string' && outputSummary.trim()) {
      return outputSummary;
    }
  }
  return `${response.name} completed.`;
};

export const extractYamlBlockFromText = (text: string) => {
  const match = text.match(/```yaml\s*([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? '';
};

export const stripYamlBlockFromText = (text: string) => text.replace(/```yaml\s*[\s\S]*?```/gi, '').trim();

export const stripFunctionCallMarkup = (text: string) => text.replace(functionCallMarkupPattern, '').trim();

export const extractFunctionCallsFromMarkup = (text: string): ADKFunctionCall[] => {
  const calls: ADKFunctionCall[] = [];
  for (const invokeMatch of text.matchAll(invokePattern)) {
    const args: Record<string, unknown> = {};
    for (const parameterMatch of invokeMatch[2].matchAll(parameterPattern)) {
      args[parameterMatch[1]] = parameterMatch[2].trim();
    }
    calls.push({
      name: invokeMatch[1].trim(),
      args,
    });
  }
  return calls;
};
