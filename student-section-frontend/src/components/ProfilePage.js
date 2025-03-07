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

  // 1) On mount, get the user from /users/me
  useEffect(() => {
    axios
      .get('http://localhost:5000/users/me', {
        withCredentials: true, // important for cookie
      })
      .then((res) => {
        // Suppose /users/me returns something like { user_id: "...", email: "..." }
        const me = res.data;
        if (!me || !me.email) {
          // Not logged in
          setError('No session found. Please log in.');
          return;
        }
        // 2) We have a user ID from the session
        setUserId(me.user_id);
      })
      .catch((err) => {
        console.error(err);
        setError('No session found. Please log in.');
      });
  }, []);

  // 3) Once we have userId, fetch their profile
  useEffect(() => {
    if (!userId) return; // Wait for userId to be set
    axios
      .get(`http://localhost:5000/users/${userId}/profile`, {
        withCredentials: true, // send session cookie
      })
      .then((res) => {
        setProfile((prev) => ({
          ...prev,
          ...res.data.profile, // merges the fields into our local state
        }));
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error loading profile.');
      });
  }, [userId]);

  // Handler for changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 4) PUT to update profile
  const handleSave = (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!userId) {
      setError('No session found. Please log in.');
      return;
    }

    axios
      .put(`http://localhost:5000/users/${userId}/profile`, {
        phone: profile.phone,
        School: profile.School,
        FirstName: profile.FirstName,
        LastName: profile.LastName,
      }, {
        withCredentials: true, // again, include cookies
      })
      .then((res) => {
        setMessage(res.data.message || 'Profile updated successfully!');
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || 'Error updating profile.');
      });
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto' }}>
      <h2>My Profile</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

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
    </div>
  );
}

export default ProfilePage;
