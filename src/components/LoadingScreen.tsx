import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div 
      className="loading-viewport" 
      role="status" 
      aria-live="polite" 
      aria-busy="true"
    >
      <div className="spinner" aria-hidden="true"></div>
      <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>Verifying your session...</p>
    </div>
  );
};
export default LoadingScreen;
