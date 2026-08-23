interface LogoProps {
  /** Rendered size in pixels, applied to both width and height. */
  size?: number;
  className?: string;
}

/**
 * The product mark: a stack of playlist rows resolving into a play head.
 * Kept inline rather than loaded from /logo.svg so it costs no extra
 * request and inherits the surrounding layout.
 */
export const Logo = ({ size = 40, className }: LogoProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    className={className}
    role="img"
    aria-label="YouTube Free PiP"
  >
    <rect
      x="2"
      y="6"
      width="36"
      height="7"
      rx="3.5"
      fill="#FF0000"
      opacity=".4"
    />
    <rect
      x="2"
      y="23.5"
      width="36"
      height="7"
      rx="3.5"
      fill="#FF0000"
      opacity=".7"
    />
    <rect x="2" y="41" width="22" height="7" rx="3.5" fill="#FF0000" />
    <path d="M35 28 L60 44 L35 60 Z" fill="#FF0000" />
  </svg>
);
