/**
 * Shadow AI Desktop — Main Process
 */
const { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, nativeImage, desktopCapturer, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const fetch = require('node-fetch');

const store = new Store({ name: 'shadow-ai-desktop-config' });

const PROTOCOL    = 'shadow-ai-desktop';
// ── UPDATE THIS for production deployment ─────────────────────────────
// Set SHADOW_AI_API_URL env var at build time, or change the fallback:
const SERVER_URL = process.env.SHADOW_AI_API_URL
  || store.get('serverUrl')
  || 'http://localhost:5000'; // ← change to 'https://your-server.vercel.app' for production
const WINDOW_W    = 400;
const WINDOW_H    = 580;
const MINI_SIZE   = 56;
const ADMIN_EMAILS= ['khajamoulalis@gmail.com','skhajamoulali8@gmail.com'];

let mainWindow    = null;
let tray          = null;
let isMinimized   = false;
let activeToken   = null;
let expiryTimer   = null;
let heartbeatInt  = null;
let crashed       = false;

/* ── Protocol registration ─────────────────────────────────────────── */
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const url = argv.find(a => a.startsWith(PROTOCOL + '://'));
    if (url) handleDeepLink(url);
    if (mainWindow) { restoreWindow(); mainWindow.show(); mainWindow.focus(); }
  });
}
app.on('open-url', (e, url) => { e.preventDefault(); handleDeepLink(url); });

/* ── Deep link ──────────────────────────────────────────────────────── */
function handleDeepLink(url) {
  try {
    const parsed = new URL(url);
    const token  = parsed.searchParams.get('token');
    if (token) { store.set('lastToken', token); startSession(token); }
  } catch (e) { console.error('Deep link parse error:', e.message); }
}

/* ── Token check ────────────────────────────────────────────────────── */
async function checkToken(token) {
  try {
    const r = await fetch(SERVER_URL + '/api/desktop/status', {
      headers: { Authorization: 'Bearer ' + token }
    });
    return await r.json();
  } catch { return { valid: false, reason: 'NETWORK_ERROR' }; }
}

/* ── Session lifecycle ──────────────────────────────────────────────── */
async function startSession(token) {
  const s = await checkToken(token);
  if (!mainWindow) createWindow();

  if (!s.valid) {
    mainWindow.webContents.send('session:invalid', { reason: s.reason });
    mainWindow.show();
    return;
  }
  activeToken = token;
  mainWindow.webContents.send('session:active', {
    email: s.email, plan: s.plan, isAdmin: s.isAdmin, secondsRemaining: s.secondsRemaining
  });
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => endSession('TOKEN_EXPIRED'), s.secondsRemaining * 1000);
  clearInterval(heartbeatInt);
  heartbeatInt = setInterval(async () => {
    if (!activeToken) return;
    const h = await checkToken(activeToken);
    if (!h.valid) endSession(h.reason);
    else mainWindow?.webContents.send('session:tick', { secondsRemaining: h.secondsRemaining });
  }, 60000);
  mainWindow.show(); mainWindow.focus();
}

function endSession(reason) {
  activeToken = null;
  clearTimeout(expiryTimer); clearInterval(heartbeatInt);
  mainWindow?.webContents.send('session:ended', { reason });
}

/* ── Window creation ────────────────────────────────────────────────── */
function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: WINDOW_W, height: WINDOW_H,
    x: sw - WINDOW_W - 24, y: 60,
    frame: false, transparent: true,
    resizable: true, minWidth: MINI_SIZE, minHeight: MINI_SIZE,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  // ── TRUE screen-share invisibility ──────────────────────────────────
  // macOS: NSWindowSharingNone
  // Windows: SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
  mainWindow.setContentProtection(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });

  // Crash recovery
  mainWindow.webContents.on('render-process-gone', (_e, d) => {
    console.error('Renderer crashed:', d.reason);
    crashed = true; minimizeWindow(); updateTray();
  });

  createTray();
}

/* ── Minimize / restore ─────────────────────────────────────────────── */
function minimizeWindow() {
  if (!mainWindow) return;
  isMinimized = true;
  mainWindow.setSize(MINI_SIZE, MINI_SIZE);
  mainWindow.setResizable(false);
  mainWindow.webContents.send('window:minimized');
  updateTray();
}
function restoreWindow() {
  if (!mainWindow) return;
  isMinimized = false; crashed = false;
  mainWindow.setSize(WINDOW_W, WINDOW_H);
  mainWindow.setResizable(true);
  mainWindow.webContents.send('window:restored');
  updateTray();
}
function restartApp() {
  crashed = false;
  if (mainWindow) { mainWindow.webContents.reload(); restoreWindow(); }
  else { createWindow(); }
}

/* ── Tray ────────────────────────────────────────────────────────────── */
function createTray() {
  if (tray) return;
  let icon;
  try {
    icon = nativeImage.createFromPath(path.join(__dirname,'..','..','assets','tray-icon.png'));
    if (icon.isEmpty()) throw new Error('empty');
  } catch { icon = nativeImage.createEmpty(); }
  tray = new Tray(icon.resize({ width:16, height:16 }));
  tray.setToolTip('Shadow AI Desktop');
  updateTray();
  tray.on('double-click', () => {
    if (crashed) restartApp();
    else { restoreWindow(); mainWindow?.show(); mainWindow?.focus(); }
  });
}
function updateTray() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: crashed ? '⚠ Restart' : isMinimized ? 'Expand' : 'Shadow AI', click: () => {
        if (crashed) restartApp(); else { restoreWindow(); mainWindow?.show(); mainWindow?.focus(); }
    }},
    { type:'separator' },
    { label:'Quit', click: () => app.quit() },
  ]));
}

/* ── IPC handlers ────────────────────────────────────────────────────── */
ipcMain.handle('window:minimize',  () => minimizeWindow());
ipcMain.handle('window:restore',   () => restoreWindow());
ipcMain.handle('window:restart',   () => restartApp());
ipcMain.handle('window:close',     () => app.quit());
ipcMain.handle('window:drag',      (_e, {x,y}) => mainWindow?.setPosition(Math.round(x),Math.round(y)));
ipcMain.handle('window:getPos',    () => mainWindow ? mainWindow.getBounds() : null);
ipcMain.handle('session:getToken', () => activeToken || store.get('lastToken') || null);
ipcMain.handle('session:recheck',  async () => {
  const t = activeToken || store.get('lastToken');
  if (!t) return { valid:false, reason:'NO_TOKEN' };
  const s = await checkToken(t);
  if (s.valid) activeToken = t;
  return s;
});
ipcMain.handle('session:end', () => { endSession('MANUAL'); return true; });
ipcMain.handle('stealth:toggle', (_e, on) => { mainWindow?.setContentProtection(on); return on; });
ipcMain.handle('store:get',  (_e, key)      => store.get(key));
ipcMain.handle('store:set',  (_e, key, val) => { store.set(key, val); });
ipcMain.handle('server:url', () => SERVER_URL);
ipcMain.handle('shell:open', (_e, url) => shell.openExternal(url));
ipcMain.handle('screen:capture', async () => {
  try {
    const d = screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: d.size.width, height: d.size.height }
    });
    const src = sources.find(s => String(s.display_id) === String(d.id)) || sources[0];
    if (!src) return { ok:false, error:'No screen source' };
    return { ok:true, dataUrl: src.thumbnail.toDataURL() };
  } catch(e) { return { ok:false, error:e.message }; }
});

/* ── App ready ───────────────────────────────────────────────────────── */
app.whenReady().then(() => {
  createWindow();
  // Global hotkeys that work even when a video call has focus
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (isMinimized) restoreWindow(); else minimizeWindow();
  });
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow?.webContents.send('shortcut:scan');
  });
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    mainWindow?.webContents.send('shortcut:mic');
  });
  const launchUrl = process.argv.find(a => a.startsWith(PROTOCOL+'://'));
  if (launchUrl) handleDeepLink(launchUrl);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); clearTimeout(expiryTimer); clearInterval(heartbeatInt); });
app.on('activate', () => { if (!mainWindow) createWindow(); });
