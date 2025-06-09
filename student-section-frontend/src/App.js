import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import axios from 'axios';

import LoginPage from './components/Login';
import Marketplace from './components/Marketplace';
import ProfilePage from './components/ProfilePage';
import ConnectPaciolan from './components/ConnectPaciolan';
import ConnectStripe from './components/ConnectStripe';
import Navbar from './components/Navbar';
import UploadSchedule from './components/UploadSchedule';
import ScheduleCalendar from './components/ScheduleCalendar';
import PostTicket from './components/PostTicket';
import CheckoutForm from './components/CheckoutForm';

import './App.css';

function App() {
  const [user, setUser] = useState(null);

  // On mount, check session
  useEffect(() => {
    axios
      .get('http://localhost:5000/users/me', { withCredentials: true })
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  return (
    <Router>
      {user && <Navbar user={user} setUser={setUser} />}

      <Routes>
        {user ? (
          <>
            {/* Marketplace (only if not public) */}
            <Route
              path="/marketplace"
              element={
                user?.school !== 'public' ? <Marketplace /> : <Navigate to="/" />
              }
            />

            {/* Upload Schedule (only if Admin) */}
            <Route
              path="/uploadschedule"
              element={
                user?.role === 'Admin' ? <UploadSchedule /> : <Navigate to="/" />
              }
            />

            {/* Profile Page */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Connect Stripe */}
            <Route path="/connect-stripe" element={<ConnectStripe />} />

            {/* Connect Paciolan */}
            <Route path="/connect-paciolan" element={<ConnectPaciolan />} />

            {/* Post Ticket */}
            <Route path="/postticket" element={<PostTicket />} />

            {/* Checkout */}
            <Route path="/checkout/:ticketId" element={<CheckoutForm />} />

            {/* Root: Calendar */}
            <Route path="/" element={<ScheduleCalendar />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            {/* If not logged in, only allow login/signup */}
            <Route
              path="/login"
              element={<LoginPage setUser={setUser} />}
            />
            <Route
              path="/signup"
              element={<LoginPage setUser={setUser} />}
            />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
