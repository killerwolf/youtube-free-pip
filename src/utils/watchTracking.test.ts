import { describe, expect, it } from 'vitest';
import { advance, initialWatchState } from './watchTracking';

describe('advance', () => {
  it('reports the position to save while the video is still playing', () => {
    const { progressToSave, markWatched } = advance(initialWatchState, {
      position: 100,
      duration: 600,
    });

    expect(progressToSave).toBe(100);
    expect(markWatched).toBeUndefined();
  });
});

describe('marking watched', () => {
  it('marks the video watched once it is inside the end threshold', () => {
    // A 10-minute video: the threshold is 10% of its length, so 60s from the
    // end. 545s in leaves 55s, which is inside it.
    const { markWatched } = advance(initialWatchState, {
      position: 545,
      duration: 600,
    });

    expect(markWatched).toEqual({ percentComplete: 90 });
  });
});

describe('marking only once', () => {
  it('does not mark a video watched a second time', () => {
    const first = advance(initialWatchState, { position: 545, duration: 600 });
    const second = advance(first.state, { position: 560, duration: 600 });

    expect(first.markWatched).toBeDefined();
    expect(second.markWatched).toBeUndefined();
  });

  it('keeps saving progress after the video has been marked', () => {
    const first = advance(initialWatchState, { position: 545, duration: 600 });
    const second = advance(first.state, { position: 560, duration: 600 });

    expect(second.progressToSave).toBe(560);
  });
});

describe('samples worth nothing', () => {
  it('saves nothing before playback has moved', () => {
    const decision = advance(initialWatchState, { position: 0, duration: 600 });

    expect(decision.progressToSave).toBeUndefined();
    expect(decision.markWatched).toBeUndefined();
  });

  it('saves nothing while the duration is still unknown', () => {
    // The player reports 0 until it has metadata; treating that as "no time
    // left" would mark a video watched the moment it loads.
    const decision = advance(initialWatchState, { position: 30, duration: 0 });

    expect(decision.progressToSave).toBeUndefined();
    expect(decision.markWatched).toBeUndefined();
  });

  it('saves nothing when the position is past the end', () => {
    const decision = advance(initialWatchState, {
      position: 700,
      duration: 600,
    });

    expect(decision.progressToSave).toBeUndefined();
    expect(decision.markWatched).toBeUndefined();
  });
});

describe('the end threshold', () => {
  it('holds a short video to a 30s window rather than 10% of it', () => {
    // 4 minutes: 10% would be 24s, but the floor keeps the window at 30s.
    const outside = advance(initialWatchState, {
      position: 205,
      duration: 240,
    });
    const inside = advance(initialWatchState, { position: 215, duration: 240 });

    expect(outside.markWatched).toBeUndefined();
    expect(inside.markWatched).toBeDefined();
  });

  it('holds a long video to a 2 minute window rather than 10% of it', () => {
    // 50 minutes: 10% would be 300s, but the cap keeps the window at 120s.
    const outside = advance(initialWatchState, {
      position: 2860,
      duration: 3000,
    });
    const inside = advance(initialWatchState, {
      position: 2890,
      duration: 3000,
    });

    expect(outside.markWatched).toBeUndefined();
    expect(inside.markWatched).toBeDefined();
  });

  it('marks a video watched exactly on the threshold', () => {
    // 600s video, 60s window: 540s in leaves exactly 60s.
    const decision = advance(initialWatchState, {
      position: 540,
      duration: 600,
    });

    expect(decision.markWatched).toEqual({ percentComplete: 90 });
  });
});

describe('normalising a sample', () => {
  it('floors a fractional position', () => {
    const decision = advance(initialWatchState, {
      position: 12.9,
      duration: 600,
    });

    expect(decision.progressToSave).toBe(12);
  });
});
