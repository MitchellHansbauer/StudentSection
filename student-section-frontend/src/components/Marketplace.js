import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Marketplace() {
  const [listings, setListings] = useState([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch available tickets from backend
    axios.get('http://localhost:5000/tickets')
      .then(res => setListings(res.data.tickets))
      .catch(err => console.error(err));
  }, []);

  const handlePurchase = async (ticketId, sellerId) => {
    setMessage('');
    try {
      const buyerRes = await axios.get('http://localhost:5000/users/me', { withCredentials: true });
      const buyerData = buyerRes.data;
      if (!buyerData || !buyerData.email) {
        throw new Error('Please log in to purchase tickets.');
      }
      const sellerRes = await axios.get(`http://localhost:5000/users/${sellerId}/profile`, { withCredentials: true });
      // (Optional: we could use sellerRes.data.profile.email if needed)
      
      await axios.post(`http://localhost:5000/tickets/${ticketId}/purchase`, {}, { withCredentials: true });
      navigate(`/checkout/${ticketId}`);  // Redirect to checkout page for this ticket
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to initiate purchase.';
      setMessage(errorMsg);
    }
  };

  return (
    <div>
      <h2>Marketplace</h2>
      {message && <p style={{ color: 'red' }}>{message}</p>}
      {listings.length === 0 ? (
        <p>No listings available.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Event</th><th>Section</th><th>Row</th>
              <th>Seat</th><th>Price</th><th>Seller</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {listings.map(listing => (
              <tr key={listing.ticket_id}>
                <td>{listing.event_name}</td>
                <td>{listing.section}</td>
                <td>{listing.row}</td>
                <td>{listing.seat}</td>
                <td>${Number(listing.price).toFixed(2)}</td>
                <td>{listing.seller_id}</td>
                <td>
                  <button onClick={() => handlePurchase(listing.ticket_id, listing.seller_id)}>
                    Buy Ticket
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Marketplace;
