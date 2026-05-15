const { app, BrowserWindow, globalShortcut, shell, ipcMain } = require('electron');
const { GlobalKeyboardListener } = require('node-global-key-listener');

let mainWindow;
const v = new GlobalKeyboardListener();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 150,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.loadFile('index.html');
    mainWindow.hide(); // Cachée par défaut

    // Gestion de la fenêtre via IPC
    ipcMain.on('hide-window', () => {
        mainWindow.hide();
    });

    ipcMain.on('show-window', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

app.whenReady().then(() => {
    createWindow();

    // Raccourci global : Alt + J pour afficher/cacher
    globalShortcut.register('Alt+J', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
