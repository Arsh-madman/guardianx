package com.guardianx.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Start background telemetry service automatically on launch
        Intent serviceIntent = new Intent(this, GuardianSyncService.class);
        startService(serviceIntent);
    }
}