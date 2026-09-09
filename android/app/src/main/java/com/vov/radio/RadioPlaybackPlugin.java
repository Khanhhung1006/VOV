package com.vov.radio;

import android.content.ComponentName;
import android.content.Context;
import android.net.Uri;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "RadioPlayback")
public class RadioPlaybackPlugin extends Plugin {
    private MediaController mediaController;
    private ListenableFuture<MediaController> controllerFuture;

    @Override
    public void load() {
        super.load();
        initMediaController();
    }

    private void initMediaController() {
        Context context = getContext();
        SessionToken sessionToken = new SessionToken(context, new ComponentName(context, RadioPlaybackService.class));
        controllerFuture = new MediaController.Builder(context, sessionToken).build();
        controllerFuture.addListener(() -> {
            try {
                mediaController = controllerFuture.get();
                setupPlayerListener();
                emitStateChange();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, ContextCompat.getMainExecutor(context));
    }

    private void setupPlayerListener() {
        if (mediaController == null) return;
        mediaController.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                emitStateChange();
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                emitStateChange();
            }

            @Override
            public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) {
                if (mediaItem != null) {
                    JSObject data = new JSObject();
                    data.put("channelId", mediaItem.mediaId);
                    data.put("index", mediaController.getCurrentMediaItemIndex());
                    notifyListeners("onChannelChange", data);
                }
            }
        });
    }

    private void emitStateChange() {
        if (mediaController == null) return;
        String stateStr = "idle";
        int playbackState = mediaController.getPlaybackState();
        boolean isPlaying = mediaController.isPlaying();

        if (playbackState == Player.STATE_BUFFERING) {
            stateStr = "loading";
        } else if (isPlaying) {
            stateStr = "playing";
        } else if (playbackState == Player.STATE_READY) {
            stateStr = "paused";
        } else if (playbackState == Player.STATE_ENDED) {
            stateStr = "idle";
        }

        JSObject data = new JSObject();
        data.put("state", stateStr);
        notifyListeners("onStateChange", data);
    }

    @PluginMethod
    public void setChannels(PluginCall call) {
        JSArray channelsArray = call.getArray("channels");
        String activeId = call.getString("activeId");
        Boolean autoPlay = call.getBoolean("autoPlay", false);

        if (channelsArray == null) {
            call.reject("Channels list is null");
            return;
        }

        getBridge().executeOnMainThread(() -> {
            if (mediaController == null) {
                call.reject("MediaController not ready yet");
                return;
            }

            try {
                List<MediaItem> mediaItems = new ArrayList<>();
                int activeIndex = 0;

                for (int i = 0; i < channelsArray.length(); i++) {
                    JSObject chan = JSObject.fromJSONObject(channelsArray.getJSONObject(i));
                    String id = chan.getString("id");
                    String name = chan.getString("name");
                    String streamUrl = chan.getString("streamUrl");

                    String titleText = chan.getString("titleText", "VOV");
                    String subtitleText = chan.getString("subtitleText", "RADIO");
                    String color1 = chan.getString("color1", "#E52D27");
                    String color2 = chan.getString("color2", "#B31217");

                    Uri artworkUri = RadioPlaybackService.getArtworkUri(getContext(), titleText, subtitleText, color1, color2);

                    MediaMetadata metadata = new MediaMetadata.Builder()
                        .setTitle(name)
                        .setArtist("VOV Radio")
                        .setAlbumTitle("Live FM")
                        .setArtworkUri(artworkUri)
                        .build();

                    MediaItem mediaItem = new MediaItem.Builder()
                        .setUri(Uri.parse(streamUrl))
                        .setMediaId(id)
                        .setMediaMetadata(metadata)
                        .build();

                    mediaItems.add(mediaItem);

                    if (id != null && id.equals(activeId)) {
                        activeIndex = i;
                    }
                }

                mediaController.setMediaItems(mediaItems);
                mediaController.prepare();
                mediaController.seekToDefaultPosition(activeIndex);

                if (autoPlay != null && autoPlay) {
                    mediaController.play();
                }

                JSObject ret = new JSObject();
                ret.put("status", "success");
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            if (mediaController != null) {
                mediaController.play();
                call.resolve();
            } else {
                call.reject("Controller not ready");
            }
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            if (mediaController != null) {
                mediaController.pause();
                call.resolve();
            } else {
                call.reject("Controller not ready");
            }
        });
    }

    @PluginMethod
    public void selectIndex(PluginCall call) {
        Integer index = call.getInt("index");
        String id = call.getString("id");
        Boolean autoPlay = call.getBoolean("autoPlay", true);

        getBridge().executeOnMainThread(() -> {
            if (mediaController == null) {
                call.reject("Controller not ready");
                return;
            }

            if (index != null) {
                mediaController.seekToDefaultPosition(index);
                if (autoPlay != null && autoPlay) {
                    mediaController.play();
                }
                call.resolve();
            } else if (id != null) {
                for (int i = 0; i < mediaController.getMediaItemCount(); i++) {
                    MediaItem item = mediaController.getMediaItemAt(i);
                    if (id.equals(item.mediaId)) {
                        mediaController.seekToDefaultPosition(i);
                        if (autoPlay != null && autoPlay) {
                            mediaController.play();
                        }
                        call.resolve();
                        return;
                    }
                }
                call.reject("Channel ID not found in playlist");
            } else {
                call.reject("Must specify either index or id");
            }
        });
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double vol = call.getDouble("volume");
        getBridge().executeOnMainThread(() -> {
            if (vol != null && mediaController != null) {
                mediaController.setVolume(vol.floatValue());
                call.resolve();
            } else {
                call.reject("Invalid volume or controller not ready");
            }
        });
    }
}
