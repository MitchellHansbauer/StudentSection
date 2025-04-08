import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/Login";
import axios from "axios";
import Marketplace from "./components/Marketplace";
import ProfilePage from "./components/ProfilePage";
import Navbar from "./components/Navbar";
import UploadSchedule from "./components/UploadSchedule";
import ScheduleCalendar from "./components/ScheduleCalendar";
import PostTicket from "./components/PostTicket";
import CheckoutForm from "./components/CheckoutForm"; // Import CheckoutForm
import "./App.css";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:5000/users/me", { withCredentials: true })
      .then((res) => {
        setUser(res.data);
      })
      .catch((err) => {
        console.error(err);
        setUser(null);
      });
  }, []);

  return (
    <Router>
      <div>
        {user && <Navbar user={user} setUser={setUser} />}
        <Routes>
          {user ? (
            <>
              <Route
                path="/marketplace"
                element={
                  user?.school !== "public" ? <Marketplace /> : <Navigate to="/" />
                }
              />
              {/* Conditionally define the UploadSchedule route */}
              <Route
                path="/uploadschedule"
                element={
                  user?.role === "Admin" ? (
                    <UploadSchedule />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/postticket" element={<PostTicket />} />
              <Route path="/checkout/:ticketId" element={<CheckoutForm />} />
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