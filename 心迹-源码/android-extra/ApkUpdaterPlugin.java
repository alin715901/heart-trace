package com.xinji.hearttrace;

import android.content.Intent;
import android.net.Uri;
import android.os.Environment;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/** 应用内更新：读取版本清单、下载安装包并回调进度、拉起系统安装界面 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    @PluginMethod
    public void fetchJson(PluginCall call) {
        final String url = call.getString("url");
        if (url == null) {
            call.reject("缺少版本地址");
            return;
        }
        new Thread(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setInstanceFollowRedirects(true);
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) {
                    throw new IOException("HTTP " + code);
                }
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), "UTF-8"));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
                conn.disconnect();
                JSObject result = new JSObject();
                result.put("text", sb.toString());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("读取版本信息失败: " + e.getMessage(), e);
            }
        }).start();
    }

    @PluginMethod
    public void download(PluginCall call) {
        final String url = call.getString("url");
        if (url == null) {
            call.reject("缺少下载地址");
            return;
        }
        new Thread(() -> {
            File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) {
                dir = getContext().getFilesDir();
            }
            if (!dir.exists()) {
                dir.mkdirs();
            }
            final File out = new File(dir, "xinji-update.apk");
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(30000);
                conn.setInstanceFollowRedirects(true);
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) {
                    throw new IOException("HTTP " + code);
                }
                long total = conn.getContentLengthLong();
                if (out.exists()) {
                    out.delete();
                }
                // 立即回报总大小，进度条一开始就显示明确进度
                JSObject start = new JSObject();
                start.put("percent", 0);
                start.put("received", 0);
                start.put("total", total);
                notifyListeners("progress", start);
                try (InputStream in = conn.getInputStream();
                     FileOutputStream fos = new FileOutputStream(out)) {
                    byte[] buffer = new byte[16384];
                    long received = 0;
                    int lastPercent = -1;
                    int n;
                    while ((n = in.read(buffer)) != -1) {
                        fos.write(buffer, 0, n);
                        received += n;
                        int percent = total > 0 ? (int) (received * 100 / total) : -1;
                        // 仅在百分比变化时回调，避免过多事件造成界面卡顿
                        if (total > 0 && percent == lastPercent) {
                            continue;
                        }
                        lastPercent = percent;
                        JSObject data = new JSObject();
                        data.put("percent", percent);
                        data.put("received", received);
                        data.put("total", total);
                        notifyListeners("progress", data);
                    }
                }
                conn.disconnect();
                JSObject result = new JSObject();
                result.put("path", out.getAbsolutePath());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("下载失败: " + e.getMessage(), e);
            }
        }).start();
    }

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("缺少安装包路径");
            return;
        }
        try {
            File file = new File(path);
            Uri uri = FileProvider.getUriForFile(getContext(),
                    getContext().getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("无法打开安装界面: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("缺少链接");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("无法打开链接: " + e.getMessage(), e);
        }
    }
}
