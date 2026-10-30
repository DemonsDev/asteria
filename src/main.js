const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
let mainWindow;
let queuedAuthUrl = null;
let devClientProcess = null;
let lastKnownClientRunning = false;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.allowPrerelease = false;
const gotLock = app.requestSingleInstanceLock();
function clientLockPath() { return path.join(app.getPath('userData'), 'minecraft-client.json'); }
function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code === 'EPERM'; }
}
function getRunningClientState() {
  if (devClientProcess && devClientProcess.exitCode === null) return { running: true };
  const lockPath = clientLockPath();
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (isProcessAlive(lock.pid)) return { running: true };
  } catch (_) { }
  try { fs.unlinkSync(lockPath); } catch (_) { }
  return { running: false };
}
function clearClientLock(pid) {
  const lockPath = clientLockPath();
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (!pid || lock.pid === pid) fs.unlinkSync(lockPath);
  } catch (_) { }
}
function notifyClientStopped() {
  if (!lastKnownClientRunning) return;
  lastKnownClientRunning = false;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-client-exit');
}
function sendAuthUrl(url) {
  if (!url) return;
  if (mainWindow && mainWindow.webContents) {
    const send = () => mainWindow.webContents.send('auth-link', url);
    if (mainWindow.webContents.isLoading()) mainWindow.webContents.once('did-finish-load', send); else send();
  } else queuedAuthUrl = url;
}
function sendUpdateState(state, details = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('launcher:update-state', { state, ...details });
}
autoUpdater.on('checking-for-update', () => sendUpdateState('checking'));
autoUpdater.on('update-available', info => sendUpdateState('available', { version: info.version }));
autoUpdater.on('update-not-available', info => sendUpdateState('current', { version: info.version }));
autoUpdater.on('download-progress', progress => sendUpdateState('downloading', { percent: Math.round(progress.percent) }));
autoUpdater.on('update-downloaded', info => sendUpdateState('downloaded', { version: info.version }));
autoUpdater.on('error', error => {
  const message = error?.message || 'Vérification impossible.';
  const noRelease = /latest\.yml|release|404|not found/i.test(message);
  sendUpdateState('error', { message: noRelease ? 'Aucune version de mise à jour n’a encore été publiée.' : message });
});
function findAuthUrl(args) { return args.find(value => typeof value === 'string' && value.startsWith('asteria://')) || null; }
function findJava25w() {
  const roots = [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Eclipse Adoptium'), path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Eclipse Adoptium')];
  const candidates = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) if (/^jdk-25(?:[.-]|$)/i.test(name)) candidates.push(path.join(root, name, 'bin', 'javaw.exe'));
  }
  const home = process.env.JAVA_HOME;
  if (home && /jdk-?25(?:[.-]|$)/i.test(home)) candidates.push(path.join(home, 'bin', 'javaw.exe'));
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}
if (process.defaultApp && process.argv.length >= 2) app.setAsDefaultProtocolClient('asteria', process.execPath, [path.resolve(process.argv[1])]);
else app.setAsDefaultProtocolClient('asteria');
app.on('open-url', (event, url) => { event.preventDefault(); sendAuthUrl(url); });
ipcMain.handle('launcher:get-client-state', () => {
  const state = getRunningClientState();
  lastKnownClientRunning = state.running;
  return state;
});
ipcMain.handle('launcher:check-updates', async () => {
  if (!app.isPackaged) return { ok: false, state: 'development', message: 'La vérification fonctionne dans la version installée du launcher.' };
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true, state: 'checking' };
  } catch (error) {
    return { ok: false, state: 'error', message: error?.message || 'Vérification impossible.' };
  }
});
ipcMain.handle('launcher:download-update', async () => {
  try { await autoUpdater.downloadUpdate(); return { ok: true }; }
  catch (error) { return { ok: false, message: error?.message || 'Téléchargement impossible.' }; }
});
ipcMain.handle('launcher:install-update', () => {
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { ok: true };
});
ipcMain.handle('launcher:launch-dev-client', async () => {
  if (getRunningClientState().running) {
    lastKnownClientRunning = true;
    return { ok: true, running: true, message: 'Minecraft est déjà lancé.' };
  }
  const projectDir = path.join(app.getPath('documents'), 'AsteriaMod-26.3');
  const wrapperJar = path.join(projectDir, 'gradle', 'wrapper', 'gradle-wrapper.jar');
  const javaw = findJava25w();
  if (!fs.existsSync(wrapperJar)) return { ok: false, message: 'Projet NeoForge 26.3 introuvable dans Documents\\AsteriaMod-26.3.' };
  if (!javaw) return { ok: false, message: 'Java 25 introuvable. Installe Temurin 25 ou indique son dossier.' };
  return new Promise(resolve => {
    try {
      const child = spawn(javaw, ['-Xmx64m', '-Xms64m', '-Dorg.gradle.appname=gradlew', '-classpath', wrapperJar, 'org.gradle.wrapper.GradleWrapperMain', 'runClient'], { cwd: projectDir, windowsHide: true, detached: true, stdio: 'ignore' });
      devClientProcess = child;
      child.once('spawn', () => {
        fs.mkdirSync(app.getPath('userData'), { recursive: true });
        fs.writeFileSync(clientLockPath(), JSON.stringify({ pid: child.pid, startedAt: Date.now() }));
        lastKnownClientRunning = true;
        resolve({ ok: true, running: true, message: 'Minecraft 26.3 est lancé.' });
      });
      child.once('error', error => { devClientProcess = null; clearClientLock(child.pid); notifyClientStopped(); resolve({ ok: false, message: `Impossible de démarrer Minecraft : ${error.message}` }); });
      child.once('exit', () => { devClientProcess = null; clearClientLock(child.pid); notifyClientStopped(); });
      child.unref();
    } catch (error) { devClientProcess = null; notifyClientStopped(); resolve({ ok: false, message: `Impossible de démarrer Minecraft : ${error.message}` }); }
  });
});
if (!gotLock) app.quit();
else {
  app.on('second-instance', (_event, commandLine) => { sendAuthUrl(findAuthUrl(commandLine)); if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  function createWindow() {
    mainWindow = new BrowserWindow({width:1100,height:720,minWidth:850,minHeight:600,title:'Asteria — Launcher',backgroundColor:'#0b0e16',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.bundle.cjs'),contextIsolation:true,nodeIntegration:false}});
    Menu.setApplicationMenu(null); mainWindow.setMenuBarVisibility(false); mainWindow.loadFile(path.join(__dirname,'index.html'));
    mainWindow.webContents.once('did-finish-load',()=>{const url=findAuthUrl(process.argv)||queuedAuthUrl;if(url){mainWindow.webContents.send('auth-link',url);queuedAuthUrl=null;}});
    mainWindow.on('closed',()=>{mainWindow=null;});
  }
  app.whenReady().then(()=>{createWindow();setInterval(()=>{if(lastKnownClientRunning&&!getRunningClientState().running)notifyClientStopped();},2000).unref();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
  app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
