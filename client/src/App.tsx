// client/src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import OperatorDashboard from './pages/OperatorDashboard';
import DispatcherDashboard from './pages/DispatcherDashboard';
import FieldUnitDashboard   from './pages/FieldUnitDashboard';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminDashboard       from './pages/AdminDashboard';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/operator"
        element={
          <ProtectedRoute>
            <OperatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dispatcher"
        element={<ProtectedRoute><DispatcherDashboard/></ProtectedRoute>}
      />
      <Route
        path="/field-unit/*"
        element={
          <ProtectedRoute>
            <FieldUnitDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
