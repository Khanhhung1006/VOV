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
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import java.io.File;
import java.io.FileOutputStream;

public class RadioPlaybackService extends MediaSessionService {
    private MediaSession mediaSession;
    private ExoPlayer player;

    @Override
    public void onCreate() {
        super.onCreate();
        
        // Setup audio attributes for automatic Audio Focus handling
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .setUsage(C.USAGE_MEDIA)
                .build();

        player = new ExoPlayer.Builder(this)
                .setAudioAttributes(audioAttributes, true) // automatically handle audio focus
                .setHandleAudioBecomingNoisy(true) // pause playback when headphones are unplugged
                .build();

        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onDestroy() {
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
