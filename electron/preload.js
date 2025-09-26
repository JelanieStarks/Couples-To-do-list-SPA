// Preload runs in isolated world; expose minimal safe APIs if needed.
// For now, we don't expose anything and keep contextIsolation enabled.
// You can later add: contextBridge.exposeInMainWorld('api', { ... })
// while keeping security best practices.
