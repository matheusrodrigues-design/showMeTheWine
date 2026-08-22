import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Armazenamento sensível via Keychain (iOS) / Keystore (Android).
 * Web: sessionStorage (sem limite 2048).
 * Native: chunking automático para sessões JWT > limite do SecureStore.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** Margem abaixo do teto ~2048 do Android SecureStore */
const CHUNK_SIZE = 1800;
const CHUNK_META_PREFIX = '__CHUNKED__:';

function assertKey(key: string): void {
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(key)) {
    throw new Error('Chave de SecureStore inválida');
  }
}

function chunkKey(key: string, index: number): string {
  return `${key}__${index}`;
}

async function deleteNativeChunks(key: string, count: number): Promise<void> {
  const deletions: Promise<void>[] = [];
  for (let i = 0; i < count; i += 1) {
    deletions.push(
      SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS).catch(() => undefined),
    );
  }
  await Promise.all(deletions);
}

async function getNativeItem(key: string): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(key, OPTIONS);
  if (raw == null) return null;

  if (!raw.startsWith(CHUNK_META_PREFIX)) {
    return raw;
  }

  const count = Number.parseInt(raw.slice(CHUNK_META_PREFIX.length), 10);
  if (!Number.isFinite(count) || count <= 0 || count > 64) {
    return null;
  }

  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i), OPTIONS);
    if (part == null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function setNativeItem(key: string, value: string): Promise<void> {
  // Limpa chunks antigos (até 64) antes de reescrever
  const previous = await SecureStore.getItemAsync(key, OPTIONS);
  if (previous?.startsWith(CHUNK_META_PREFIX)) {
    const prevCount = Number.parseInt(
      previous.slice(CHUNK_META_PREFIX.length),
      10,
    );
    if (Number.isFinite(prevCount) && prevCount > 0) {
      await deleteNativeChunks(key, Math.min(prevCount, 64));
    }
  }

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value, OPTIONS);
    return;
  }

  const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
  if (chunkCount > 64) {
    throw new Error('Sessão excessivamente grande para armazenamento seguro');
  }

  for (let i = 0; i < chunkCount; i += 1) {
    const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await SecureStore.setItemAsync(chunkKey(key, i), slice, OPTIONS);
  }
  await SecureStore.setItemAsync(
    key,
    `${CHUNK_META_PREFIX}${chunkCount}`,
    OPTIONS,
  );
}

async function removeNativeItem(key: string): Promise<void> {
  const previous = await SecureStore.getItemAsync(key, OPTIONS);
  if (previous?.startsWith(CHUNK_META_PREFIX)) {
    const count = Number.parseInt(
      previous.slice(CHUNK_META_PREFIX.length),
      10,
    );
    if (Number.isFinite(count) && count > 0) {
      await deleteNativeChunks(key, Math.min(count, 64));
    }
  }
  await SecureStore.deleteItemAsync(key, OPTIONS).catch(() => undefined);
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    assertKey(key);
    if (Platform.OS === 'web') {
      return sessionStorage.getItem(key);
    }
    return getNativeItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    assertKey(key);
    if (Platform.OS === 'web') {
      // Web: sem teto de 2048 — sessionStorage aguenta a sessão Supabase completa
      sessionStorage.setItem(key, value);
      return;
    }
    await setNativeItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    assertKey(key);
    if (Platform.OS === 'web') {
      sessionStorage.removeItem(key);
      return;
    }
    await removeNativeItem(key);
  },

  async deleteItem(key: string): Promise<void> {
    return secureStorage.removeItem(key);
  },
};
