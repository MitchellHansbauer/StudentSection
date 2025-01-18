import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TicketsList() {
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState('');

  const userId = 1; // Replace with actual user ID
  const seasonCode = 'FB17'; // Replace with actual season code

  useEffect(() => {
    // Fetch tickets from the backend
    axios.post('http://localhost:5000/tickets/list', {
      user_id: userId,
      season_code: seasonCode,
    })
    .then(() => {
      // Then, fetch the tickets from the database
      axios.get(`http://localhost:5000/users/${userId}/tickets`)
        .then(res => setTickets(res.data.tickets))
        .catch(err => console.error(err));
    })
    .catch(error => {
      console.error('Error fetching tickets:', error);
    });
  }, []);

  const handleListTicket = (ticketId) => {
    const price = prompt('Enter the price for the ticket:');
    if (price) {
      axios.post('http://localhost:5000/listings/create', {
        ticket_id: ticketId,
        seller_id: userId,
        price: parseFloat(price),
      })
      .then(res => {
        setMessage(res.data.message);
        // Update ticket list to reflect the listed ticket
        setTickets(tickets.map(ticket => {
          if (ticket.ticket_id === ticketId) {
            return { ...ticket, is_listed: true };
          }
          return ticket;
        }));
      })
      .catch(error => {
        setMessage(error.response.data.error);
        console.error(error);
      });
    }
  };

  const handleUnlistTicket = (ticketId) => {
    axios.delete('http://localhost:5000/listings/delete', {
      data: { ticket_id: ticketId, user_id: userId }
    })
    .then(res => {
      setMessage(res.data.message);
      // Update ticket list to reflect the unlisted ticket
      setTickets(tickets.map(ticket => {
        if (ticket.ticket_id === ticketId) {
          return { ...ticket, is_listed: false };
        }
        return ticket;
      }));
    })
    .catch(error => {
      setMessage(error.response.data.error);
      console.error(error);
    });
  };

  return (
    <div>
      <h2>My Tickets</h2>
      {message && <p>{message}</p>}
      {tickets.length === 0 ? (
        <p>No tickets available.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Section</th>
              <th>Row</th>
              <th>Seat</th>
              <th>Price</th>
              <th>Listed</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(ticket => (
              <tr key={ticket.ticket_id}>
                <td>{ticket.event_name}</td>
                <td>{ticket.section}</td>
                <td>{ticket.row}</td>
                <td>{ticket.seat_number}</td>
                <td>${ticket.price.toFixed(2)}</td>
                <td>{ticket.is_listed ? 'Yes' : 'No'}</td>
                <td>
                  {!ticket.is_listed && (
                    <button onClick={() => handleListTicket(ticket.ticket_id)}>
                      List for Sale
                    </button>
                  )}
                  {ticket.is_listed && (
                    <button onClick={() => handleUnlistTicket(ticket.ticket_id)}>
                      Refund Ticket
                    </button>
                  )}
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
