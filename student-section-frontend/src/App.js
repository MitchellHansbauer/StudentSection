import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/Login';
import TicketsList from './components/TicketsList';
import Marketplace from './components/Marketplace';
import Navbar from './components/Navbar';
import UploadSchedule from './components/UploadSchedule';
import ScheduleCalendar from "./components/ScheduleCalendar";

function App() {
  const [user, setUser] = useState(null);

  // On mount, try to load user info from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Router>
      <div>
        {/* Show navbar only if user is logged in */}
        {user && <Navbar />}

        <Routes>
          {/* Protected routes: only accessible if user is logged in */}
          {user ? (
            <>
              <Route path="/" element={<TicketsList />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/uploadschedule" element={<UploadSchedule />} />
              <Route path="/calendar" element={<ScheduleCalendar />} />
              {/* Optionally redirect anything else to / if logged in */}
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              {/* If no user, only allow login route */}
              <Route path="/login" element={<LoginPage setUser={setUser} />} />
              {/* Or a /signup route if you want a separate page. If you use the same component, that is fine. */}
              <Route path="/signup" element={<LoginPage setUser={setUser} />} />
              {/* Anything else should redirect to /login */}
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
