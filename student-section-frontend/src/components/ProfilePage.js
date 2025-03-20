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

  // For UC login collapse
  const [showUcLogin, setShowUcLogin] = useState(false);
  const [myTickets, setMyTickets] = useState([]);

  // UC credentials
  const [ucUserName, setUcUserName] = useState('');
  const [ucPassword, setUcPassword] = useState('');
  const [ucMessage, setUcMessage] = useState('');

  // 1) On mount, fetch the session user
  useEffect(() => {
    axios
      .get('https://studentsection.xyz/flaskapi/users/me', { withCredentials: true })
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

  // 2) Once we have userId, fetch their profile
  useEffect(() => {
    if (!userId) return;
    axios
      .get(`https://studentsection.xyz/flaskapi/users/${userId}/profile`, { withCredentials: true })
      .then((res) => {
        const loadedProfile = res.data.profile;
        setProfile((prev) => ({
          ...prev,
          ...loadedProfile,
        }));
        // Normalize the School value for comparison
        const schoolName = loadedProfile.School.trim().toLowerCase();
        if (schoolName === 'university of cincinnati' || schoolName === 'uc') {
          setShowUcLogin(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error loading profile.');
      });
  }, [userId]);
  
    // 3) Also fetch their tickets (once we have userId)
    useEffect(() => {
      if (!userId) return;
      axios.get('https://studentsection.xyz/flaskapi/tickets/mine', { withCredentials: true })
        .then((res) => {
          setMyTickets(res.data.tickets || []);
        })
        .catch((err) => {
          console.error(err);
          setError(err.response?.data?.error || 'Error loading tickets.');
        });
    }, [userId]);

  // Handle main profile changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Save profile
  const handleSave = (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!userId) {
      setError('No session found. Please log in.');
      return;
    }

    axios
      .put(
        `https://studentsection.xyz/flaskapi/users/${userId}/profile`,
        {
          phone: profile.phone,
          School: profile.School,
          FirstName: profile.FirstName,
          LastName: profile.LastName,
        },
        { withCredentials: true }
      )
      .then((res) => {
        setMessage(res.data.message || 'Profile updated successfully!');
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error updating profile.');
      });
  };

  // Connect UC account
  const handleConnectUc = (e) => {
    e.preventDefault();
    setUcMessage('');
    setError('');
  
    if (!userId) {
      setError('No session found. Please log in.');
      return;
    }
  
    // 1) Link UC account
    axios.post(
      `https://studentsection.xyz/flaskapi/users/${userId}/third_party`,
      {
        userName: ucUserName,
        password: ucPassword,
      },
      { withCredentials: true }
    )
    .then((res) => {
      setUcMessage(
        `Success! Paciolan ID connected: ${res.data.paciolan_id || 'Unknown'}`
      );
      // 2) Now automatically import tickets using the newly linked account
      return axios.post(
        'https://studentsection.xyz/flaskapi/tickets/import',
        // Optionally pass a season_code or event_date here if needed
        // e.g. { season_code: "F24" },
        {},
        { withCredentials: true }
      );
    })
    .then((importRes) => {
      // e.g. "Imported 10 new tickets"
      if (importRes.data.message) {
        setUcMessage((prev) => prev + ` | ${importRes.data.message}`);
      }
      // 3) (Optionally) re-fetch the user's tickets so they appear immediately on the page
      return axios.get('https://studentsection.xyz/flaskapi/tickets/mine', { withCredentials: true });
    })
    .then((mineRes) => {
      // Suppose you have a state setter for the user's tickets
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
  
      {/* Profile Form */}
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
  
        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </form>
  
      {/* UC Login Section */}
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
            <button type="submit" className="btn btn-danger">
              Connect UC Account
            </button>
          </form>
        </div>
      )}
  
      {/* Display User's Tickets */}
      <hr />
      <h3>My Tickets</h3>
      {myTickets.length === 0 ? (
        <p>No tickets found.</p>
      ) : (
        <ul>
          {myTickets.map((ticket) => (
            <li key={ticket._id}>
              <strong>{ticket.event_name}</strong>
              <br />
              Date: {new Date(ticket.event_date).toLocaleString()}
              <br />
              Status: {ticket.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default ProfilePage;
