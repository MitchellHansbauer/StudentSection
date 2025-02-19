import React, { useState } from 'react';

const LoginPage = () => {
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
      // Registration request to POST /users
      try {
        const res = await fetch('/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            FirstName: firstName,
            LastName: lastName,
            phone,
            School: school
          })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Registration failed.');
        } else {
          alert('Registration successful! You can now log in.');
          setIsRegister(false);
        }
      } catch (err) {
        setError('An error occurred during registration.');
      }
    } else {
      // Login mode – ensure email and password are provided
      if (!email || !password) {
        setError('Please enter both email and password.');
        return;
      }
      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Login failed.');
        } else {
          alert('Login successful!');
          // Optionally, redirect or set user data in context/state
        }
      } catch (err) {
        setError('An error occurred during login.');
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
        {/* Display error for email (or overall) */}
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
        style={{ marginTop: '10px', background: 'transparent', border: 'none', color: '#d1181e', cursor: 'pointer' }}
      >
        {isRegister ? 'Switch to Login' : 'Switch to Register'}
      </button>
    </div>
  );
};

export default LoginPage;
