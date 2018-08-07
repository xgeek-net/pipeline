const electron = require('electron');
const app = electron.app;
const shell = electron.shell;
const Menu = electron.Menu;
const appVersion = require('../../package.json').version;

const appMenu = {

  initMenu : function() {
    const template = [{
      label: "Pipeline",
      submenu: [
        { label: "Pipeline v" + appVersion, click () { shell.openExternal('https://www.xgeek.net/salesforce/pipeline-for-salesforce/'); } },
        { type: "separator" },
        { label: "Check for Updates...", click () { shell.openExternal('https://github.com/xgeek-net/pipeline/releases'); } },
        { type: "separator" },
        { label: "Quit Pipeline", accelerator: "Command+Q", click: function() { app.quit(); }}
      ]}, {
      label: "Edit",
      submenu: [
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]}
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}

module.exports = appMenu;