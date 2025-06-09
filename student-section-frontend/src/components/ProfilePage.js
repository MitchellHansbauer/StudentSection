import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

function ProfilePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({
    phone: '',
    School: '',
    FirstName: '',
    LastName: '',
    third_party_account: null,
    stripe_account: null,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [myTickets, setMyTickets] = useState([]);

  // 1) On mount, fetch current session user
  useEffect(() => {
    axios
      .get('http://localhost:5000/users/me', { withCredentials: true })
      .then((res) => {
        const me = res.data;
        if (!me || !me.user_id) {
          setError('No session found. Please log in.');
          return;
        }
        setUserId(me.user_id);
      })
      .catch(() => {
        setError('No session found. Please log in.');
      });
  }, []);

  // 2) Once we have userId, load profile
  useEffect(() => {
    if (!userId) return;
    axios
      .get(`http://localhost:5000/users/${userId}/profile`, { withCredentials: true })
      .then((res) => {
        const loadedProfile = res.data.profile;
        setProfile((prev) => ({
          ...prev,
          ...loadedProfile,
        }));
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Error loading profile.');
      });
  }, [userId]);

  // 3) Fetch user's tickets
  useEffect(() => {
    if (!userId) return;
    axios
      .get('http://localhost:5000/tickets/mine', { withCredentials: true })
      .then((res) => {
        setMyTickets(res.data.tickets || []);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Error loading tickets.');
      });
  }, [userId]);

  // 4) Fetch attendance records
  useEffect(() => {
    if (!userId) return;
    axios
      .get('http://localhost:5000/attendance', { withCredentials: true })
      .then((res) => {
        setAttendance(res.data.attendance || []);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Error loading attendance records.');
      });
  }, [userId]);

  // Handle profile input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Handle stripe account
  const handleStripeConnect = () => {
    setMessage('');
    setError('');
    if (!userId) {
      setError('No session found. Please log in.');
      return;
    }

    axios
      .post(
        'http://localhost:5000/users/stripe_account',
        {},
        { withCredentials: true }
      )
      .then((res) => {
        const { account } = res.data;
        setProfile((prev) => ({
          ...prev,
          third_party_account: {
            ...prev.third_party_account,
            stripe_account_id: account,
          },
        }));
        navigate('/connect-stripe');
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.error || 'Error creating Stripe account.'
        );
      });
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
      .put(`http://localhost:5000/users/${userId}/profile`, {
        phone: profile.phone,
        School: profile.School,
        FirstName: profile.FirstName,
        LastName: profile.LastName,
      }, { withCredentials: true })
      .then(() => {
        setMessage('Profile updated successfully.');
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Error updating profile.');
      });
  };

  // Determine onboarding status
  const hasPaciolan = !!profile.third_party_account?.paciolan_id;
  const hasStripe = !!profile.stripe_account?.id;

  return (
    <div className="container" style={{ marginTop: '40px' }}>
      <div className="row">
        {/* Left Column: Profile & Onboarding */}
        <div className="col-md-6">
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
                disabled
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
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </form>

          <hr />

          <h3>Onboarding Checklist</h3>
          <ul className="list-unstyled">
            <li className="mb-2">
              <input
                type="checkbox"
                checked={hasPaciolan}
                readOnly
                className="me-2"
              />
              {hasPaciolan ? (
                <span>School Account Connected</span>
              ) : (
                <Link to="/connect-paciolan">Connect School Account</Link>
              )}
            </li>
            <li>
              <input
                type="checkbox"
                checked={hasStripe}
                readOnly
                className="me-2"
              />
              {hasStripe ? (
                <span>Stripe Account Connected</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={handleStripeConnect}
                >
                  Connect Stripe Account
                </button>
              )}
            </li>
          </ul>
        </div>

        {/* Right Column: Tickets & Attendance */}
        <div className="col-md-6">
          <h3>My Tickets</h3>
          {myTickets.length === 0 ? (
            <p>No tickets found.</p>
          ) : (
            <ul className="list-unstyled">
              {myTickets.map((ticket) => {
                let displayStatus = ticket.status;
                if (ticket.buyer_id === userId && ticket.status === 'sold') {
                  displayStatus = 'bought';
                }
                return (
                  <li key={ticket._id} className="mb-3">
                    <strong>{ticket.event_name}</strong><br />
                    Date: {new Date(ticket.event_date).toLocaleString()}<br />
                    Status: {displayStatus}
                  </li>
                );
              })}
            </ul>
          )}

          <hr />

          <h3>Events I'm Attending</h3>
          {attendance.length === 0 ? (
            <p>No attendance records found.</p>
          ) : (
            <ul className="list-unstyled">
              {attendance.map((record) => (
                <li key={record._id} className="mb-3">
                  <strong>{record.event_name}</strong><br />
                  Date: {new Date(record.event_date).toLocaleString()}<br />
                  Venue: {record.venue}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
