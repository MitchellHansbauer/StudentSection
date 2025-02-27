import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import LoginPage from './components/Login';
import TicketsList from './components/TicketsList';
import ProfilePage from './components/ProfilePage';
import Marketplace from './components/Marketplace';
import Navbar from './components/Navbar';
import UploadSchedule from './components/UploadSchedule';
import ScheduleCalendar from "./components/ScheduleCalendar";

function App() {
  const [user, setUser] = useState(null);

  // Load user info from localStorage on mount
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
          {user ? (
            <>
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/uploadschedule" element={<UploadSchedule />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/" element={<ScheduleCalendar />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<LoginPage setUser={setUser} />} />
              <Route path="/signup" element={<LoginPage setUser={setUser} />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
