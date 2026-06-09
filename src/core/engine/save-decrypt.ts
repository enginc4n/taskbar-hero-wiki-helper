export const DEFAULT_ES3_PASSWORD = 'emuMqG3bLYJ938ZDCfieWJ';

const ERROR_MESSAGES: Record<string, string> = {
  file_too_small: 'File is too small to be an .es3 save.',
  decryption_failed:
    'Decryption failed: wrong password or not a TaskbarHero save. The password can change after a game update.',
  invalid_json: 'Decrypted data is not valid JSON.',
};

export class SaveFileError extends Error {
  code: string;
  constructor(code: keyof typeof ERROR_MESSAGES) {
    super(ERROR_MESSAGES[code]);
    this.name = 'SaveFileError';
    this.code = code;
  }
}

export function isSaveFileError(err: unknown): err is SaveFileError {
  return err instanceof SaveFileError;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100, hash: 'SHA-1' },
    keyMaterial,
    { name: 'AES-CBC', length: 128 },
    false,
    ['decrypt'],
  );
}

async function decryptBytes(buffer: ArrayBuffer, password = DEFAULT_ES3_PASSWORD): Promise<string> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length <= 16) throw new SaveFileError('file_too_small');

  const saltIv = bytes.slice(0, 16);
  const ciphertext = bytes.slice(16);
  const key = await deriveKey(password, saltIv);

  let decrypted: ArrayBuffer;
  try {
    decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: saltIv }, key, ciphertext);
  } catch {
    throw new SaveFileError('decryption_failed');
  }

  return new TextDecoder('utf-8').decode(decrypted);
}

function unwrapEs3(value: unknown): unknown {
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value: unknown }).value;
    if (typeof inner === 'string') {
      const trimmed = inner.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          return inner;
        }
      }
      return inner;
    }
    return inner;
  }
  return value;
}

function parseSaveJson(text: string) {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SaveFileError('invalid_json');
  }

  return {
    PlayerSaveData: unwrapEs3(parsed.PlayerSaveData) as import('../types').PlayerSaveData,
    AccountSaveData: unwrapEs3(parsed.AccountSaveData),
    SystemInfo: unwrapEs3(parsed.SystemInfo),
    _raw: parsed,
  };
}

export async function parseSaveFile(buffer: ArrayBuffer, password = DEFAULT_ES3_PASSWORD) {
  const text = await decryptBytes(buffer, password.trim() || DEFAULT_ES3_PASSWORD);
  return parseSaveJson(text);
}
