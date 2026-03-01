import {
  SERVER_URL,
  DEFAULT_URL,
  LATEST_URL,
  DEV_URL,
  DEV_MODE,
  TURNSTILE_SITEKEY,
  EMOJI_URL,
  NERIMITY_CDN,
  APP_VERSION,
} from '@env';

export default {
  SERVER_URL: SERVER_URL || 'https://nerimity.com',
  DEFAULT_URL: DEFAULT_URL || 'https://nerimity.com',
  LATEST_URL: LATEST_URL || 'https://latest.nerimity.com',
  DEV_URL: DEV_URL || 'http://local.nerimity.com:3000',
  APP_VERSION: APP_VERSION as string | undefined,
  DEV_MODE: DEV_MODE === 'true',
  TURNSTILE_SITEKEY: TURNSTILE_SITEKEY,
  EMOJI_URL: EMOJI_URL,
  NERIMITY_CDN: NERIMITY_CDN,
};
