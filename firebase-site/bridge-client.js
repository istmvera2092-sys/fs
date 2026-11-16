(() => {
  const CHANNEL = 'kinovecher-bridge-v1';
  const BACKEND = 'https://script.google.com/macros/s/AKfycbzdZYf74dsGiZAaTdWuP9COIo2va-_qLX8W4Oc-4VFgT5GkUfVo9R_v7A-z74sJsk0m/exec';
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const pending = new Map();
  let nextId = 1;
  let bridgeWindow = null;
  let bridgeOrigin = null;
  let readyResolve;
  let readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  ready.catch(() => {});
  const readyTimer = setTimeout(() => readyReject(new Error('Не удалось подключиться к общему списку. Обновите страницу.')), 20000);

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.channel !== CHANNEL || message.nonce !== nonce) return;
    if (!/^https:\/\/(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(event.origin) &&
        event.origin !== 'https://script.google.com') return;
    if (message.ready && !bridgeWindow) {
      bridgeWindow = event.source;
      bridgeOrigin = event.origin;
      clearTimeout(readyTimer);
      readyResolve();
      return;
    }
    if (event.source !== bridgeWindow || !Number.isSafeInteger(message.id)) return;
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    if (message.ok) request.resolve(message.value);
    else request.reject(new Error(message.error || 'Не удалось выполнить действие.'));
  });

  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Связь с общим списком фильмов');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
  frame.src = BACKEND + '?mode=bridge&nonce=' + nonce;
  document.body.appendChild(frame);

  window.kinovecherRpc = async (name, ...args) => {
    await ready;
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Сервер не ответил. Попробуйте ещё раз.'));
      }, 20000);
      pending.set(id, { resolve, reject, timer });
      bridgeWindow.postMessage({ channel: CHANNEL, nonce, id, name, args }, bridgeOrigin);
    });
  };
})();
