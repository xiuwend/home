const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lotteryAPI', {
  importNamesFromFile: () => ipcRenderer.invoke('import-names-from-file')
});
