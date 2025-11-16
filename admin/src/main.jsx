import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './index.css'

function App(){
  const token = localStorage.getItem('nerobot_token')
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/app/*" element={token ? <Dashboard/> : <Navigate to="/login" replace/>} />
        <Route path="/" element={<Navigate to={token? '/app' : '/login'} replace/>} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
