import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../media/StudentSectionTransparent.png';
import 'bootstrap/dist/css/bootstrap.min.css';

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [hamburgerOpen, setHamburgerOpen] = useState(false);

  const onLogoutClick = async () => {
    try {
      await axios.post("http://localhost:5000/logout", {}, {
        withCredentials: true,
      });
      setUser(null);
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark position-relative">
      <div className="container-fluid">
        {/* Logo */}
        <Link className="navbar-brand" to="/">
          <img src={Logo} alt="Student Section Logo" className="logo-placeholder" style={{ height: "40px" }} />
        </Link>

        {/* Toggle Button for Mobile (Bootstrap default) */}
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
          aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navbar Links */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/marketplace">Marketplace</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/uploadschedule">Upload Schedule</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/">Calendar</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/profile">Profile</Link>
            </li>
            <li className="nav-item">
              <button className="btn btn-danger nav-link" onClick={onLogoutClick}>
                Logout
              </button>
            </li>
          </ul>
        </div>

        {/* Additional Hamburger Dropdown Menu */}
        {/* This custom hamburger is visible on smaller screens (d-lg-none) */}
        <div className="hamburger-dropdown d-lg-none" onClick={() => setHamburgerOpen(!hamburgerOpen)} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '1.8em', color: 'white' }}>☰</span>
        </div>
      </div>

      {/* Custom Dropdown Menu for the Hamburger */}
      {hamburgerOpen && (
        <div 
          className="custom-dropdown-menu bg-dark" 
          style={{
            position: 'absolute',
            top: '60px', // adjust based on your navbar height
            right: '20px',
            border: '1px solid #444',
            borderRadius: '4px',
            zIndex: 1050,
            width: '150px'
          }}
        >
          <ul className="list-unstyled mb-0">
            <li>
              <a 
                href="/ProfilePage/Profile%20Page.html" 
                className="dropdown-item text-white"
                onClick={() => setHamburgerOpen(false)}
              >
                Profile
              </a>
            </li>
            <li>
              <Link className="dropdown-item text-white" to="/tickets" onClick={() => setHamburgerOpen(false)}>My Tickets</Link>
            </li>
            <li>
              <a 
                className="dropdown-item text-white" 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onLogoutClick();
                  setHamburgerOpen(false);
                }}
              >
                Log Out
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
