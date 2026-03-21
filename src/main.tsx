import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpacetimeDBProvider } from 'spacetimedb/react'
import { useConnectionBuilder } from './game/useSpacetimeDB'
import './index.css'
import App from './App.tsx'
import { Pitch } from './screens/Pitch'

function Root() {
  // /pitch route skips SpacetimeDB entirely
  if (window.location.pathname === '/pitch') {
    return <Pitch />;
  }

  const builder = useConnectionBuilder();

  return (
    <SpacetimeDBProvider connectionBuilder={builder}>
      <App />
    </SpacetimeDBProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
