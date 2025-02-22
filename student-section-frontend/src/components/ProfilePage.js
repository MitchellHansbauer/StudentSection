import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProfilePage() {
  const [profile, setProfile] = useState({
    phone: '',
    School: '',
    FirstName: '',
    LastName: '',
    // add other fields as needed
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // On mount, fetch the user’s profile
  useEffect(() => {
    // Assume you stored user info in localStorage under key 'user'
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setError('No user data found; please log in.');
      return;
    }
    const userObj = JSON.parse(storedUser);

    // Fetch the user profile via your Flask endpoint
    axios
      .get(`http://localhost:5000/users/${userObj._id}/profile`)
      .then((res) => {
        setProfile((prev) => ({
          ...prev,
          ...res.data.profile
        }));
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.error || 'Error loading profile information.'
        );
      });
  }, []);

  // Handler for form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler for saving/updating profile
  const handleSave = (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setError('No user data found; please log in.');
      return;
    }
    const userObj = JSON.parse(storedUser);

    axios
      .put(`http://localhost:5000/users/${userObj._id}/profile`, {
        phone: profile.phone,
        School: profile.School,
        FirstName: profile.FirstName,
        LastName: profile.LastName
      })
      .then((res) => {
        setMessage(res.data.message || 'Profile updated successfully!');
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.error || 'Error updating profile.'
        );
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
