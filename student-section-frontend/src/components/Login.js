import React, { useState } from 'react';
import axios from 'axios';

const LoginPage = ({ setUser }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Registration-only fields:
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      // Validate required fields
      if (!email || !password || !firstName || !lastName || !phone || !school) {
        setError('Please fill in all required fields.');
        return;
      }
      // Registration request to POST /users/register
      try {
        const res = await axios.post('http://localhost:5000/users/register', {
          email,
          password,
          FirstName: firstName,
          LastName: lastName,
          phone,
          School: school
        });
        
        alert('Registration successful! You can now log in.');
        setIsRegister(false);
      } catch (err) {
        // If the server sends { error: "..."} in JSON
        if (err.response && err.response.data && err.response.data.error) {
          setError(err.response.data.error);
        } else {
          setError('Registration failed.');
        }
      }
    } else {
      // Login mode – ensure email and password are provided
      if (!email || !password) {
        setError('Please enter both email and password.');
        return;
      }
      try {
        const res = await axios.post('http://localhost:5000/users/login', { email, password });
        // If successful, the server responds with { message: "Login successful", user: {...} }
        const { user } = res.data;
        
        // Save user info to localStorage
        localStorage.setItem('user', JSON.stringify(user));
        // Lift user state up to App (so App.js knows we are logged in)
        setUser(user);
        
        // Optionally, redirect to "/" if you prefer:
        // window.location.href = "/";
        
      } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
          setError(err.response.data.error);
        } else {
          setError('Login failed.');
        }
      }
    }
  };

  return (
    <div className="login-container">
      <img
        src="StudentSectionTransparent.png"
        alt="Student Section Logo"
        className="logo"
      />
      <h2>StudentSection</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          id="email"
          placeholder="UC Email (@mail.uc.edu)"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        <input
          type="password"
          id="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {isRegister && (
          <>
            <input
              type="text"
              id="firstName"
              placeholder="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              type="text"
              id="lastName"
              placeholder="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              type="text"
              id="phone"
              placeholder="Phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              type="text"
              id="school"
              placeholder="School"
              required
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
          </>
        )}
        <button type="submit">
          {isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <button
        onClick={() => {
          setIsRegister(!isRegister);
          setError('');
        }}
        style={{
          marginTop: '10px',
          background: 'transparent',
          border: 'none',
          color: '#d1181e',
          cursor: 'pointer'
        }}
      >
        {isRegister ? 'Switch to Login' : 'Switch to Register'}
      </button>
    </div>
  );
};

export default LoginPage;
