import {
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
} from '@privacyresearch/libsignal-protocol-typescript'
import { keyManager } from './KeyManager'
import { requestJson } from '../../services/api/apiClient'

// A wrapper to handle E2EE message encryption and decryption
export class E2EEEngine {
  private static instance = new E2EEEngine()

  static getInstance() {
    return this.instance
  }

  /**
   * Encrypts a message for a specific remote user.
   * If a session does not exist, it will fetch the user's PreKey bundle from the backend and build a session.
   */
  async encryptMessage(remoteUserId: string | number, plaintext: string) {
    const store = await keyManager.getStore()
    const address = new SignalProtocolAddress(remoteUserId.toString(), 1)
    
    // Check if we already have an active session
    let session = await store.loadSession(address.toString())
    if (!session) {
      await this.establishSession(address, remoteUserId)
    }

    const cipher = new SessionCipher(store, address)
    
    // Convert string to array buffer
    const textEncoder = new TextEncoder()
    const plaintextBuffer = textEncoder.encode(plaintext)
    
    // Encrypt
    const ciphertext = await cipher.encrypt(plaintextBuffer.buffer)
    
    // ciphertext contains { type: number, body: string, registrationId: number }
    return ciphertext
  }

  /**
   * Decrypts an incoming message from a remote user.
   */
  async decryptMessage(remoteUserId: string | number, type: number, ciphertextBody: string) {
    const store = await keyManager.getStore()
    const address = new SignalProtocolAddress(remoteUserId.toString(), 1)
    
    const cipher = new SessionCipher(store, address)
    
    let plaintextBuffer: ArrayBuffer
    if (type === 3) {
      // PreKeySignalMessage
      plaintextBuffer = await cipher.decryptPreKeyWhisperMessage(ciphertextBody, 'binary')
    } else if (type === 1) {
      // SignalMessage
      plaintextBuffer = await cipher.decryptWhisperMessage(ciphertextBody, 'binary')
    } else {
      throw new Error('Unknown message type: ' + type)
    }
    
    const textDecoder = new TextDecoder()
    return textDecoder.decode(plaintextBuffer)
  }

  /**
   * Fetches the PreKey bundle from the backend and establishes a session.
   */
  private async establishSession(address: SignalProtocolAddress, remoteUserId: string | number) {
    // Fetch the remote user's keys from the server
    const bundleResponse = await requestJson<{
      identityKey: string
      registrationId: number
      signedPreKey: { keyId: number, publicKey: string, signature: string }
      oneTimePreKey?: { keyId: number, publicKey: string }
    }>(`/e2ee/keys/${remoteUserId}`)

    if (!bundleResponse) {
      throw new Error(`Failed to fetch key bundle for user ${remoteUserId}`)
    }

    // Convert base64 strings back to ArrayBuffer
    const toBuffer = (b64: string) => {
      const binary = window.atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes.buffer
    }

    const preKeyBundle: any = {
      identityKey: toBuffer(bundleResponse.identityKey),
      registrationId: bundleResponse.registrationId,
      signedPreKey: {
        keyId: bundleResponse.signedPreKey.keyId,
        publicKey: toBuffer(bundleResponse.signedPreKey.publicKey),
        signature: toBuffer(bundleResponse.signedPreKey.signature)
      }
    }

    if (bundleResponse.oneTimePreKey) {
      preKeyBundle.preKey = {
        keyId: bundleResponse.oneTimePreKey.keyId,
        publicKey: toBuffer(bundleResponse.oneTimePreKey.publicKey)
      }
    }

    const store = await keyManager.getStore()
    const builder = new SessionBuilder(store, address)
    await builder.processPreKey(preKeyBundle)
  }
}

export const e2eeEngine = E2EEEngine.getInstance()
