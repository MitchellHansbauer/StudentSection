import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import Logo from '../media/StudentSectionTransparent.png';
import Background from '../media/Cincy.jpg';

const LoginPage = ({ setUser }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    try {
      if (isRegister) {
        // Basic checks
        if (!email || !password || !firstName || !lastName || !phone || !school) {
          setError('Please fill in all required fields.');
          return;
        }
  
        // 1) Register user
        await axios.post('http://localhost:5000/users/register', {
          email,
          password,
          FirstName: firstName,
          LastName: lastName,
          phone,
          School: school,
        }, { withCredentials: true });
  
        // 2) Immediately log in
        await axios.post('http://localhost:5000/users/login', {
          email,
          password,
        }, { withCredentials: true });
  
        // 3) Fetch user info from /users/me
        const meResponse = await axios.get('http://localhost:5000/users/me', {
          withCredentials: true,
        });
        setUser(meResponse.data);  // meResponse.data could be { email, school, etc. }
  
        alert('Registration successful! You are now logged in.');
  
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
  
        // 2) Fetch user info
        const meResponse = await axios.get('http://localhost:5000/users/me', {
          withCredentials: true,
        });
        setUser(meResponse.data);
  
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Something went wrong.');
    }
  };


  // Inline styles for background image
  const pageStyle = {
    backgroundImage: `url(${Background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <div style={pageStyle}>
      <div className="card p-4 shadow-lg" style={{ width: '400px', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <div className="text-center">
          <img src={Logo} alt="Student Section Logo" className="mb-3" style={{ width: '150px' }} />
          <h3 className="mb-4">{isRegister ? 'Register' : 'Login'}</h3>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
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
                  placeholder="School"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </div>
            </>
          )}
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

export default LoginPage;
