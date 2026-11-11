package com.couples.todo.spa;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private boolean downloading = false;
    private static final String PREFIX = "https://github.com/JelanieStarks/Couples-To-do-list-SPA/releases/download/";
    private static final long MAX_BYTES = 150L * 1024L * 1024L;

    private File apkFile() { return new File(new File(getContext().getCacheDir(), "updates"), "Couples2Do-update.apk"); }
    private int signatureFlags() { return Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES; }
    private long versionCode(PackageInfo info) { return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode; }
    private Set<Signature> signers(PackageInfo info) {
        Signature[] signatures = Build.VERSION.SDK_INT >= 28 && info.signingInfo != null ? info.signingInfo.getApkContentsSigners() : info.signatures;
        return signatures == null ? new HashSet<>() : new HashSet<>(Arrays.asList(signatures));
    }

    private PackageInfo validateApk(File file) throws Exception {
        PackageManager manager = getContext().getPackageManager();
        PackageInfo installed = manager.getPackageInfo(getContext().getPackageName(), signatureFlags());
        PackageInfo archive = manager.getPackageArchiveInfo(file.getAbsolutePath(), signatureFlags());
        if (archive == null || !getContext().getPackageName().equals(archive.packageName)) throw new Exception("This download is not an update for this app.");
        Set<Signature> trusted = signers(installed);
        if (trusted.isEmpty() || !trusted.equals(signers(archive))) throw new Exception("The update signing key does not match this app.");
        if (versionCode(archive) <= versionCode(installed)) throw new Exception("This app version is already installed or newer.");
        return archive;
    }

    @PluginMethod
    public void getInfo(PluginCall call) {
        try {
            PackageInfo installed = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            boolean ready = false;
            if (apkFile().isFile()) { try { validateApk(apkFile()); ready = true; } catch (Exception ignored) { /* Old or incomplete download. */ } }
            JSObject result = new JSObject(); result.put("version", installed.versionName); result.put("ready", ready); call.resolve(result);
        } catch (Exception error) { call.reject(error.getMessage()); }
    }

    private boolean trustedHost(URL url) {
        String host = url.getHost();
        return "https".equals(url.getProtocol()) && ("github.com".equals(host) || "release-assets.githubusercontent.com".equals(host) || "objects.githubusercontent.com".equals(host));
    }

    @PluginMethod
    public void download(PluginCall call) {
        String address = call.getString("url", "");
        if (!address.startsWith(PREFIX) || !address.toLowerCase().endsWith(".apk")) { call.reject("Choose the official Couples 2Do Android release."); return; }
        synchronized (this) { if (downloading) { call.reject("An update is already downloading."); return; } downloading = true; }
        worker.execute(() -> {
            File partial = new File(apkFile().getParentFile(), "download.part");
            HttpURLConnection connection = null;
            try {
                if (!partial.getParentFile().isDirectory() && !partial.getParentFile().mkdirs()) throw new Exception("Unable to prepare the update folder.");
                URL url = new URL(address);
                for (int redirect = 0; redirect <= 5; redirect++) {
                    if (!trustedHost(url)) throw new Exception("The update redirected outside the official download service.");
                    connection = (HttpURLConnection) url.openConnection();
                    connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(15000); connection.setReadTimeout(30000);
                    connection.setRequestProperty("User-Agent", "Couples2Do-Updater");
                    int status = connection.getResponseCode();
                    if (status >= 300 && status < 400) {
                        String location = connection.getHeaderField("Location");
                        connection.disconnect(); connection = null;
                        if (location == null || redirect == 5) throw new Exception("Too many update redirects.");
                        url = new URL(url, location); continue;
                    }
                    if (status != 200) throw new Exception("Update download failed (HTTP " + status + ").");
                    break;
                }
                if (connection == null) throw new Exception("Update download did not start.");
                long length = connection.getContentLengthLong();
                if (length > MAX_BYTES) throw new Exception("The update download is larger than expected.");
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[16384]; int read; long received = 0; int lastPercent = -1;
                    while ((read = input.read(buffer)) != -1) {
                        received += read;
                        if (received > MAX_BYTES || Thread.currentThread().isInterrupted()) throw new Exception("Update download interrupted.");
                        output.write(buffer, 0, read);
                        int percent = length > 0 ? (int) Math.min(99, received * 100 / length) : 0;
                        if (percent != lastPercent) { JSObject event = new JSObject(); event.put("percent", percent); notifyListeners("downloadProgress", event); lastPercent = percent; }
                    }
                    output.getFD().sync();
                }
                PackageInfo archive = validateApk(partial);
                File ready = apkFile();
                if (ready.exists() && !ready.delete()) throw new Exception("Unable to replace the old update download.");
                if (!partial.renameTo(ready)) throw new Exception("Unable to finish the update download.");
                JSObject progress = new JSObject(); progress.put("percent", 100); notifyListeners("downloadProgress", progress);
                JSObject result = new JSObject(); result.put("ready", true); result.put("version", archive.versionName); call.resolve(result);
            } catch (Exception error) { call.reject(error.getMessage()); }
            finally { if (connection != null) connection.disconnect(); if (partial.exists()) partial.delete(); synchronized (this) { downloading = false; } }
        });
    }

    @PluginMethod
    public void install(PluginCall call) {
        try {
            File file = apkFile(); validateApk(file);
            getActivity().runOnUiThread(() -> {
                try {
                    boolean permissionRequired = Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls();
                    if (permissionRequired) {
                        Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                        getActivity().startActivity(permission);
                    } else {
                        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                        Intent install = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive");
                        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        getActivity().startActivity(install);
                    }
                    JSObject result = new JSObject(); result.put("permissionRequired", permissionRequired); call.resolve(result);
                } catch (Exception error) { call.reject(error.getMessage()); }
            });
        } catch (Exception error) { call.reject(error.getMessage()); }
    }

    @Override
    protected void handleOnDestroy() { worker.shutdownNow(); }
}
