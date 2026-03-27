import { registerChainCommandHarness } from './voice/testing/chainCommandHarness';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/Dashboard.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if (String(import.meta.env.VITE_VOICE_CHAIN_TEST_HARNESS || 'false') === 'true') {
  registerChainCommandHarness();
}
