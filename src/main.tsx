import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TenantProvider } from './hooks/useTenant'
import { AuthProvider } from './context/AuthProvider'
import { ProfileProvider } from './context/ProfileProvider'
import React from 'react'
import ReactDOM from 'react-dom'

// Initialize axe-core for accessibility testing in development
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ProfileProvider>
      <TenantProvider>
        <App />
      </TenantProvider>
    </ProfileProvider>
  </AuthProvider>
);
