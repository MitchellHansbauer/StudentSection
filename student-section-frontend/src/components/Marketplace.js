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
    axios.get('http://localhost:5000/listings')
      .then(res => setListings(res.data.listings))
      .catch(err => console.error(err));
  };

  // Instead of making a direct purchase request, navigate to the checkout page
  const handlePurchase = (listingId) => {
    // Update ticket record in database via API call
    // axios.post(`http://localhost:5000/listings/${listingId}/purchase`, {}, { withCredentials: true })
    // payment intent created and added in frontend so we don't store it in the backend
    navigate(`/checkout/${listingId}`);
  };

  return (
    <div>
      <h2>Marketplace</h2>
      {message && <p>{message}</p>}
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
            {listings.map(listing => (
              <tr key={listing.listing_id}>
                <td>{listing.event_name}</td>
                <td>{listing.section}</td>
                <td>{listing.row}</td>
                <td>{listing.seat_number}</td>
                <td>${listing.price.toFixed(2)}</td>
                <td>{listing.seller_name}</td>
                <td>
                  <button onClick={() => handlePurchase(listing.listing_id)}>
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
