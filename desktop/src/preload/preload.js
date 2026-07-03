const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shadowAI', {
  window: {
    minimize:  ()        => ipcRenderer.invoke('window:minimize'),
    restore:   ()        => ipcRenderer.invoke('window:restore'),
    restart:   ()        => ipcRenderer.invoke('window:restart'),
    close:     ()        => ipcRenderer.invoke('window:close'),
    drag:      (x, y)   => ipcRenderer.invoke('window:drag', { x, y }),
    getPos:    ()        => ipcRenderer.invoke('window:getPos'),
  },
  session: {
    getToken:  ()        => ipcRenderer.invoke('session:getToken'),
    recheck:   ()        => ipcRenderer.invoke('session:recheck'),
    end:       ()        => ipcRenderer.invoke('session:end'),
  },
  stealth: {
    toggle: (on)        => ipcRenderer.invoke('stealth:toggle', on),
  },
  screen: {
    capture:   ()        => ipcRenderer.invoke('screen:capture'),
  },
  store: {
    get:  (key)          => ipcRenderer.invoke('store:get', key),
    set:  (key, val)     => ipcRenderer.invoke('store:set', key, val),
  },
  server: {
    url:  ()             => ipcRenderer.invoke('server:url'),
  },
  shell: {
    open: (url)          => ipcRenderer.invoke('shell:open', url),
  },
  // Events from main → renderer
  on: (channel, fn) => {
    const allowed = [
      'session:active','session:tick','session:ended','session:invalid',
      'window:minimized','window:restored',
      'shortcut:scan','shortcut:mic',
    ];
    if (allowed.includes(channel)) {
      const wrapped = (_e, ...args) => fn(...args);
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    }
  },
});
