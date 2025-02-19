import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/Login';
import TicketsList from './components/TicketsList';
import Marketplace from './components/Marketplace';
import Navbar from './components/Navbar';
import UploadSchedule from './components/UploadSchedule';
import ScheduleCalendar from './components/ScheduleCalendar';
import PrivateRoute from './components/PrivateRoute'; // <--- import the wrapper

function App() {
  const user = localStorage.getItem('user'); // or parse it if you need to check fields

  return (
    <Router>
      <div>
        {/* Show the navbar only if we have a logged-in user */}
        {user && <Navbar />}

        <Routes>
          {/* Public routes for login/sign-up */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />

          {/* Wrap protected routes with <PrivateRoute> */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <TicketsList />
              </PrivateRoute>
            }
          />
          <Route
            path="/marketplace"
            element={
              <PrivateRoute>
                <Marketplace />
              </PrivateRoute>
            }
          />
          <Route
            path="/uploadschedule"
            element={
              <PrivateRoute>
                <UploadSchedule />
              </PrivateRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <PrivateRoute>
                <ScheduleCalendar />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

function PrivateRoute({ children }) {
  const user = localStorage.getItem('user');
  if (!user) {
    // Not logged in: go to /login
    return <Navigate to="/login" replace />;
  }
  // Otherwise, allow the protected content
  return children;
}

export default App;
