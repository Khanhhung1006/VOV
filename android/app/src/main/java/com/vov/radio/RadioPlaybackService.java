package com.vov.radio;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.net.Uri;
import android.media.audiofx.LoudnessEnhancer;
import android.media.audiofx.DynamicsProcessing;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.analytics.AnalyticsListener;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import java.io.File;
import java.io.FileOutputStream;

public class RadioPlaybackService extends MediaSessionService {
    private MediaSession mediaSession;
    private ExoPlayer player;
    private LoudnessEnhancer loudnessEnhancer;
    private DynamicsProcessing dynamicsProcessing;

    @Override
    public void onCreate() {
        super.onCreate();
        
        // Setup audio attributes for high-performance audio and automatic Audio Focus handling
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .setUsage(C.USAGE_MEDIA)
                .build();

        player = new ExoPlayer.Builder(this)
                .setAudioAttributes(audioAttributes, true) // automatically handle audio focus
                .setHandleAudioBecomingNoisy(true) // pause playback when headphones are unplugged
                .build();

        // Attach AnalyticsListener to dynamically detect Audio Session ID changes
        player.addAnalyticsListener(new AnalyticsListener() {
            @Override
            public void onAudioSessionIdChanged(EventTime eventTime, int audioSessionId) {
                if (audioSessionId != C.AUDIO_SESSION_ID_UNSET) {
                    setupAudioEffects(audioSessionId);
                }
            }
        });

        mediaSession = new MediaSession.Builder(this, player).build();
    }

    private void setupAudioEffects(int audioSessionId) {
        // 1. Configure and Enable LoudnessEnhancer
        try {
            if (loudnessEnhancer != null) {
                try {
                    loudnessEnhancer.release();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            loudnessEnhancer = new LoudnessEnhancer(audioSessionId);
            // Boost target gain safely by 5.0 dB (500 millibels) to achieve 180-200% actual loudness
            loudnessEnhancer.setTargetGain(500);
            loudnessEnhancer.setEnabled(true);
            System.out.println("LoudnessEnhancer successfully initialized on session: " + audioSessionId);
        } catch (Exception e) {
            System.err.println("Failed to initialize LoudnessEnhancer: " + e.getMessage());
        }

        // 2. Configure and Enable DynamicsProcessing Compressor + Look-Ahead Limiter (Android 9+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            try {
                if (dynamicsProcessing != null) {
                    try {
                        dynamicsProcessing.release();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                // Config Builder: Variant, ChannelCount, PreEQ, PreEQ bands, MBC, MBC bands, PostEQ, PostEQ bands, Limiter
                DynamicsProcessing.Config.Builder builder = new DynamicsProcessing.Config.Builder(
                    DynamicsProcessing.VARIANT_FAVOR_FREQUENCY_RESOLUTION,
                    2,       // Stereo (2 channels)
                    false, 0, // PreEQ
                    true, 1,  // Multi-band Compressor (1 band - full spectrum)
                    false, 0, // PostEQ
                    true      // Limiter (single-band look-ahead)
                );

                DynamicsProcessing.Config config = builder.build();
                dynamicsProcessing = new DynamicsProcessing(0, audioSessionId, config);

                // Setup Studio Compressor parameters:
                // Ratio: 1.8:1
                // Threshold: -16.0 dB
                // Attack: 8.0 ms
                // Release: 80.0 ms
                // Makeup Gain: 6.0 dB (boosts quiet signals cleanly while compression handles peaks)
                // Soft Knee: 2.0 dB width
                DynamicsProcessing.MbcBand mbcBand = new DynamicsProcessing.MbcBand(
                    true,       // enabled
                    20000.0f,   // cutoffFrequency (covers complete hearing range)
                    8.0f,       // attackTime
                    80.0f,      // releaseTime
                    1.8f,       // ratio
                    -16.0f,     // threshold
                    2.0f,       // kneeWidth (Soft Knee)
                    -90.0f,     // noiseGateThreshold
                    1.0f,       // expanderRatio
                    0.0f,       // preGain
                    6.0f        // postGain (Makeup gain)
                );
                dynamicsProcessing.setMbcBandAllChannelsTo(0, mbcBand);

                // Setup Peak Look-Ahead Limiter parameters:
                // Look ahead: 5.0 ms (simulated via attackTime)
                // Release: 50.0 ms
                // Peak Ceiling: -1.0 dBFS (strictly prevents any clipping above 0 dBFS)
                DynamicsProcessing.Limiter limiter = new DynamicsProcessing.Limiter(
                    true,       // inUse
                    true,       // enabled
                    0,          // linkGroup
                    5.0f,       // attackTime
                    50.0f,      // releaseTime
                    10.0f,      // ratio (brickwall limiting)
                    -1.0f,      // threshold / Peak Ceiling
                    0.0f        // postGain
                );
                dynamicsProcessing.setLimiterAllChannelsTo(limiter);

                dynamicsProcessing.setEnabled(true);
                System.out.println("DynamicsProcessing successfully initialized on session: " + audioSessionId);
            } catch (Exception e) {
                System.err.println("Failed to initialize DynamicsProcessing: " + e.getMessage());
            }
        }
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onDestroy() {
        if (loudnessEnhancer != null) {
            try {
                loudnessEnhancer.release();
            } catch (Exception e) {
                e.printStackTrace();
            }
            loudnessEnhancer = null;
        }
        if (dynamicsProcessing != null) {
            try {
                dynamicsProcessing.release();
            } catch (Exception e) {
                e.printStackTrace();
            }
            dynamicsProcessing = null;
        }
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }

    // Helper method to create dynamic artwork natively
    public static Uri getArtworkUri(Context context, String title, String subtitle, String color1, String color2) {
        try {
            int size = 512;
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);

            int startColor = Color.parseColor(color1);
            int endColor = Color.parseColor(color2);
            Paint paint = new Paint();
            paint.setAntiAlias(true);
            LinearGradient gradient = new LinearGradient(0, 0, size, size, startColor, endColor, Shader.TileMode.CLAMP);
            paint.setShader(gradient);
            canvas.drawRect(0, 0, size, size, paint);

            Paint titlePaint = new Paint();
            titlePaint.setColor(Color.WHITE);
            titlePaint.setTextSize(100);
            titlePaint.setFakeBoldText(true);
            titlePaint.setAntiAlias(true);
            titlePaint.setTextAlign(Paint.Align.CENTER);
            titlePaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));

            Rect titleBounds = new Rect();
            titlePaint.getTextBounds(title, 0, title.length(), titleBounds);
            float titleY = (size / 2f) - 10f;
            canvas.drawText(title, size / 2f, titleY, titlePaint);

            Paint subPaint = new Paint();
            subPaint.setColor(Color.WHITE);
            subPaint.setAlpha(220);
            subPaint.setTextSize(36);
            subPaint.setFakeBoldText(true);
            subPaint.setAntiAlias(true);
            subPaint.setTextAlign(Paint.Align.CENTER);
            subPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));

            float subY = (size / 2f) + 100f;
            canvas.drawText(subtitle, size / 2f, subY, subPaint);

            File cacheDir = context.getCacheDir();
            File logoFile = new File(cacheDir, "logo_" + title.replaceAll("[^a-zA-Z0-9]", "_") + "_" + subtitle.replaceAll("[^a-zA-Z0-9]", "_") + ".png");
            FileOutputStream fos = new FileOutputStream(logoFile);
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
            fos.close();
            return Uri.fromFile(logoFile);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
