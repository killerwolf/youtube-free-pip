import React, { useState, useEffect } from 'react';
import { useDebugMode } from './useDebugMode';
import type { DebugTooltipProps } from './types';

export function DebugTooltip({ 
  content, 
  position = 'top', 
  children 
}: DebugTooltipProps) {
  const { isDebugMode } = useDebugMode();
  const [isHovered, setIsHovered] = useState(false);

  // Debug component mount state
  useEffect(() => {
    if (isDebugMode) {
      console.log('DebugTooltip mounted, debug mode:', isDebugMode);
    }
  }, [isDebugMode]);

  if (!isDebugMode) {
    return <>{children}</>;
  }

  // For video container or other large elements, we'll use a different positioning approach
  const isVideoContainer = React.isValidElement(children) && 
    children.props.className?.includes('aspect-square');

  const tooltipClasses = {
    base: 'z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded pointer-events-none transition-opacity duration-200',
    position: {
      top: 'absolute bottom-full left-1/2 -translate-x-1/2 mb-1',
      bottom: 'absolute top-full left-1/2 -translate-x-1/2 mt-1',
      left: 'absolute right-full top-1/2 -translate-y-1/2 mr-1',
      right: 'absolute left-full top-1/2 -translate-y-1/2 ml-1',
    },
    videoContainer: {
      top: 'absolute top-4 left-1/2 -translate-x-1/2',
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (isDebugMode) {
      console.log('Tooltip hovered:', content);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Special handling for video container
  if (isVideoContainer) {
    return (
      <div className="relative">
        {children}
        {isHovered && (
          <div className={`${tooltipClasses.base} ${tooltipClasses.videoContainer.top}`}>
            {content}
          </div>
        )}
      </div>
    );
  }

  // Regular tooltip for other elements
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isHovered && (
        <div className={`${tooltipClasses.base} ${tooltipClasses.position[position]}`}>
          {content}
        </div>
      )}
    </div>
  );
}

// For components that need debug info without a tooltip
export function DebugInfo({ children }: { children: React.ReactNode }) {
  const { isDebugMode } = useDebugMode();

  useEffect(() => {
    if (isDebugMode) {
      console.log('DebugInfo mounted');
    }
  }, [isDebugMode]);

  if (!isDebugMode) {
    return null;
  }

  return (
    <div className="text-xs text-gray-500 mt-1">
      {children}
    </div>
  );
}