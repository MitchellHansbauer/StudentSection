import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import Logo from '../media/StudentSectionTransparent.png';
import Background from '../media/Cincy.jpg';

const HomePage = ({ user, setUser }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [error, setError] = useState('');

  // Check if the user is already logged in when the component loads
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get('http://localhost:5000/users/me', {
          withCredentials: true,
        });
        setUser(response.data); // Set the user data in the parent component
      } catch (err) {
        console.error('No active session:', err.response?.data?.error || err.message);
        // Do nothing, stay on the login form
      }
    };

    checkSession();
  }, [setUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        // Basic checks for the truly required fields
        if (!email || !password || !firstName || !lastName || !phone) {
          setError('Please fill in all required fields. (School is optional)');
          return;
        }

        // 1) Register user
        await axios.post('http://localhost:5000/users/register', {
          email,
          password,
          FirstName: firstName,
          LastName: lastName,
          phone,
          // If school is blank, the backend will default it to 'public'
          School: school,
        }, { withCredentials: true });

        // 2) Immediately log in
        await axios.post('http://localhost:5000/users/login', {
          email,
          password,
        }, { withCredentials: true });
      } else {
        // Logging in an existing user
        if (!email || !password) {
          setError('Please enter both email and password.');
          return;
        }

        // 1) Log in
        await axios.post('http://localhost:5000/users/login', { email, password }, {
          withCredentials: true,
        });
      }

      // 3) Fetch user info
      const meResponse = await axios.get('http://localhost:5000/users/me', {
        withCredentials: true,
      });
      setUser(meResponse.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Something went wrong.');
    }
  };

  const pageStyle = {
    backgroundImage: `url(${Background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  if (user) {
    // Render the main content of the home page if the user is logged in
    return (
      <div style={pageStyle}>
        <div className="text-center text-white">
          <h1>Welcome, {user.email}!</h1>
          <p>Your school: {user.school || 'Public'}</p>
          <button
            className="btn btn-danger"
            onClick={async () => {
              await axios.post('http://localhost:5000/logout', {}, { withCredentials: true });
              setUser(null); // Clear the user state
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Render the login or registration form if the user is not logged in
  return (
    <div style={pageStyle}>
      <div className="card p-4 shadow-lg" style={{ width: '400px', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <div className="text-center">
          <img src={Logo} alt="Student Section Logo" className="mb-3" style={{ width: '150px' }} />
          <h3 className="mb-4">{isRegister ? 'Register' : 'Login'}</h3>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-3">
            <input
              type="email"
              className="form-control"
              placeholder="UC Email (@mail.uc.edu)"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Additional Fields for Registration */}
          {isRegister && (
            <>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="School (optional, defaults to 'public')"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Submit button */}
          <button type="submit" className="btn btn-danger w-100">
            {isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <button className="btn btn-link mt-3 text-danger" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Switch to Login' : 'Switch to Register'}
        </button>
      </div>
    </div>
  );
};

export default HomePage;
