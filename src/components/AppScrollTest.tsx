import React from 'react';

interface AppScrollTestProps {
  children: React.ReactNode;
}

export const AppScrollTest: React.FC<AppScrollTestProps> = ({ children }) => {
  return (
    <div
      style={{
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#020617',
      }}
    >
      <main
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </main>
    </div>
  );
};