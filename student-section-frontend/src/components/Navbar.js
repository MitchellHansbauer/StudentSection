import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav>
      <ul>
        <li><Link to="/">My Tickets</Link></li>
        <li><Link to="/marketplace">Marketplace</Link></li>
        <li><link to="/schedule">Schedule</link></li>
        {/* Future links for login, signup, etc. */}
      </ul>
    </nav>
  );
}

export default Navbar;