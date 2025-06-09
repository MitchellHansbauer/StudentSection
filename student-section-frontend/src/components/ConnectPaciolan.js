import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ConnectPaciolan() {
  const [userId, setUserId] = useState(null);
  const [ucUserName, setUcUserName] = useState('');
  const [ucPassword, setUcPassword] = useState('');
  const [ucMessage, setUcMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 1) On mount, fetch current session user
  useEffect(() => {
    axios
      .get('http://localhost:5000/users/me', { withCredentials: true })
      .then((res) => {
        const me = res.data;
        if (!me || !me.user_id) {
          navigate('/login');
          return;
        }
        setUserId(me.user_id);
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate]);

  // Handle form submission
  const handleConnectUc = async (e) => {
    e.preventDefault();
    setUcMessage('');
    setError('');

    if (!userId) {
      setError('No session found. Please log in.');
      return;
    }

    try {
      // 1) Link the UC account via backend
      const linkRes = await axios.post(
        `http://localhost:5000/users/${userId}/third_party`,
        { userName: ucUserName, password: ucPassword },
        { withCredentials: true }
      );

      const paciolanId = linkRes.data.paciolan_id || 'Unknown';
      setUcMessage(`Success! Paciolan ID connected: ${paciolanId}`);

      // 2) Import tickets from the linked account
      const importRes = await axios.post(
        'http://localhost:5000/tickets/import',
        {},
        { withCredentials: true }
      );

      if (importRes.data.message) {
        setUcMessage((prev) => prev + ` | ${importRes.data.message}`);
      }

      // 3) Redirect back to profile (so the checklist checkbox can update)
      setTimeout(() => {
        navigate('/profile');
      }, 1000);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Error connecting UC account or importing tickets.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto' }}>
      <h2>Connect Your UC (Paciolan) Account</h2>
      {ucMessage && <p style={{ color: 'green' }}>{ucMessage}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleConnectUc}>
        <div className="mb-3">
          <label>UC Email / Username</label>
          <input
            type="text"
            className="form-control"
            value={ucUserName}
            onChange={(e) => setUcUserName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label>UC Password</label>
          <input
            type="password"
            className="form-control"
            value={ucPassword}
            onChange={(e) => setUcPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Connect UC Account
        </button>
      </form>
    </div>
  );
}

export default ConnectPaciolan;
