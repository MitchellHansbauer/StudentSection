import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ProfilePage() {
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({ phone: '', School: '', FirstName: '', LastName: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add state for the UC login toggling
  const [showUcLogin, setShowUcLogin] = useState(false);

  // For UC login credentials
  const [ucUserName, setUcUserName] = useState('');
  const [ucPassword, setUcPassword] = useState('');
  const [ucMessage, setUcMessage] = useState('');

  // 1) On mount, fetch user session
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

  // 2) Once we have userId, fetch their profile
  useEffect(() => {
    if (!userId) return;
    axios
      .get(`http://localhost:5000/users/${userId}/profile`, { withCredentials: true })
      .then((res) => {
        setProfile((prev) => ({ ...prev, ...res.data.profile }));
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error loading profile.');
      });
  }, [userId]);

  // Handler for changes to main profile fields
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
      .put(
        `http://localhost:5000/users/${userId}/profile`,
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

  // Connect to UC account
  const handleConnectUc = (e) => {
    e.preventDefault();
    setUcMessage('');
    setError('');

    if (!userId) {
      setError('No session found. Please log in.');
      return;
    }

    axios
      .post(
        `http://localhost:5000/users/${userId}/third_party`,
        { userName: ucUserName, password: ucPassword },
        { withCredentials: true }
      )
      .then((res) => {
        setUcMessage(
          `Success! Paciolan ID connected: ${res.data.paciolan_id || 'Unknown'}`
        );
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error connecting UC account.');
      });
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto' }}>
      <h2>My Profile</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Existing Profile Form */}
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

      <hr />
      {/* Button to toggle display of UC login fields */}
      <button
        type="button"
        className="btn btn-secondary"
        style={{ margin: '10px 0' }}
        onClick={() => setShowUcLogin(!showUcLogin)}
      >
        {showUcLogin ? 'Hide UC Connect' : 'Connect your UC Ticketing'}
      </button>

      {/* Conditionally rendered UC login section */}
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
    </div>
  );
}

export default ProfilePage;
