const defaultIceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

function parseIceServers(value: string | undefined): RTCIceServer[] {
  if (!value) {
    return defaultIceServers
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      throw new Error('Cấu trúc VITE_RTC_ICE_SERVERS không hợp lệ, phải là một mảng!')
    }

    const iceServers = parsed.filter((server): server is RTCIceServer => {
      if (!server || typeof server !== 'object') {
        return false
      }

      const candidate = server as RTCIceServer
      return Boolean(candidate.urls)
    })

    return iceServers.length ? iceServers : defaultIceServers
  } catch (error) {
    console.warn('VITE_RTC_ICE_SERVERS không hợp lệ, mặc định sử dụng STUN server:', error)
    return defaultIceServers
  }
}

export const rtcPeerConfig: RTCConfiguration = {
  iceServers: parseIceServers(import.meta.env.VITE_RTC_ICE_SERVERS),
}
