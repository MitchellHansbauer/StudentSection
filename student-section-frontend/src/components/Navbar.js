import React from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../media/StudentSectionTransparent.png';
import 'bootstrap/dist/css/bootstrap.min.css';

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();

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
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        {/* Logo */}
        <Link className="navbar-brand" to="/">
          <img src={Logo} alt="Student Section Logo" className="logo-placeholder" style={{ height: "40px" }} />
        </Link>

        {/* Toggle Button for Mobile */}
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
      </div>
    </nav>
  );
};

export default Navbar;