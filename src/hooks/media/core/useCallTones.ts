import { useRef } from 'react'

type RingbackTone = {
  context: AudioContext
  gain: GainNode
  oscillators: OscillatorNode[]
  timerId: number
}

type AudioWindow = Window & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

const LOCAL_FINISH_TONE_NOTES = [660, 440]
const REMOTE_FINISH_TONE_NOTES = [520, 390, 260]

export function useCallTones() {
  const ringbackToneRef = useRef<RingbackTone | null>(null)
  const customRingtoneRef = useRef<HTMLAudioElement | null>(null)
  const hasPlayedFinishToneRef = useRef(false)
  const hasPlayedConnectedToneRef = useRef(false)

  function startRingbackTone(direction: 'incoming' | 'outgoing', callerName: string) {
    if (direction === 'incoming') {
      const customRingtones: Record<string, string> = {
        // 'Trần Hoàng Duy': '/audio/TDuy.mp3',
        // 'Bảo Nghi': '/audio/BNghi.mp3',
      }
      
      const ringtonePath = customRingtones[callerName]
      if (ringtonePath) {
        if (customRingtoneRef.current) return
        const audio = new Audio(ringtonePath)
        audio.loop = true
        audio.play().catch(() => undefined)
        customRingtoneRef.current = audio
      }
      return
    }

    if (ringbackToneRef.current || typeof AudioContext === 'undefined') {
      return
    }

    const audioWindow = window as AudioWindow
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext
    if (!AudioContextConstructor) {
      return
    }

    const context = new AudioContextConstructor()
    const gain = context.createGain()
    const oscillators = [context.createOscillator(), context.createOscillator()]
    const setAudible = (isAudible: boolean) => {
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.gain.setTargetAtTime(isAudible ? 0.055 : 0.0001, context.currentTime, 0.025)
    }

    oscillators[0].frequency.value = 440
    oscillators[1].frequency.value = 480
    oscillators.forEach((oscillator) => {
      oscillator.type = 'sine'
      oscillator.connect(gain)
      oscillator.start()
    })
    gain.gain.value = 0.0001
    gain.connect(context.destination)

    let isAudible = false
    const pulseTone = () => {
      isAudible = !isAudible
      setAudible(isAudible)
    }

    pulseTone()
    const timerId = window.setInterval(pulseTone, 2000)
    ringbackToneRef.current = { context, gain, oscillators, timerId }

    context.resume().catch(() => undefined)
  }

  function stopRingbackTone() {
    if (customRingtoneRef.current) {
      customRingtoneRef.current.pause()
      customRingtoneRef.current.currentTime = 0
      customRingtoneRef.current = null
    }

    const ringbackTone = ringbackToneRef.current
    if (!ringbackTone) {
      return
    }

    window.clearInterval(ringbackTone.timerId)
    ringbackTone.gain.gain.setTargetAtTime(0.0001, ringbackTone.context.currentTime, 0.02)
    ringbackTone.oscillators.forEach((oscillator) => {
      oscillator.stop(ringbackTone.context.currentTime + 0.04)
    })
    window.setTimeout(() => {
      ringbackTone.context.close().catch(() => undefined)
    }, 80)
    ringbackToneRef.current = null
  }

  function playToneSequence(notes: number[], noteDuration = 0.13) {
    const audioWindow = window as AudioWindow
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext
    if (!AudioContextConstructor) {
      return
    }

    const context = new AudioContextConstructor()
    const gain = context.createGain()
    gain.gain.value = 0.0001
    gain.connect(context.destination)

    notes.forEach((frequency, index) => {
      const startAt = context.currentTime + index * noteDuration
      const oscillator = context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      oscillator.connect(gain)
      gain.gain.setTargetAtTime(0.075, startAt, 0.012)
      gain.gain.setTargetAtTime(0.0001, startAt + noteDuration * 0.72, 0.018)
      oscillator.start(startAt)
      oscillator.stop(startAt + noteDuration)
    })

    context.resume().catch(() => undefined)
    window.setTimeout(() => {
      context.close().catch(() => undefined)
    }, notes.length * noteDuration * 1000 + 160)
  }

  function playFinishTone(source: 'local' | 'remote') {
    if (hasPlayedFinishToneRef.current) {
      return
    }

    hasPlayedFinishToneRef.current = true
    stopRingbackTone()
    playToneSequence(source === 'local' ? LOCAL_FINISH_TONE_NOTES : REMOTE_FINISH_TONE_NOTES)
  }

  return {
    ringbackToneRef,
    customRingtoneRef,
    hasPlayedFinishToneRef,
    hasPlayedConnectedToneRef,
    startRingbackTone,
    stopRingbackTone,
    playToneSequence,
    playFinishTone
  }
}
