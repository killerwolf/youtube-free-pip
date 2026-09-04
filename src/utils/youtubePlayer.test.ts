import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountYouTubePlayer } from './youtubePlayer';

const SAMPLE_INTERVAL = 5000;
const READY_POLL_INTERVAL = 100;

interface PlayerConfig {
  videoId: string;
  playerVars?: { autoplay?: number; playsinline?: number; start?: number };
  events?: {
    onReady?: (_event: { target: FakePlayer }) => void;
    onStateChange?: (_event: { target: FakePlayer; data: number }) => void;
  };
}

/**
 * Stands in for the IFrame API player. loadVideoById deliberately does not
 * change what getVideoData reports until completeSwitch() is called: that is
 * the real behaviour this module has to survive, where the player keeps
 * reporting the outgoing video for a beat after being told to switch.
 */
class FakePlayer {
  static instances: FakePlayer[] = [];

  position = 10;
  duration = 600;
  destroyed = false;
  loadRequests: { videoId: string; startSeconds?: number }[] = [];
  private loadedVideoId: string;

  constructor(
    public element: HTMLElement,
    public config: PlayerConfig
  ) {
    this.loadedVideoId = config.videoId;
    FakePlayer.instances.push(this);
    config.events?.onReady?.({ target: this });
  }

  getCurrentTime() {
    return this.position;
  }
  getDuration() {
    return this.duration;
  }
  getPlayerState() {
    return 1;
  }
  getVideoData() {
    return { video_id: this.loadedVideoId };
  }
  loadVideoById(options: { videoId: string; startSeconds?: number }) {
    this.loadRequests.push(options);
  }
  destroy() {
    this.destroyed = true;
  }

  /** The moment YouTube actually has the newly requested video loaded. */
  completeSwitch() {
    const last = this.loadRequests[this.loadRequests.length - 1];
    if (last) this.loadedVideoId = last.videoId;
  }
}

const installApi = () => {
  vi.stubGlobal('YT', {
    Player: FakePlayer,
    PlayerState: { ENDED: 0, PAUSED: 2, UNSTARTED: -1 },
  });
};

/** Runs the ready polling and one sampling round. */
const playFor = (rounds = 1) => {
  vi.advanceTimersByTime(READY_POLL_INTERVAL);
  vi.advanceTimersByTime(SAMPLE_INTERVAL * rounds);
};

describe('mountYouTubePlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakePlayer.instances = [];
    installApi();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mount = (videoId = 'video-a') =>
    mountYouTubePlayer(document.createElement('div'), {
      videoId,
      startSeconds: 0,
    });

  it('hands playback to the native fullscreen player on iPhone', () => {
    mount();
    // playsinline: 0 is what puts iOS into its own fullscreen player, the
    // only place the Picture-in-Picture control is offered.
    expect(FakePlayer.instances[0].config.playerVars?.playsinline).toBe(0);
    expect(FakePlayer.instances[0].config.playerVars?.autoplay).toBe(1);
  });

  it('switches video without building a second player', () => {
    const handle = mount('video-a');

    handle.load('video-b', 42);

    // One player for the session: rebuilding it would lose the user
    // activation that lets iOS start later videos without a tap.
    expect(FakePlayer.instances).toHaveLength(1);
    expect(FakePlayer.instances[0].destroyed).toBe(false);
    expect(FakePlayer.instances[0].loadRequests).toEqual([
      { videoId: 'video-b', startSeconds: 42 },
    ]);
  });

  it('ignores a load for the video already playing', () => {
    const handle = mount('video-a');

    handle.load('video-a', 90);

    // The selection that mounted the player runs this path; restarting the
    // video there would throw away the position it just resumed from.
    expect(FakePlayer.instances[0].loadRequests).toEqual([]);
  });

  it('builds the player with the video asked for while the API loaded', () => {
    vi.stubGlobal('YT', undefined);
    const handle = mountYouTubePlayer(document.createElement('div'), {
      videoId: 'video-a',
      startSeconds: 0,
    });

    handle.load('video-b', 30);
    installApi();
    window.onYouTubeIframeAPIReady();

    expect(FakePlayer.instances).toHaveLength(1);
    expect(FakePlayer.instances[0].config.videoId).toBe('video-b');
    expect(FakePlayer.instances[0].config.playerVars?.start).toBe(30);
  });

  it('labels a sample with the video the player really has loaded', () => {
    const handle = mount('video-a');
    const ticks: [number, string][] = [];
    handle.on('tick', (sample, videoId) =>
      ticks.push([sample.position, videoId])
    );

    playFor();
    expect(ticks[ticks.length - 1]).toEqual([10, 'video-a']);

    // Asked to switch, but YouTube has not got there yet: this position is
    // still video-a's, and saving it against video-b would corrupt both.
    handle.load('video-b', 0);
    playFor();
    expect(ticks[ticks.length - 1]).toEqual([10, 'video-a']);

    FakePlayer.instances[0].completeSwitch();
    playFor();
    expect(ticks[ticks.length - 1]).toEqual([10, 'video-b']);
  });

  it('reports pause and end against the loaded video', () => {
    const handle = mount('video-a');
    const paused: string[] = [];
    const ended: string[] = [];
    handle.on('pause', (_sample, videoId) => paused.push(videoId));
    handle.on('ended', (_sample, videoId) => ended.push(videoId));

    const player = FakePlayer.instances[0];
    player.config.events?.onStateChange?.({ target: player, data: 2 });
    player.config.events?.onStateChange?.({ target: player, data: 0 });

    expect(paused).toEqual(['video-a']);
    expect(ended).toEqual(['video-a']);
  });

  it('stops sampling and tears the player down on destroy', () => {
    const handle = mount();
    const ticks: string[] = [];
    handle.on('tick', (_sample, videoId) => ticks.push(videoId));

    playFor();
    const seenBefore = ticks.length;
    handle.destroy();
    playFor(3);

    expect(FakePlayer.instances[0].destroyed).toBe(true);
    expect(ticks).toHaveLength(seenBefore);
  });

  it('ignores a load once destroyed', () => {
    const handle = mount('video-a');
    handle.destroy();

    handle.load('video-b', 10);

    expect(FakePlayer.instances[0].loadRequests).toEqual([]);
  });
});
