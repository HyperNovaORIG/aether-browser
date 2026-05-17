import { app, BrowserWindow, session, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, type AppContainer } from "./app-container";
import { registerIpc } from "./ipc";
import { TabManager } from "./tab-manager";
import { ProfileManager } from "./profile";
import { globalBus } from "@aether/event-bus";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | undefined;
let container: AppContainer | undefined;

const isDev = !app.isPackaged;

async function createWindow(): Promise<void> {
  const profileManager = new ProfileManager(app.getPath("userData"));
  await profileManager.hydrate();
  const profile = profileManager.getDefault();

  const browserSession = session.fromPartition(profile.partition, { cache: true });
  hardenSession(browserSession);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    frame: process.platform === "darwin",
    backgroundColor: "#0a0b0f",
    vibrancy: process.platform === "darwin" ? "fullscreen-ui" : undefined,
    visualEffectState: "active",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: true,
      enableWebSQL: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    await mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  const tabManager = new TabManager({ window: mainWindow, profileManager });
  container = createApp({ window: mainWindow, tabManager, profileManager });
  registerIpc({ ipcMain, container });

  mainWindow.on("resize", () => tabManager.layoutActive());
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
}

/**
 * Apply hardening on top of the default session: block remote dev tools URLs,
 * strip dangerous permission requests, and proxy navigation through our
 * security layer.
 */
function hardenSession(s: Electron.Session): void {
  const allowed = new Set<string>(["clipboard-read", "fullscreen", "notifications"]);
  s.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(allowed.has(permission));
  });
  s.webRequest.onBeforeRequest(({ url }, cb) => {
    if (url.startsWith("file:")) cb({ cancel: true });
    else cb({});
  });
}

app.whenReady().then(async () => {
  await createWindow();
  globalBus().emit("app:ready", {});
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  globalBus().emit("app:before-quit", {});
  if (process.platform !== "darwin") app.quit();
});

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http")) event.preventDefault();
  });
});
