const electron = require('electron');
const app = electron.app;
const ipc = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
// Classes
const Utils = require('./class/Utils.js');
const Setting = require('./class/Setting.js');
const Connect = require('./class/Connect.js');
const utils = new Utils();
const setting = new Setting();
const connect = new Connect();

// メインウィンドウ
let mainWindow;

function createWindow() {
  const bounds = utils.getAppWinBounds();
  mainWindow = new BrowserWindow(bounds);
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'view/index.html'),
    protocol: 'file:',
    slashes: true
  }));
  // Debug Mode
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('resize', () => {
    let { width, height } = mainWindow.getBounds();
    setting.set('windowBounds', { width, height });
  });
}

app.on('ready', createWindow);

// 全てのウィンドウが閉じたときの処理
app.on('window-all-closed', () => {
  // macOSのとき以外はアプリケーションを終了させます
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
// アプリケーションがアクティブになった時の処理(Macだと、Dockがクリックされた時）
app.on('activate', () => {
  // メインウィンドウが消えている場合は再度メインウィンドウを作成する
  if (mainWindow === null) {
    createWindow();
  }
});

ipc.on('oauth-login', (event, arg) => {
  connect.authLogin(event, arg);
});
ipc.on('data-new-connection', (event, arg) => {
  connect.newConnect(event, arg);
});
ipc.on('data-connections', (event, arg) => {
  connect.getConnections(event, arg);
});
