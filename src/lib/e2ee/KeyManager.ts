import {
  KeyHelper
} from '@privacyresearch/libsignal-protocol-typescript'
import { IndexedDBSignalProtocolStore } from './SignalProtocolStore'
import { requestJson } from '../../services/api/apiClient'

export class E2EEKeyManager {
  private store: IndexedDBSignalProtocolStore
  private initialized: boolean = false

  constructor() {
    this.store = new IndexedDBSignalProtocolStore()
  }

  async getStore() {
    return this.store
  }

  async initializeKeysIfNeeded(): Promise<void> {
    const existingRegistrationId = await this.store.getLocalRegistrationId()
    if (existingRegistrationId !== undefined) {
      this.initialized = true
      return
    }

    // Generate keys
    const registrationId = KeyHelper.generateRegistrationId()
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair()

    await this.store.putLocalRegistrationId(registrationId)
    await this.store.putIdentityKeyPair(identityKeyPair)

    // Generate PreKeys
    const preKeyIdStart = 1
    const preKeyCount = 100
    const preKeys = await Promise.all(
      Array.from({ length: preKeyCount }, (_, i) => 
        KeyHelper.generatePreKey(preKeyIdStart + i)
      )
    )

    for (const preKey of preKeys) {
      await this.store.storePreKey(preKey.keyId, preKey.keyPair)
    }

    // Generate Signed PreKey
    const signedPreKeyId = 1
    const signedPreKey = await KeyHelper.generateSignedPreKey(
      identityKeyPair,
      signedPreKeyId
    )
    await this.store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair)

    // Upload keys to server
    const deviceId = 1 // In a real multi-device setup, this should be generated uniquely per login
    
    // Convert ArrayBuffers to base64 for transport
    const toBase64 = (buffer: ArrayBuffer) => {
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return window.btoa(binary)
    }

    const payload = {
      deviceId,
      registrationId,
      identityKey: toBase64(identityKeyPair.pubKey),
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: toBase64(signedPreKey.keyPair.pubKey),
        signature: toBase64(signedPreKey.signature)
      },
      oneTimePreKeys: preKeys.map(pk => ({
        keyId: pk.keyId,
        publicKey: toBase64(pk.keyPair.pubKey)
      }))
    }

    await requestJson('/e2ee/keys', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    this.initialized = true
  }

  isInitialized() {
    return this.initialized
  }
}

export const keyManager = new E2EEKeyManager()
