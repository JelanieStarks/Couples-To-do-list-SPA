const config = {
  appId: 'com.couples.todo.spa',
  appName: 'Couples To-do',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // During local dev, Capacitor can point to Vite dev server if needed.
    androidScheme: 'https',
  },
};

export default config;
