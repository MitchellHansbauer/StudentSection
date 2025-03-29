import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Marketplace() {
  const [listings, setListings] = useState([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate(); // hook to navigate programmatically

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = () => {
    axios
      .get('http://localhost:5000/listings')
      .then((res) => setListings(res.data.listings))
      .catch((err) => console.error(err));
  };

  // Initiate purchase on a listing and then redirect to the checkout page
  const handlePurchase = async (listingId, sellerId) => {
    setMessage(''); // clear any previous message
    try {
      // 1. Get current user (buyer) info
      const buyerRes = await axios.get('http://localhost:5000/users/me', { withCredentials: true });
      const buyerData = buyerRes.data;
      if (!buyerData || !buyerData.email) {
        throw new Error('Please log in to purchase tickets.');
      }
      // 2. Get the seller's email (public profile info)
      const sellerRes = await axios.get(`http://localhost:5000/users/${sellerId}/profile`, { withCredentials: true });
      const sellerData = sellerRes.data;
      const sellerEmail = sellerData.profile?.email;
      console.log(`Buyer: ${buyerData.email}, Seller: ${sellerEmail}`); 

      // 3. Mark the ticket as pending by calling the purchase endpoint
      await axios.post(`http://localhost:5000/tickets/${listingId}/purchase`, {}, { withCredentials: true });
      // If successful, the ticket is now pending (reserved for this buyer)

      // 4. Redirect to checkout page to complete payment
      navigate(`/checkout/${listingId}`);
    } catch (err) {
      console.error(err);
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
              <th>Event</th>
              <th>Section</th>
              <th>Row</th>
              <th>Seat</th>
              <th>Price</th>
              <th>Seller</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.listing_id}>
                <td>{listing.event_name}</td>
                <td>{listing.section}</td>
                <td>{listing.row}</td>
                <td>{listing.seat_number}</td>
                <td>${listing.price.toFixed(2)}</td>
                <td>{listing.seller_name}</td>
                <td>
                  <button onClick={() => handlePurchase(listing.listing_id, listing.seller_id)}>
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
