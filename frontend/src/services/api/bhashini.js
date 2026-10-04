import { api } from './client.js';

export const apiSpeakTokenStatus = (tokenId, options = {}) =>
  api.post('/bhashini/token-status-tts', {
    tokenId,
    language: options.language || 'en',
    gender: options.gender || 'female',
  }).then(r => r.data);
