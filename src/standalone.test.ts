import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import manifestSource from '../public/manifest.webmanifest?raw';

// Installed on an iPhone home screen, the app only sheds Safari's chrome if
// the shell declares it. None of this is exercised by React, so pin the
// declarations here: losing any one of them silently puts the browser bars
// back.
const manifest = JSON.parse(manifestSource);
const publicFiles = Object.keys(
  import.meta.glob('../public/*', { query: '?url' })
).map((path) => path.replace('../public', ''));

describe('standalone (home-screen) install', () => {
  it('links the web manifest', () => {
    expect(html).toContain(
      '<link rel="manifest" href="/manifest.webmanifest" />'
    );
  });

  it('asks for standalone display, opening at the app root', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
  });

  it('keeps the manifest colours on the app ground', () => {
    // The colour the splash and status bar show before React paints must
    // match the gray-900 the app then renders on, or the launch flashes.
    expect(manifest.background_color).toBe('#111827');
    expect(manifest.theme_color).toBe('#111827');
    expect(html).toContain('<meta name="theme-color" content="#111827" />');
  });

  it('ships the icon sizes installers look for', () => {
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    for (const icon of manifest.icons as { src: string }[]) {
      expect(publicFiles).toContain(icon.src);
    }
  });

  it('carries the Apple meta tags for pre-17.4 iOS', () => {
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-capable" content="yes" />'
    );
    expect(html).toContain(
      '<meta name="mobile-web-app-capable" content="yes" />'
    );
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />'
    );
  });

  it('runs edge to edge so the layout can pad with the safe-area insets', () => {
    expect(html).toMatch(
      /<meta\s+name="viewport"\s+content="[^"]*viewport-fit=cover[^"]*"/
    );
  });
});
