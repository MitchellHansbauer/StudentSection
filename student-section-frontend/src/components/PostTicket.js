import React, { useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";

function PostTicket() {
  const location = useLocation();
  const initialData = location.state || {};

  const [formData, setFormData] = useState({
    event_name: initialData.event_name || "",
    event_date: initialData.event_date || "",
    venue: initialData.venue || "",
    price: ""
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post("http://localhost:5000/tickets", formData, { withCredentials: true })
      .then((res) => {
        setMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
        setMessage(err.response?.data?.error || "Error posting ticket");
      });
  };

  return (
    <div className="container">
      <h2>List Your Ticket for This Event</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Event Name</label>
          <input
            type="text"
            className="form-control"
            name="event_name"
            value={formData.event_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Event Date (ISO format)</label>
          <input
            type="text"
            className="form-control"
            name="event_date"
            value={formData.event_date}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Venue</label>
          <input
            type="text"
            className="form-control"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Price (in USD)</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary mt-3">
          Post Ticket
        </button>
      </form>
    </div>
  );
}

export default PostTicket;