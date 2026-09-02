import { describe, expect, it } from 'vitest';
import { buildShareLink, resolveEntry } from './playlistEntry';

const PL = 'PLny0OzUBNsfBLQVK7yVyEw_Bf0tYE4QcN';
const canonical = `https://www.youtube.com/playlist?list=${PL}`;

describe('resolveEntry', () => {
  it('resolves a playlist from ?list=', () => {
    expect(resolveEntry({ pathname: '/', search: `?list=${PL}` })).toEqual({
      playlistId: PL,
      playlistUrl: canonical,
      resume: null,
    });
  });

  it('resolves a playlist from ?url=', () => {
    const search = `?url=${encodeURIComponent(canonical)}`;

    expect(resolveEntry({ pathname: '/', search })?.playlistUrl).toBe(
      canonical
    );
  });

  it('resolves a playlist from the /playlist/:id path', () => {
    expect(
      resolveEntry({ pathname: `/playlist/${PL}`, search: '' })?.playlistUrl
    ).toBe(canonical);
  });

  it('reports no entry when the link names no playlist', () => {
    expect(resolveEntry({ pathname: '/', search: '' })).toBeNull();
  });

  it('reports no entry when the playlist id is not one', () => {
    expect(
      resolveEntry({ pathname: '/', search: '?list=not-a-playlist' })
    ).toBeNull();
  });
});

describe('the resume target', () => {
  it('carries the video and position the link names', () => {
    const entry = resolveEntry({
      pathname: '/',
      search: `?list=${PL}&v=dQw4w9WgXcQ&t=304`,
    });

    expect(entry?.resume).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 304,
    });
  });
});

describe('reading a position out of a link', () => {
  const resume = (search: string) =>
    resolveEntry({ pathname: '/', search: `?list=${PL}&${search}` })?.resume;

  it('accepts the YouTube-style 123s form', () => {
    expect(resume('v=dQw4w9WgXcQ&t=304s')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 304,
    });
  });

  it('starts from zero when t is absent', () => {
    expect(resume('v=dQw4w9WgXcQ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 0,
    });
  });

  it('starts from zero when t is unparseable', () => {
    expect(resume('v=dQw4w9WgXcQ&t=later')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 0,
    });
  });

  it('clamps a negative position to zero', () => {
    expect(resume('v=dQw4w9WgXcQ&t=-30')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 0,
    });
  });

  it('ignores a v that is not an 11-character video id', () => {
    expect(resume('v=tooshort&t=30')).toBeNull();
    expect(resume('v=waytoolongvideoid&t=30')).toBeNull();
  });

  it('ignores a position with no video to apply it to', () => {
    expect(resume('t=304')).toBeNull();
  });
});

describe('buildShareLink', () => {
  const baseUrl = 'https://free-yt-pip.netlify.app';

  it('builds a playlist-only link', () => {
    expect(buildShareLink('PL1234567890', { baseUrl })).toBe(
      'https://free-yt-pip.netlify.app?list=PL1234567890'
    );
  });

  it('carries the video and the position when both are given', () => {
    expect(
      buildShareLink('PL1234567890', {
        baseUrl,
        videoId: 'dQw4w9WgXcQ',
        startSeconds: 304,
      })
    ).toBe(
      'https://free-yt-pip.netlify.app?list=PL1234567890&v=dQw4w9WgXcQ&t=304'
    );
  });

  it('omits the position when playback has not moved', () => {
    expect(
      buildShareLink('PL1234567890', {
        baseUrl,
        videoId: 'dQw4w9WgXcQ',
        startSeconds: 0,
      })
    ).toBe('https://free-yt-pip.netlify.app?list=PL1234567890&v=dQw4w9WgXcQ');
  });

  it('floors a fractional position', () => {
    expect(
      buildShareLink('PL1234567890', {
        baseUrl,
        videoId: 'dQw4w9WgXcQ',
        startSeconds: 304.9,
      })
    ).toContain('&t=304');
  });

  it('ignores a position given without a video', () => {
    expect(buildShareLink('PL1234567890', { baseUrl, startSeconds: 304 })).toBe(
      'https://free-yt-pip.netlify.app?list=PL1234567890'
    );
  });

  it('produces a link resolveEntry reads back', () => {
    const link = buildShareLink(PL, {
      baseUrl: 'https://free-yt-pip.netlify.app',
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 304,
    });

    const { search } = new URL(link);
    expect(resolveEntry({ pathname: '/', search })).toEqual({
      playlistId: PL,
      playlistUrl: canonical,
      resume: { videoId: 'dQw4w9WgXcQ', startSeconds: 304 },
    });
  });
});
