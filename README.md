# JavaScript-player Mux Data

RedBeeMedia JavaScript Player Mux Data

Plugin for RedBee JavaScript Player for sending analytics data to Mux.

## Usage

```TypeScript
import { RedBeePlayer } from "@redbeemedia/javascript-player";
import { MuxDataPlugin } from "@redbeemedia/javascript-player-mux-data";

// Setup and load the player as usual
const player = new RedBeePlayer(...);

/*
  Create a new instance of the plugin
  The muxDataMetadata property can contain custom metadata fields to be sent to Mux.
  See https://docs.mux.com/guides/data/make-your-data-actionable-with-metadata and
  https://docs.mux.com/guides/data/extend-data-with-custom-metadata#4-submitting-custom-metadata-from-mux-data-sdks for more information.
*/
const analytics = new MuxDataPlugin({
  debug: true,
  muxDataMetadata: {
    env_key: "your-mux-env-key",
    // Other custom metadata fields
  },
  privacySettings: {
    respectDoNotTrack: false,
    disableCookies: false,
  },
  locale: "" // optional locale for which the plugin will try to select a video title
});

// Add the plugin to the player
// The plugin will be initialized and start sending data to Mux as soon as the player is ready
analytics.connect(player);

// To disconnect the plugin
analytics.disconnect();

// To destroy the plugin
analytics.destroy();
```

Default fields that will be set on initialization:

```json
{
  "env_key": "<mux-env-key>",
  "player_software_name": "<player-software-name>",
  "player_software_version": "<player-software-version>",
  "player_name": "<player-name>",
  "player_version": "<player-version>",
  "player_mux_plugin_name": "<mux-plugin-name>",
  "player_mux_plugin_version": "<mux-plugin-version>",
  "player_init_time": "<player-init-time>",
  "view_session_id": "<view-session-id>",
  "viewer_os_family": "<viewer-os-family>",
  "viewer_os_version": "<viewer-os-version>",
  "viewer_os_architecture": "<viewer-os-architecture>",
  "viewer_device_name": "<viewer-device-name>",
  "viewer_device_category": "<viewer-device-category>",
  "viewer_device_manufacturer": "<viewer-device-manufacturer>",
  "video_id": "<video-id>",
  "video_stream_type": "<live/on-demand>",
  "video_cdn": "<video-cdn>",
  "video_duration": "<video-duration>",
  "video_title": "<video-title>",
}
```
