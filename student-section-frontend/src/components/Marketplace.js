import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Marketplace() {
  const [listings, setListings] = useState([]);
  const [message, setMessage] = useState('');

  const userId = 2; // Replace with actual user ID

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = () => {
    axios.get('http://localhost:5000/listings')
      .then(res => setListings(res.data.listings))
      .catch(err => console.error(err));
  };

  const handlePurchase = (listingId) => {
    axios.post('http://localhost:5000/transactions/purchase', {
      listing_id: listingId,
      buyer_id: userId,
    })
    .then(res => {
      setMessage(res.data.message);
      fetchListings(); // Refresh listings
    })
    .catch(error => {
      setMessage(error.response.data.error);
      console.error(error);
    });
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
