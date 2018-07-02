const electron = require('electron');
const app = electron.app;
const ipc = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;

const events = require('events');
const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(15);

const path = require('path');
const url = require('url');
// Classes
const Setting = require('./class/Setting.js');
const Connect = require('./class/Connect.js');
const Pipeline = require('./class/Pipeline.js');
const utils = require('./class/Utils.js');
const setting = new Setting();
const connect = new Connect();
const pipeline = new Pipeline();

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
ipc.on('git-pullrequests', (event, arg) => {
  connect.getPullRequests(event, arg);
});
ipc.on('git-branches', (event, arg) => {
  connect.getBranches(event, arg);
});
ipc.on('git-branch-commits', (event, arg) => {
  connect.getCommits(event, arg);
});
ipc.on('data-new-connection', (event, arg) => {
  connect.newConnect(event, arg);
});
ipc.on('data-connections', (event, arg) => {
  connect.getConnections(event, arg);
});
ipc.on('data-save-pipeline', (event, arg) => {
  pipeline.savePipeline(event, arg);
});
ipc.on('data-clone-pipeline', (event, arg) => {
  pipeline.clonePipeline(event, arg);
});
ipc.on('data-remove-pipeline', (event, arg) => {
  pipeline.removePipeline(event, arg);
});
ipc.on('data-pipelines', (event, arg) => {
  pipeline.getPipelines(event, arg);
});
ipc.on('data-pipeline-log', (event, arg) => {
  pipeline.getPipelineLog(event, arg);
});
ipc.on('pipeline-run', (event, arg) => {
  pipeline.runPipeline(event, arg);
});