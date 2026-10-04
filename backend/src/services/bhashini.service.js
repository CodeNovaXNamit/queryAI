const config = require('../config/env');
const queueService = require('./queue.service');
const queueAdminService = require('./queueAdmin.service');

const runtimeCache = new Map();
const CONFIG_TIMEOUT_MS = 10_000;
const SYNTHESIS_TIMEOUT_MS = 20_000;
const MAX_STATUS_TEXT_LENGTH = 500;

function publicError(message, statusCode, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function ensureConfigured() {
  const { userId, apiKey, pipelineId } = config.bhashini;
  if (!userId || !apiKey || !pipelineId) {
    throw publicError(
      'Bhashini TTS is not configured. Add BHASHINI_USER_ID, BHASHINI_API_KEY, and BHASHINI_PIPELINE_ID to backend/.env.',
      503,
      'BHASHINI_NOT_CONFIGURED'
    );
  }
}

async function postJson(url, payload, headers, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const raw = await response.text();
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw publicError('Bhashini returned a non-JSON response.', 502, 'BHASHINI_BAD_RESPONSE');
      }
    }
    if (!response.ok) {
      const upstreamMessage = data?.error || data?.message || `Bhashini request failed with status ${response.status}.`;
      throw publicError(upstreamMessage, 502, 'BHASHINI_UPSTREAM_ERROR');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw publicError('Bhashini request timed out. Please try again.', 504, 'BHASHINI_TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function getRuntimeConfig(language) {
  ensureConfigured();
  const normalizedLanguage = String(language || config.bhashini.defaultLanguage || 'en').toLowerCase();
  const cacheKey = `tts:${normalizedLanguage}`;
  if (runtimeCache.has(cacheKey)) return runtimeCache.get(cacheKey);

  const payload = {
    pipelineTasks: [
      {
        taskType: 'tts',
        config: {
          language: {
            sourceLanguage: normalizedLanguage,
          },
        },
      },
    ],
    pipelineRequestConfig: {
      pipelineId: config.bhashini.pipelineId,
    },
  };

  const data = await postJson(
    config.bhashini.configUrl,
    payload,
    {
      userID: config.bhashini.userId,
      ulcaApiKey: config.bhashini.apiKey,
    },
    CONFIG_TIMEOUT_MS
  );

  const task = (data.pipelineResponseConfig || []).find(item => item.taskType === 'tts');
  const serviceConfig = (task?.config || []).find(item => item.language?.sourceLanguage === normalizedLanguage)
    || task?.config?.[0];
  const endpoint = data.pipelineInferenceAPIEndPoint || {};
  const auth = endpoint.inferenceApiKey || {};

  if (!serviceConfig?.serviceId || !endpoint.callbackUrl || !auth.name || !auth.value) {
    throw publicError(
      `Bhashini TTS is not available for language "${normalizedLanguage}" in the configured pipeline.`,
      400,
      'BHASHINI_TTS_UNAVAILABLE'
    );
  }

  const runtime = {
    language: normalizedLanguage,
    serviceId: serviceConfig.serviceId,
    callbackUrl: endpoint.callbackUrl,
    authHeaderName: auth.name,
    authHeaderValue: auth.value,
  };
  runtimeCache.set(cacheKey, runtime);
  return runtime;
}

function formatWait(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.round(safeSeconds / 60);
  if (minutes <= 0) return 'less than a minute';
  if (minutes === 1) return 'about 1 minute';
  if (minutes < 60) return `about ${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!remainder) return `about ${hours} hour${hours === 1 ? '' : 's'}`;
  return `about ${hours} hour${hours === 1 ? '' : 's'} and ${remainder} minutes`;
}

function humanizeService(service) {
  return String(service || 'general')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

async function getServiceLabel(service) {
  const queues = await queueAdminService.getActiveQueues().catch(() => []);
  const custom = queues.find(queue => queue.key === service);
  return custom?.label || humanizeService(service);
}

function buildTokenStatusText(token, serviceLabel) {
  const number = String(token.number).padStart(2, '0');
  const prefix = `Token number ${number} for ${serviceLabel}.`;

  if (token.status === 'called') {
    return `${prefix} Your number has been called. Please proceed to the counter now.`;
  }
  if (token.status === 'served') {
    return `${prefix} Your visit is complete. Thank you.`;
  }
  if (token.status === 'expired') {
    return `${prefix} This token has expired. Please request re-queue or take a new token.`;
  }

  const position = Math.max(1, Number(token.positionInQueue) || 1);
  const peopleAhead = Math.max(0, Number(token.peopleAhead) || 0);
  const wait = formatWait(token.estimatedWaitSeconds);
  const aheadPhrase = peopleAhead === 0
    ? 'You are next in line.'
    : `${peopleAhead} ${peopleAhead === 1 ? 'person is' : 'people are'} ahead of you.`;
  return `${prefix} You are waiting at position ${position}. ${aheadPhrase} Approximate wait time is ${wait}.`;
}

function extractTtsAudio(data) {
  const responseItems = Array.isArray(data.pipelineResponse)
    ? data.pipelineResponse
    : (data.taskType ? [data] : []);
  const tts = responseItems.find(item => item.taskType === 'tts') || responseItems[0];
  const audioContent = tts?.audio?.[0]?.audioContent;
  if (!audioContent) {
    throw publicError('Bhashini did not return audio content.', 502, 'BHASHINI_AUDIO_MISSING');
  }
  const format = tts?.config?.audioFormat || 'wav';
  return {
    audioContent,
    format,
    mimeType: format === 'mp3' ? 'audio/mpeg' : `audio/${format}`,
  };
}

async function synthesizeTokenStatus({ tokenId, language, gender }) {
  const token = await queueService.getTokenStatus(tokenId);
  const serviceLabel = await getServiceLabel(token.service);
  const text = buildTokenStatusText(token, serviceLabel).slice(0, MAX_STATUS_TEXT_LENGTH);
  const selectedLanguage = String(language || config.bhashini.defaultLanguage || 'en').toLowerCase();
  const selectedGender = gender || config.bhashini.defaultGender || 'female';
  const runtime = await getRuntimeConfig(selectedLanguage);

  const payload = {
    pipelineTasks: [
      {
        taskType: 'tts',
        config: {
          language: {
            sourceLanguage: selectedLanguage,
          },
          serviceId: runtime.serviceId,
          gender: selectedGender,
        },
      },
    ],
    inputData: {
      input: [
        {
          source: text,
        },
      ],
      audio: [
        {
          audioContent: null,
        },
      ],
    },
  };

  const data = await postJson(
    runtime.callbackUrl,
    payload,
    {
      [runtime.authHeaderName]: runtime.authHeaderValue,
    },
    SYNTHESIS_TIMEOUT_MS
  );
  const audio = extractTtsAudio(data);
  return {
    provider: 'bhashini',
    text,
    language: selectedLanguage,
    gender: selectedGender,
    ...audio,
  };
}

module.exports = {
  synthesizeTokenStatus,
  buildTokenStatusText,
};
