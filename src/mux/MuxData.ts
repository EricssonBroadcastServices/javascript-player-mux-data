import mux from "mux-embed";
import platform from "platform";

import type {
  AllEvent,
  PlayerEventsMap,
  RedBeePlayer,
} from "@redbeemedia/javascript-player";
// eslint-disable-next-line no-duplicate-imports
import { PlayerEvents } from "@redbeemedia/javascript-player";

export interface IMuxData {
  env_key: string;
  video_id?: string;
  video_title?: string;
  video_cdn?: string;
  video_content_type?: string;
  video_duration?: number;
  video_encoding_variant?: string;
  video_language_code?: string;
  video_producer?: string;
  video_series?: string;
  video_stream_type?: string;
  video_variant_name?: string;
  video_variant_id?: string;
  video_target_duration?: number;
  video_source_url?: string;
  video_part_holdback?: boolean;
  video_part_target_duration?: number;
  video_source_bitrate?: number;
  video_holdback?: boolean;
  player_init_time?: number;
  player_name?: string;
  player_version?: string;
  player_autoplay?: boolean;
  player_height?: number;
  player_instance_id?: string;
  player_language?: string;
  player_poster?: string;
  player_preload?: string;
  player_program_time?: number;
  player_remote_played?: boolean;
  player_software_name?: string;
  player_software_version?: string;
  player_source_height?: number;
  player_source_width?: number;
  player_width?: number;
  player_live_edge_program_time?: number;
  player_manifest_newest_program_time?: number;
  player_mux_plugin_name?: string;
  player_mux_plugin_version?: string;
  source_type?: string;
  experiment_name?: string;
  page_type?: string;
  browser?: string;
  browser_version?: string;
  cdn?: string;
  sub_property_id?: string;
  operating_system?: string;
  operating_system_version?: string;
  page_url?: string;
  used_fullscreen?: boolean;
  view_session_id?: string;
  viewer_user_id?: string;
  viewer_connection_type?: string;
  viewer_device_manufacturer?: string;
  viewer_device_category?: string;
  viewer_device_model?: string;
  viewer_device_name?: string;
  viewer_os_family?: string;
  viewer_os_version?: string;
  viewer_os_architecture?: number;
  viewer_application_engine?: string;
  viewer_application_name?: string;
  viewer_application_version?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface privacySettings {
  respectDoNotTrack: boolean;
  disableCookies: boolean;
}

export interface IMuxDataPluginOptions {
  debug?: boolean;
  muxDataMetadata: IMuxData;
  privacySettings?: privacySettings;
  locale?: string;
}

export class MuxData {
  protected playerInstance?: RedBeePlayer;
  protected playerId: string;
  protected sessionEnded = false;
  protected currentTimeMs = 0;
  protected muxDataMetadata: IMuxData;
  protected privacySettings?: privacySettings;
  protected locale: string;
  protected mux = mux;
  protected initTime = 0;
  protected droppedFramesCount = 0;
  protected debug = false;


  constructor(options: IMuxDataPluginOptions) {
    this.debug = options.debug || false;
    this.playerId = this.mux.utils.generateUUID();
    this.muxDataMetadata = options.muxDataMetadata;
    this.privacySettings = options.privacySettings;
    this.locale = options.locale || "en";
    this.onPlayerEvents = this.onPlayerEvents.bind(this);
  }

  connect(playerInstance: RedBeePlayer) {
    this.playerInstance = playerInstance;
    this.setupEventListeners();
  }

  disconnect(): void {
    this.sessionEnded = true;
  }

  destroy() {
    this.playerInstance?.offAll(this.onPlayerEvents);
    this.mux.emit(this.playerId, "destroy");
  }

  private setup(): void {
    if (!this.playerInstance) {
      console.warn(
        "[MuxDataPlugin] No player instance found. Something went wrong..."
      );
      return;
    }
    const playerInfo = this.playerInstance.getPlayerInfo();
    const assetInfo = this.playerInstance.getAssetInfo();
    const streamInfo = this.playerInstance.getStreamInfo();
    const session = this.playerInstance.getSession();
    const data: IMuxData = {
      player_software_name: playerInfo?.playerEngine.name,
      player_software_version: playerInfo?.playerEngine.version,
      player_name: "Red Bee javascript player",
      player_version: playerInfo?.playerVersion,
      player_mux_plugin_name: this.mux.NAME,
      player_mux_plugin_version: this.mux.VERSION,
      player_init_time: this.initTime,
      view_session_id: session?.playSessionId,
      viewer_os_family: platform.os?.family,
      viewer_os_version: platform.os?.version,
      viewer_os_architecture: platform.os?.architecture,
      viewer_device_name: platform.name,
      viewer_device_category: platform.product,
      viewer_device_manufacturer: platform.manufacturer,
      video_id: assetInfo?.assetId || "",
      video_stream_type: this.playerInstance.isLive() ? "live" : "on-demand",
      video_cdn: session?.cdnProvider,
      video_duration: assetInfo?.duration || 0,
      video_title: assetInfo?.getTitle(this.locale) || "",
      video_source_url: streamInfo?.mediaLocator,
      sub_property_id: streamInfo
        ? streamInfo.hasDrm
          ? "drm"
          : "no-drm"
        : undefined,
      ...this.muxDataMetadata,
    };
    const options = {
      data,
      debug: this.debug,
      disableCookies: this.privacySettings?.disableCookies || false,
      respectDoNotTrack: this.privacySettings?.respectDoNotTrack || false,
      getPlayheadTime: () => {
        return this.currentTimeMs;
      },
      getStateData: () => {
        if (!this.playerInstance) {
          return;
        }
        const session = this.playerInstance.getSession();
        const assetInfo = this.playerInstance.getAssetInfo();
        const videoElement = this.playerInstance.getVideoElement();
        return {
          player_is_paused: !this.playerInstance.isPlaying(),
          player_autoplay_on: session?.autoplay,
          video_source_height: videoElement?.height || 0,
          video_source_width: videoElement?.width || 0,
          video_source_duration: assetInfo?.duration || 0,
          view_dropped_frame_count: this.droppedFramesCount,
        };
      },
    };

    this.mux.init(this.playerId, options);
  }

  private setupEventListeners() {
    this.playerInstance?.onAll(this.onPlayerEvents);
  }

  private onPlayerEvents({ event, data }: AllEvent<PlayerEventsMap>) {
    if (this.sessionEnded) return;
    if (data && "currentTime" in data) {
      this.currentTimeMs = this.mux.utils.secondsToMs(data.currentTime);
    }
    switch (event) {
      case PlayerEvents.LOAD_START:
        this.initTime = Date.now();
        break;
      case PlayerEvents.LOADING:
        this.onLoadingEvent();
        break;
      case PlayerEvents.LOADED:
        this.onLoadedEvent();
        break;
      case PlayerEvents.START:
      case PlayerEvents.PLAY:
      case PlayerEvents.RESUME:
        this.onPlayEvent();
        break;
      case PlayerEvents.PLAYING:
        this.onPlayingEvent();
        break;
      case PlayerEvents.PAUSE:
        this.onPauseEvent();
        break;
      case PlayerEvents.SEEKING:
        this.onSeekingEvent();
        break;
      case PlayerEvents.SEEKED:
        this.onSeekedEvent();
        break;
      case PlayerEvents.TIME_UPDATE:
        this.onTimeUpdateEvent();
        break;
      case PlayerEvents.ERROR:
        this.onErrorEvent(data);
        break;
      case PlayerEvents.ENDED:
        this.onEndedEvent();
        break;
      case PlayerEvents.BUFFERING:
        this.onBufferingEvent();
        break;
      case PlayerEvents.BUFFERED:
        this.onBufferedEvent();
        break;
      case PlayerEvents.BITRATE_CHANGED:
        this.onBitrateChangedEvent(data);
        break;
      case PlayerEvents.ADBLOCK_START:
        this.onAdblockStartEvent();
        break;
      case PlayerEvents.ADBLOCK_COMPLETE:
        this.onAdblockCompleteEvent();
        break;
      case PlayerEvents.AD_START:
        this.onAdStartEvent();
        break;
      case PlayerEvents.STOP:
        this.onStopEvent();
        break;
      case PlayerEvents.DROPPED_FRAMES:
        this.onDroppedFrames(data);
        break;
      default:
        break;
    }
  }

  private onLoadingEvent() {
    this.setup();
  }

  private onLoadedEvent() {
    this.mux.emit(this.playerId, "playerready");
  }

  private onPlayEvent() {
    this.mux.emit(this.playerId, "play");
  }

  private onPlayingEvent() {
    this.mux.emit(this.playerId, "playing");
  }

  private onPauseEvent() {
    this.mux.emit(this.playerId, "pause");
  }

  private onSeekingEvent() {
    this.mux.emit(this.playerId, "seeking");
  }

  private onSeekedEvent() {
    this.mux.emit(this.playerId, "seeked");
  }

  private onTimeUpdateEvent() {
    this.mux.emit(this.playerId, "timeupdate", {
      player_playhead_time: this.currentTimeMs,
    });
  }

  private onErrorEvent(err: any) {
    this.mux.emit(this.playerId, "error", {
      player_error_code: err?.metadata?.code || 500,
      player_error_message: err.toString(),
    });
  }

  private onEndedEvent() {
    this.mux.emit(this.playerId, "ended");
  }

  private onBufferingEvent() {
    this.mux.emit(this.playerId, "rebufferstart");
  }

  private onBufferedEvent() {
    this.mux.emit(this.playerId, "rebufferend");
  }

  private onBitrateChangedEvent(data: any) {
    this.mux.emit(this.playerId, "renditionchange", {
      video_source_bitrate: data.bitrate,
    });
  }

  private onAdblockStartEvent() {
    this.mux.emit(this.playerId, "adbreakstart");
  }

  private onAdblockCompleteEvent() {
    this.mux.emit(this.playerId, "adbreakend");
  }

  private onAdStartEvent() {
    this.mux.emit(this.playerId, "adplay");
  }

  private onStopEvent() {
    this.disconnect();
  }

  private onDroppedFrames(data: any) {
    if (data?.droppedFrames) {
      this.droppedFramesCount = data.droppedFrames;
    }
  }
}
