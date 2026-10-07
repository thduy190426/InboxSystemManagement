import localforage from 'localforage'
import type {
  StorageType,
  Direction,
  SessionRecordType,
  KeyPairType
} from '@privacyresearch/libsignal-protocol-typescript'
import { SignalProtocolAddress } from '@privacyresearch/libsignal-protocol-typescript'

/**
 * An implementation of the Signal Protocol Store interface backed by localforage (IndexedDB).
 */
export class IndexedDBSignalProtocolStore implements StorageType {
  private store: LocalForage

  constructor() {
    this.store = localforage.createInstance({
      name: 'InboxSystemE2EE',
      storeName: 'signal_store'
    })
  }

  // Helper methods for typed storage
  private async get<T>(key: string): Promise<T | undefined> {
    const value = await this.store.getItem<T>(key)
    if (value === null) return undefined
    return value
  }

  private async put<T>(key: string, value: T): Promise<void> {
    await this.store.setItem(key, value)
  }

  private async remove(key: string): Promise<void> {
    await this.store.removeItem(key)
  }

  // Identity Keys
  async getIdentityKeyPair(): Promise<any> {
    return this.get('identityKey')
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    return this.get<number>('registrationId')
  }

  async putIdentityKeyPair(keyPair: any): Promise<void> {
    await this.put('identityKey', keyPair)
  }

  async putLocalRegistrationId(id: number): Promise<void> {
    await this.put('registrationId', id)
  }

  async isTrustedIdentity(
    identifier: string,
    identityKey: ArrayBuffer,
    _direction: Direction
  ): Promise<boolean> {
    if (identifier === null || identifier === undefined) {
      throw new Error('tried to check identity key for undefined/null key')
    }
    const trusted = await this.get<ArrayBuffer>('identityKey' + identifier)
    if (trusted === undefined) {
      return true
    }
    return Promise.resolve(this.arrayBufferToString(identityKey) === this.arrayBufferToString(trusted))
  }

  async loadIdentityKey(identifier: string): Promise<ArrayBuffer | undefined> {
    if (identifier === null || identifier === undefined) {
      throw new Error('Tried to get identity key for undefined/null key')
    }
    return this.get<ArrayBuffer>('identityKey' + identifier)
  }

  async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
    if (identifier === null || identifier === undefined) {
      throw new Error('Tried to put identity key for undefined/null key')
    }

    const address = SignalProtocolAddress.fromString(identifier)
    const existing = await this.get<ArrayBuffer>('identityKey' + address.getName())
    await this.put('identityKey' + address.getName(), identityKey)

    if (existing && this.arrayBufferToString(identityKey) !== this.arrayBufferToString(existing)) {
      return true
    } else {
      return false
    }
  }

  // PreKeys
  async loadPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    let res = await this.get<KeyPairType>('25519KeypreKey' + keyId)
    if (res !== undefined) {
      res = { pubKey: res.pubKey, privKey: res.privKey }
    }
    return res
  }

  async storePreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    return this.put('25519KeypreKey' + keyId, keyPair)
  }

  async removePreKey(keyId: string | number): Promise<void> {
    return this.remove('25519KeypreKey' + keyId)
  }

  // Signed PreKeys
  async loadSignedPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    let res = await this.get<KeyPairType>('25519KeysignedKey' + keyId)
    if (res !== undefined) {
      res = { pubKey: res.pubKey, privKey: res.privKey }
    }
    return res
  }

  async storeSignedPreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    return this.put('25519KeysignedKey' + keyId, keyPair)
  }

  async removeSignedPreKey(keyId: string | number): Promise<void> {
    return this.remove('25519KeysignedKey' + keyId)
  }

  // Sessions
  async loadSession(identifier: string): Promise<SessionRecordType | undefined> {
    return this.get<SessionRecordType>('session' + identifier)
  }

  async storeSession(identifier: string, record: SessionRecordType): Promise<void> {
    return this.put('session' + identifier, record)
  }

  async removeSession(identifier: string): Promise<void> {
    return this.remove('session' + identifier)
  }

  async removeAllSessions(identifier: string): Promise<void> {
    const keys = await this.store.keys()
    for (const key of keys) {
      if (key.startsWith('session' + identifier)) {
        await this.store.removeItem(key)
      }
    }
  }

  private arrayBufferToString(b: ArrayBuffer): string {
    return uint8ArrayToString(new Uint8Array(b))
  }
}

export function uint8ArrayToString(arr: Uint8Array): string {
  let end = arr.length
  let begin = 0
  if (begin === end) return ''
  let chars: number[] = []
  const parts: string[] = []
  while (begin < end) {
    chars.push(arr[begin++])
    if (chars.length >= 1024) {
      parts.push(String.fromCharCode.apply(null, chars))
      chars = []
    }
  }
  return parts.join('') + String.fromCharCode.apply(null, chars)
}

export function stringToUint8Array(str: string): Uint8Array {
  const b = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    b[i] = str.charCodeAt(i)
  }
  return b
}
