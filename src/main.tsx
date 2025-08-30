import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TenantProvider } from './hooks/useTenant'
import { RoleProvider } from './hooks/useRole'
import { AuthProvider } from './context/AuthProvider'
import { ProfileProvider } from './context/ProfileProvider'
import { SessionProvider } from './contexts/SessionProvider'
import { TenantProvider as NewTenantProvider } from './contexts/TenantProvider'
import React from 'react'
import ReactDOM from 'react-dom'

// Initialize axe-core for accessibility testing in development
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}

createRoot(document.getElementById("root")!).render(
  <SessionProvider>
    <NewTenantProvider>
      <AuthProvider>
        <ProfileProvider>
          <TenantProvider>
            <RoleProvider>
              <App />
            </RoleProvider>
          </TenantProvider>
        </ProfileProvider>
      </AuthProvider>
    </NewTenantProvider>
  </SessionProvider>
);
