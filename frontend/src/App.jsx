import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataSourceProvider } from './context/DataSourceContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { AddMedicationPage } from './pages/AddMedicationPage';
import { MedicationDetailPage } from './pages/MedicationDetailPage';
import { EditMedicationPage } from './pages/EditMedicationPage';
import { Reports } from './pages/Reports';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataSourceProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory"     element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/inventory/add" element={<ProtectedRoute><AddMedicationPage /></ProtectedRoute>} />
          <Route path="/inventory/:id" element={<ProtectedRoute><MedicationDetailPage /></ProtectedRoute>} />
          <Route path="/inventory/:id/edit" element={<ProtectedRoute><EditMedicationPage /></ProtectedRoute>} />
          <Route path="/reports"      element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings"     element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </DataSourceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
