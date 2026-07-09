const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let logFile;
let mainWindow;

// Deferred logger - logFile is set after app is ready
function log(msg) {
  const ts = new Date().toISOString();
  if (logFile) {
    try {
      fs.appendFileSync(logFile, `[${ts}] ${msg}\n`);
    } catch (e) {
      // ignore write errors
    }
  }
}

process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

function createServer() {
  const isPackaged = app.isPackaged;
  // When packaged, app.asar is the root; when dev, it's the project root
  const distDir = isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist')
    : path.join(__dirname, '..', 'dist');

  log(`isPackaged=${isPackaged}, distDir=${distDir}`);

  // Verify dist exists
  try {
    const exists = fs.existsSync(distDir);
    log(`distDir exists: ${exists}`);
    if (exists) {
      const files = fs.readdirSync(distDir);
      log(`dist contents: ${files.join(', ')}`);
    }
  } catch (e) {
    log(`Error checking distDir: ${e.message}`);
  }

  const server = http.createServer((req, res) => {
    const requestPath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(distDir, decodeURIComponent(requestPath));

    log(`Serving: ${requestPath} -> ${filePath}`);

    fs.readFile(filePath, (error, content) => {
      if (error) {
        log(`  NOT FOUND: ${error.message}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
      }[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });

  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    log(`Server started on port ${port}`);
    if (mainWindow) {
      mainWindow.loadURL(`http://127.0.0.1:${port}`);
    }
  });

  server.on('error', (err) => {
    log(`Server error: ${err.message}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Kine Cabinet',
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`did-fail-load: code=${errorCode}, desc=${errorDescription}`);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    log(`CONSOLE: ${message}`);
  });

  createServer();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize log file path now that app is ready
  logFile = path.join(app.getPath('userData'), 'kine-cabinet.log');
  log('App ready, creating window...');
  createWindow();
}).catch((err) => {
  console.error('whenReady error:', err.message, err.stack);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
