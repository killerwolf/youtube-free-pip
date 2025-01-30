# Debug Tooltip Feature Design

## Overview
Implement a debug mode system controlled by URL query parameters and persisted in local storage. This system will manage the visibility of debug-related tooltips throughout the application.

## Technical Design

### 1. URL Query Parameter Handling
- Parse `?debug=1` or `?debug=0` from URL on app load
- Use URLSearchParams API for parameter extraction
- Override existing debug state if query parameter is present

### 2. Local Storage Integration
```typescript
interface DebugStorage {
  debugMode: boolean;
  lastUpdated: number;
}
```
- Store debug state in localStorage under 'youtube-pip-debug-state'
- Include timestamp for potential future state expiration
- Fall back to default (disabled) if no storage exists

### 3. Debug State Management
Create a dedicated hook `useDebugMode`:
```typescript
interface DebugModeContext {
  isDebugMode: boolean;
  toggleDebug: (force?: boolean) => void;
  setFromQueryParam: (value: string | null) => void;
}
```

### 4. Component Architecture

#### DebugProvider Component
```typescript
interface DebugProviderProps {
  children: React.ReactNode;
  defaultValue?: boolean;
}
```
Responsibilities:
- Manage debug state
- Handle URL parameter updates
- Sync with localStorage
- Provide debug context to child components

#### Debug Tooltip Component
```typescript
interface DebugTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}
```
Features:
- Only render tooltip when debug mode is active
- Position relative to parent element
- Use CSS transitions for smooth appearance

### 5. Implementation Phases

1. State Management Setup
   - Create DebugProvider
   - Implement localStorage persistence
   - Add URL parameter handling

2. Tooltip Component Development
   - Build base tooltip component
   - Add positioning logic
   - Implement show/hide transitions

3. Debug Mode Integration
   - Connect tooltip visibility to debug state
   - Add debug toggles where needed
   - Implement persistence logic

### 6. File Structure
```
src/
  components/
    debug/
      DebugProvider.tsx
      DebugTooltip.tsx
      useDebugMode.ts
      types.ts
```

### 7. Usage Example
```tsx
// App.tsx
<DebugProvider>
  <YourApp />
</DebugProvider>

// Component.tsx
const MyComponent = () => {
  return (
    <DebugTooltip content="Debug info here">
      <button>Action</button>
    </DebugTooltip>
  );
};
```

## Testing Strategy

1. Unit Tests
   - URL parameter parsing
   - Local storage persistence
   - Debug state management
   - Tooltip positioning

2. Integration Tests
   - Debug state propagation
   - Tooltip rendering conditions
   - State persistence across reloads

3. E2E Tests
   - URL parameter functionality
   - Debug mode persistence
   - Tooltip interaction

## Security Considerations

1. Sanitize all debug information displayed in tooltips
2. Ensure debug mode cannot expose sensitive information
3. Consider adding expiration to persisted debug state
4. Implement rate limiting for debug state toggles

## Future Enhancements

1. Debug level support (ERROR, WARN, INFO)
2. Custom tooltip styling per debug level
3. Debug log history in tooltips
4. Keyboard shortcuts for debug mode toggle
5. Debug state export/import functionality