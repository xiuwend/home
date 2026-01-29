const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const iconPath = path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

const NAME_HEADERS = ['姓名', '名字', '名称', '人员姓名', '员工姓名', '名单', '姓名列', '参与人', '候选人', '人员', '人员名单', '中奖名单', '抽奖名单', '员工', '员工姓名'];

function findNameColumnIndex(rows) {
  if (!rows || rows.length === 0) return { col: -1, headerRow: 0 };
  const normalize = (s) => (s != null ? String(s).trim().replace(/\s+/g, '') : '');
  const isNameHeader = (cell) => {
    const n = normalize(cell);
    if (!n) return false;
    return NAME_HEADERS.some(h => n === h || n.includes(h));
  };
  for (let r = 0; r < Math.min(3, rows.length); r++) {
    const row = rows[r];
    const arr = Array.isArray(row) ? row : [row];
    for (let c = 0; c < arr.length; c++) {
      if (isNameHeader(arr[c])) return { col: c, headerRow: r };
    }
  }
  return { col: -1, headerRow: 0 };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    ...(fs.existsSync(iconPath) && { icon: iconPath }),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
  win.maximize(); // 软件打开后窗口最大化
  win.once('ready-to-show', () => win.show());
  return win;
}

ipcMain.handle('import-names-from-file', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const { filePaths } = await dialog.showOpenDialog(win || null, {
    title: '选择名单文件',
    properties: ['openFile'],
    filters: [
      { name: 'Excel / 文本', extensions: ['xlsx', 'xls', 'csv', 'txt'] }
    ]
  });
  if (!filePaths || !filePaths[0]) return { names: null };
  const fp = filePaths[0];
  const ext = path.extname(fp).toLowerCase();
  let names = [];
  try {
    if (ext === '.txt') {
      const s = fs.readFileSync(fp, 'utf-8');
      names = s.split(/[\r\n]+/).map(x => x.trim()).filter(Boolean);
    } else if (ext === '.csv') {
      const buf = fs.readFileSync(fp);
      const wb = XLSX.read(buf, { type: 'buffer' });
      const sn = wb.SheetNames[0];
      if (!sn) { names = []; } else {
        const ws = wb.Sheets[sn];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const { col: nameCol, headerRow } = findNameColumnIndex(rows);
        if (nameCol >= 0) {
          for (let i = headerRow + 1; i < rows.length; i++) {
            const row = rows[i];
            const arr = Array.isArray(row) ? row : [row];
            const v = arr[nameCol] != null ? String(arr[nameCol]).trim() : '';
            if (v) names.push(v);
          }
        } else {
          for (const row of rows) {
            const arr = Array.isArray(row) ? row : [row];
            for (const cell of arr) {
              const v = cell != null ? String(cell).trim() : '';
              if (v) names.push(v);
            }
          }
        }
      }
    } else {
      const buf = fs.readFileSync(fp);
      const wb = XLSX.read(buf, { type: 'buffer' });
      const sn = wb.SheetNames[0];
      if (!sn) return { names: [] };
      const ws = wb.Sheets[sn];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const { col: nameCol, headerRow } = findNameColumnIndex(rows);
      if (nameCol >= 0) {
        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i];
          const arr = Array.isArray(row) ? row : [row];
          const v = arr[nameCol] != null ? String(arr[nameCol]).trim() : '';
          if (v) names.push(v);
        }
      } else {
        for (const row of rows) {
          const arr = Array.isArray(row) ? row : [row];
          for (const cell of arr) {
            const v = cell != null ? String(cell).trim() : '';
            if (v) names.push(v);
          }
        }
      }
    }
  } catch (e) {
    return { names: null, error: (e && e.message) || '解析失败' };
  }
  return { names };
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
