package com.vov.radio;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RadioPlaybackPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
