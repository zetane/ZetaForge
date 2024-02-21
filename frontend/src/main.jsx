import App from '@/App.jsx'
import React from 'react'
import ReactDOM from 'react-dom/client'

import './demos/ipc'
//import './demos/node'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

postMessage({ payload: 'removeLoading' }, '*')
