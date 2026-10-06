let titleFlashInterval: number | null = null;
const originalTitle = document.title || 'Inbox';

export function playAlertSound() {
  const audio = new Audio('/audio/TDuy_Message.mp3');
  audio.play().catch(() => {
  });
}

export function playCallRing() {
  const audio = new Audio('/audio/TDuy.mp3');
  audio.play().catch(() => {});
}

export function flashDocumentTitle(message: string) {
  if (titleFlashInterval) {
    window.clearInterval(titleFlashInterval);
  }

  let isOriginal = false;
  document.title = message; 
  
  titleFlashInterval = window.setInterval(() => {
    document.title = isOriginal ? message : originalTitle;
    isOriginal = !isOriginal;
  }, 1000);

  const clearFlash = () => {
    if (titleFlashInterval) {
      window.clearInterval(titleFlashInterval);
      titleFlashInterval = null;
    }
    document.title = originalTitle;
    window.removeEventListener('focus', clearFlash);
    window.removeEventListener('mousemove', clearFlash);
    window.removeEventListener('keydown', clearFlash);
    window.removeEventListener('click', clearFlash);
  };

  window.addEventListener('focus', clearFlash);
  window.addEventListener('mousemove', clearFlash);
  window.addEventListener('keydown', clearFlash);
  window.addEventListener('click', clearFlash);
}
