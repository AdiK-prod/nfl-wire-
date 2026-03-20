import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Confirmed from './pages/Confirmed';
import SubmitSource from './pages/SubmitSource';
import Unsubscribe from './pages/Unsubscribe';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import SourceQueueView from './pages/admin/SourceQueueView';
import ContentPreviewView from './pages/admin/ContentPreviewView';
import SubscriberInsightsView from './pages/admin/SubscriberInsightsView';
import ValidationLogsView from './pages/admin/ValidationLogsView';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/confirmed" element={<Confirmed />} />
          <Route path="/submit-source" element={<SubmitSource />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          >
            <Route path="sources" element={<SourceQueueView />} />
            <Route path="content" element={<ContentPreviewView />} />
            <Route path="subscribers" element={<SubscriberInsightsView />} />
            <Route path="logs" element={<ValidationLogsView />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

