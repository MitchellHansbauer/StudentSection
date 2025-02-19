import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/Login';
import TicketsList from './components/TicketsList';
import Marketplace from './components/Marketplace';
import Navbar from './components/Navbar';
import UploadSchedule from './components/UploadSchedule';
import ScheduleCalendar from "./components/ScheduleCalendar";

function App() {
  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
          <Route path="/" element={<TicketsList />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/uploadschedule" element={<UploadSchedule />} />
          <Route path="/calendar" element={<ScheduleCalendar />} />
          {/* Other routes */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
