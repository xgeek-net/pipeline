const electron = require('electron');
const app = electron.app;
const shell = electron.shell;
const ipc = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;

if (require('electron-squirrel-startup')) app.quit();

const events = require('events');
const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(15);

const path = require('path');
const url = require('url');
// Classes
const Setting = require('./class/Setting');
const Connect = require('./class/Connect');
const Pipeline = require('./class/Pipeline');
const utils = require('./class/Utils');
const appMenu = require('./class/AppMenu');
const setting = new Setting();
const connect = new Connect();
const pipeline = new Pipeline();

// Raven
if(process.env.NODE_ENV !== 'development') {
  const CLIENT = require('./config/client');
  const Raven = require('raven');
  Raven.config(CLIENT.RAVEN_CLIENT_ID).install();
}

let mainWindow;

function createWindow() {
  const bounds = utils.getAppWinBounds();
  mainWindow = new BrowserWindow(bounds);
  // Hide menu
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'view/index.html'),
    protocol: 'file:',
    slashes: true
  }));
  // Debug Mode
  if(process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Open link with target="_blank" on brower
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  })
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('resize', () => {
    let { width, height } = mainWindow.getBounds();
    setting.set('windowBounds', { width, height });
  });
  // App Menu
  if(process.env.NODE_ENV !== 'development') {
    appMenu.initMenu();
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
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
ipc.on('sfdc-metadata-list', (event, arg) => {
  connect.getMetadataList(event, arg);
});
ipc.on('data-setting', (event, arg) => {
  setting.getSetting(event, arg);
});
ipc.on('data-new-connection', (event, arg) => {
  connect.newConnect(event, arg);
});
ipc.on('data-connections', (event, arg) => {
  connect.getConnections(event, arg);
});
ipc.on('data-remove-connection', (event, arg) => {
  connect.removeConnect(event, arg);
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
ipc.on('data-pipeline-export-metadata', (event, arg) => {
  pipeline.exportMetadata(event, arg);
});
ipc.on('pipeline-run', (event, arg) => {
  pipeline.runPipeline(event, arg);
});