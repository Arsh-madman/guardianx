package com.guardianx.app;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.IBinder;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Date;
import java.util.Timer;
import java.util.TimerTask;

public class GuardianSyncService extends Service {
    // Replace with your PC's IP address (e.g. from ipconfig in terminal)
    private static final String SERVER_URL = "http://192.168.1.100:3000";
    private final Timer timer = new Timer();

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Collect real device hardware metrics every 15 seconds
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                syncRealTelemetry();
            }
        }, 0, 15000);

        return START_STICKY;
    }

    private void syncRealTelemetry() {
        try {
            // Read real Android battery hardware
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = getApplicationContext().registerReceiver(null, ifilter);

            int level = batteryStatus != null ? batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) : -1;
            int scale = batteryStatus != null ? batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1) : -1;
            int batteryPct = (level >= 0 && scale > 0) ? (int) ((level / (float) scale) * 100) : 85;

            int rawTemp = batteryStatus != null ? batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 280) : 280;
            double temp = rawTemp / 10.0;
            int voltage = batteryStatus != null ? batteryStatus.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 4100) : 4100;

            // Read real Wi-Fi RSSI (Signal strength in dBm)
            WifiManager wifiManager = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            WifiInfo wifiInfo = (wifiManager != null) ? wifiManager.getConnectionInfo() : null;
            int rssi = (wifiInfo != null) ? wifiInfo.getRssi() : -65;
            String ssid = (wifiInfo != null && wifiInfo.getSSID() != null) ? wifiInfo.getSSID().replace("\"", "") : "Wi-Fi";

            JSONObject payload = new JSONObject();
            payload.put("child_id", 1);
            payload.put("battery_level", batteryPct);
            payload.put("temperature", temp);
            payload.put("voltage", voltage);
            payload.put("signal_dbm", rssi);
            payload.put("wifi_ssid", ssid);
            payload.put("timestamp", new Date().toString());

            postJson(SERVER_URL + "/api/device/telemetry/report", payload);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void postJson(String endpoint, JSONObject json) {
        try {
            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; utf-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = json.toString().getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception e) {
            // Server might be unreachable or logging locally
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}