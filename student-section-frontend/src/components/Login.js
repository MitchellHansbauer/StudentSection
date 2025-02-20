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

    if (isRegister) {
      if (!email || !password || !firstName || !lastName || !phone || !school) {
        setError('Please fill in all required fields.');
        return;
      }
      try {
        const res = await axios.post('http://localhost:5000/users/register', {
          email,
          password,
          FirstName: firstName,
          LastName: lastName,
          phone,
          School: school,
        });

        alert('Registration successful! You can now log in.');
        setIsRegister(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Registration failed.');
      }
    } else {
      if (!email || !password) {
        setError('Please enter both email and password.');
        return;
      }
      try {
        const res = await axios.post('http://localhost:5000/users/login', { email, password });
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
      } catch (err) {
        setError(err.response?.data?.error || 'Login failed.');
      }
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
                <input type="text" className="form-control" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="mb-3">
                <input type="text" className="form-control" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="mb-3">
                <input type="text" className="form-control" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="mb-3">
                <input type="text" className="form-control" placeholder="School" value={school} onChange={(e) => setSchool(e.target.value)} />
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
