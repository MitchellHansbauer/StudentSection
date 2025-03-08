import React, { useEffect, useState } from 'react';
import axios from 'axios';

function TicketsList({ location }) {
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState('');

  // Check if event filtering info was passed via navigation state
  const eventFilter = location?.state || {};

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = () => {
    axios.get('http://localhost:5000/tickets', { withCredentials: true })
      .then(res => {
        let fetched = res.data.tickets;
        // Filter tickets if event_filter is provided (by event_name and/or event_date)
        if (eventFilter.event_name) {
          fetched = fetched.filter(ticket => ticket.event_name === eventFilter.event_name);
        }
        setTickets(fetched);
      })
      .catch(err => console.error(err));
  };

  const purchaseTicket = (ticketId) => {
    axios.post(`http://localhost:5000/tickets/${ticketId}/purchase`, {}, { withCredentials: true })
      .then(res => {
        setMessage(res.data.message);
        fetchTickets();
      })
      .catch(err => {
        console.error(err);
        setMessage(err.response?.data?.error || 'Purchase failed');
      });
  };

  return (
    <div className="container">
      <h2>Available Tickets {eventFilter.event_name && `for ${eventFilter.event_name}`}</h2>
      {message && <p>{message}</p>}
      {tickets.length === 0 ? (
        <p>No tickets available.</p>
      ) : (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Venue</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(ticket => (
              <tr key={ticket.ticket_id}>
                <td>{ticket.event_name}</td>
                <td>{new Date(ticket.event_date).toLocaleDateString()}</td>
                <td>{ticket.venue}</td>
                <td>{ticket.price} {ticket.currency}</td>
                <td>
                  <button onClick={() => purchaseTicket(ticket.ticket_id)} className="btn btn-primary">
                    Purchase
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

export default TicketsList;
