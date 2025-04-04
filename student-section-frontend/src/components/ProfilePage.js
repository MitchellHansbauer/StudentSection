import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ProfilePage() {
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({
    phone: '',
    School: '',
    FirstName: '',
    LastName: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [attendance, setAttendance] = useState([]); // new state for attendance records

  // For UC login section toggle
  const [showUcLogin, setShowUcLogin] = useState(false);
  const [myTickets, setMyTickets] = useState([]);

  // UC login credentials and messages
  const [ucUserName, setUcUserName] = useState('');
  const [ucPassword, setUcPassword] = useState('');
  const [ucMessage, setUcMessage] = useState('');

  // 1) On mount, fetch the current session user
  useEffect(() => {
    axios
      .get('http://localhost:5000/users/me', { withCredentials: true })
      .then((res) => {
        const me = res.data;
        if (!me || !me.email) {
          setError('No session found. Please log in.');
          return;
        }
        setUserId(me.user_id);
      })
      .catch((err) => {
        console.error(err);
        setError('No session found. Please log in.');
      });
  }, []);

  // 2) Once we have userId, load their profile info
  useEffect(() => {
    if (!userId) return;
    axios
      .get(`http://localhost:5000/users/${userId}/profile`, { withCredentials: true })
      .then((res) => {
        const loadedProfile = res.data.profile;
        setProfile((prev) => ({
          ...prev,
          ...loadedProfile,
        }));
        // If the user's school is UC, show UC login section
        const schoolName = loadedProfile.School?.trim().toLowerCase();
        if (schoolName === 'university of cincinnati' || schoolName === 'uc') {
          setShowUcLogin(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error loading profile.');
      });
  }, [userId]);

  // 3) Fetch the current user's tickets (as seller or buyer) once userId is available
  useEffect(() => {
    if (!userId) return;
    axios
      .get('http://localhost:5000/tickets/mine', { withCredentials: true })
      .then((res) => {
        setMyTickets(res.data.tickets || []);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error loading tickets.');
      });
  }, [userId]);

  // 4) New: Fetch the events the user is attending from the /attendance endpoint
  useEffect(() => {
    if (!userId) return;
    axios
      .get('http://localhost:5000/attendance', { withCredentials: true })
      .then((res) => {
        setAttendance(res.data.attendance || []);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error loading attendance records.');
      });
  }, [userId]);

  // Handle form input changes for profile fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Save profile changes
  const handleSave = (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!userId) {
      setError('No session found. Please log in.');
      return;
    }
    axios
      .put(`http://localhost:5000/users/${userId}/profile`, profile, { withCredentials: true })
      .then(() => {
        setMessage('Profile updated successfully.');
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error updating profile.');
      });
  };

  // Connect UC (University of Cincinnati) account for ticket import
  const handleConnectUc = (e) => {
    e.preventDefault();
    setUcMessage('');
    setError('');
    if (!userId) {
      setError('No session found. Please log in.');
      return;
    }
    // 1) Link the UC account via backend
    axios
      .post(
        `http://localhost:5000/users/${userId}/third_party`,
        { userName: ucUserName, password: ucPassword },
        { withCredentials: true }
      )
      .then((res) => {
        setUcMessage(`Success! Paciolan ID connected: ${res.data.paciolan_id || 'Unknown'}`);
        // 2) Import tickets from the linked account
        return axios.post('http://localhost:5000/tickets/import', {}, { withCredentials: true });
      })
      .then((importRes) => {
        if (importRes.data.message) {
          setUcMessage((prev) => prev + ` | ${importRes.data.message}`);
        }
        // 3) Refresh the user's tickets list to include newly imported tickets
        return axios.get('http://localhost:5000/tickets/mine', { withCredentials: true });
      })
      .then((mineRes) => {
        setMyTickets(mineRes.data.tickets || []);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error connecting UC account or importing tickets.');
      });
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto' }}>
      <h2>My Profile</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Profile Update Form */}
      <form onSubmit={handleSave}>
        <div className="mb-3">
          <label>Phone</label>
          <input
            name="phone"
            className="form-control"
            value={profile.phone}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label>School</label>
          <input
            name="School"
            className="form-control"
            value={profile.School}
            onChange={handleChange}
            disabled
          />
        </div>
        <div className="mb-3">
          <label>First Name</label>
          <input
            name="FirstName"
            className="form-control"
            value={profile.FirstName}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label>Last Name</label>
          <input
            name="LastName"
            className="form-control"
            value={profile.LastName}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>

      {/* UC/Paciolan Account Link Section (shown only for UC users) */}
      {showUcLogin && (
        <div style={{ marginTop: '1rem' }}>
          <h4>UC/Paciolan Login</h4>
          {ucMessage && <p style={{ color: 'green' }}>{ucMessage}</p>}
          <form onSubmit={handleConnectUc}>
            <div className="mb-3">
              <label>UC Email / Username</label>
              <input
                type="text"
                className="form-control"
                value={ucUserName}
                onChange={(e) => setUcUserName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label>UC Password</label>
              <input
                type="password"
                className="form-control"
                value={ucPassword}
                onChange={(e) => setUcPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-danger">Connect UC Account</button>
          </form>
        </div>
      )}

      {/* Display the user's tickets */}
      <hr />
      <h3>My Tickets</h3>
      {myTickets.length === 0 ? (
        <p>No tickets found.</p>
      ) : (
        <ul>
          {myTickets.map((ticket) => {
            // For purchased tickets, display status as "bought" if the logged-in user is the buyer and the status is "sold"
            let displayStatus = ticket.status;
            if (ticket.buyer_id && ticket.buyer_id === userId && ticket.status === 'sold') {
              displayStatus = 'bought';
            }
            return (
              <li key={ticket._id}>
                <strong>{ticket.event_name}</strong>
                <br />
                Date: {new Date(ticket.event_date).toLocaleString()}
                <br />
                Status: {displayStatus}
              </li>
            );
          })}
        </ul>
      )}

      {/* New Section: Display the events the user is attending */}
      <hr />
      <h3>Events I'm Attending</h3>
      {attendance.length === 0 ? (
        <p>No attendance records found.</p>
      ) : (
        <ul>
          {attendance.map((record) => (
            <li key={record._id}>
              <strong>{record.event_name}</strong>
              <br />
              Date: {new Date(record.event_date).toLocaleString()}
              <br />
              Venue: {record.venue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProfilePage;
