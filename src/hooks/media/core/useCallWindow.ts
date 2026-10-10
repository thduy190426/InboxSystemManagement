import { useState, useRef, useEffect } from 'react'
import type { RefObject } from 'react'

export function useCallWindow(callShellRef: RefObject<HTMLDivElement | null>, canShowVideo: boolean) {
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [overlaySize, setOverlaySize] = useState<{ width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isPiPMode, setIsPiPMode] = useState(false)
  const pipWindowRef = useRef<any>(null)

  const dragStateRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
    width: number
    height: number
  } | null>(null)

  const resizeStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    left: number
    top: number
  } | null>(null)

  function isDesktopDragAvailable() {
    return window.matchMedia('(min-width: 769px) and (pointer: fine)').matches
  }

  function getOverlaySizeLimits(isVideoCall: boolean) {
    const padding = 12
    const minWidth = isVideoCall ? 520 : 360
    const minHeight = isVideoCall ? 480 : 380

    return {
      minWidth: Math.min(minWidth, window.innerWidth - padding * 2),
      minHeight: Math.min(minHeight, window.innerHeight - padding * 2),
      maxWidth: Math.max(280, window.innerWidth - padding * 2),
      maxHeight: Math.max(320, window.innerHeight - padding * 2),
    }
  }

  function clampOverlaySize(width: number, height: number, isVideoCall: boolean) {
    const limits = getOverlaySizeLimits(isVideoCall)

    return {
      width: Math.min(Math.max(limits.minWidth, width), limits.maxWidth),
      height: Math.min(Math.max(limits.minHeight, height), limits.maxHeight),
    }
  }

  function clampOverlayPosition(x: number, y: number, width: number, height: number) {
    const padding = 12

    return {
      x: Math.min(Math.max(padding, x), Math.max(padding, window.innerWidth - width - padding)),
      y: Math.min(Math.max(padding, y), Math.max(padding, window.innerHeight - height - padding)),
    }
  }

  useEffect(() => {
    function keepOverlayInsideViewport() {
      if (!dragPosition || !callShellRef.current) {
        return
      }

      const { width, height } = callShellRef.current.getBoundingClientRect()
      setDragPosition(clampOverlayPosition(dragPosition.x, dragPosition.y, width, height))
      setOverlaySize((current) => (current ? clampOverlaySize(current.width, current.height, canShowVideo) : current))
    }

    window.addEventListener('resize', keepOverlayInsideViewport)
    return () => window.removeEventListener('resize', keepOverlayInsideViewport)
  }, [canShowVideo, dragPosition, callShellRef])

  function startDraggingOverlay(event: React.PointerEvent<HTMLElement>) {
    if (!isDesktopDragAvailable() || event.button !== 0 || !callShellRef.current) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('button, select, input, textarea, a')) {
      return
    }

    const rect = callShellRef.current.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    }
    setDragPosition({ x: rect.left, y: rect.top })
    setOverlaySize((current) => current || { width: rect.width, height: rect.height })
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function dragOverlay(event: React.PointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    setDragPosition(
      clampOverlayPosition(
        event.clientX - dragState.offsetX,
        event.clientY - dragState.offsetY,
        dragState.width,
        dragState.height,
      ),
    )
  }

  function stopDraggingOverlay(event: React.PointerEvent<HTMLElement>) {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return
    }

    dragStateRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function startResizingOverlay(event: React.PointerEvent<HTMLButtonElement>) {
    if (!isDesktopDragAvailable() || event.button !== 0 || !callShellRef.current) {
      return
    }

    const rect = callShellRef.current.getBoundingClientRect()
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      left: rect.left,
      top: rect.top,
    }
    setDragPosition({ x: rect.left, y: rect.top })
    setOverlaySize({ width: rect.width, height: rect.height })
    setIsResizing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function resizeOverlay(event: React.PointerEvent<HTMLButtonElement>) {
    const resizeState = resizeStateRef.current
    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return
    }

    const nextSize = clampOverlaySize(
      Math.min(resizeState.startWidth + event.clientX - resizeState.startX, window.innerWidth - resizeState.left - 12),
      Math.min(resizeState.startHeight + event.clientY - resizeState.startY, window.innerHeight - resizeState.top - 12),
      canShowVideo,
    )

    setOverlaySize(nextSize)
    setDragPosition(clampOverlayPosition(resizeState.left, resizeState.top, nextSize.width, nextSize.height))
  }

  function stopResizingOverlay(event: React.PointerEvent<HTMLButtonElement>) {
    if (resizeStateRef.current?.pointerId !== event.pointerId) {
      return
    }

    resizeStateRef.current = null
    setIsResizing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  async function togglePiP(onError: (msg: string) => void, t: any) {
    if (!('documentPictureInPicture' in window)) {
      onError(t('pipNotSupported', { defaultValue: 'Trình duyệt không hỗ trợ Document Picture-in-Picture!' }))
      return
    }

    if (pipWindowRef.current) {
      pipWindowRef.current.close()
      return
    }

    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 380,
        height: 500,
      })
      pipWindowRef.current = pipWindow
      setIsPiPMode(true)

      if (callShellRef.current) {
        pipWindow.document.body.append(callShellRef.current)
      }

      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          const style = document.createElement('style')
          style.textContent = Array.from(styleSheet.cssRules).map(r => r.cssText).join('')
          pipWindow.document.head.append(style)
        } catch (e) {
          if (styleSheet.href) {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = styleSheet.href
            pipWindow.document.head.append(link)
          }
        }
      })

      pipWindow.addEventListener('pagehide', () => {
        setIsPiPMode(false)
        pipWindowRef.current = null
        if (callShellRef.current) {
          document.querySelector('.call-overlay')?.append(callShellRef.current)
        }
      })
    } catch (error) {
      onError(t('pipFailed', { defaultValue: 'Không thể mở Picture-in-Picture!' }))
    }
  }

  return {
    dragPosition,
    setDragPosition,
    overlaySize,
    setOverlaySize,
    isDragging,
    setIsDragging,
    isResizing,
    setIsResizing,
    isPiPMode,
    setIsPiPMode,
    pipWindowRef,
    dragStateRef,
    resizeStateRef,
    isDesktopDragAvailable,
    getOverlaySizeLimits,
    clampOverlaySize,
    clampOverlayPosition,
    startDraggingOverlay,
    dragOverlay,
    stopDraggingOverlay,
    startResizingOverlay,
    resizeOverlay,
    stopResizingOverlay,
    togglePiP
  }
}
