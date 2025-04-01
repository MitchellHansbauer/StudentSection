import React, { useState, useEffect, useRef } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const location = useLocation();
  const navigate = useNavigate();
  const { ticketId } = useParams();

  // UI state for feedback
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  // Timer state: 6-minute window (360 seconds)
  const [timeLeft, setTimeLeft] = useState(360); 
  const timerId = useRef(null);
  const purchaseFinalized = useRef(false);

  // Setup the 6-minute countdown and add a beforeunload listener
  useEffect(() => {
    purchaseFinalized.current = false;
    timerId.current = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    // beforeunload listener: triggers when the user leaves the page (refresh/close)
    const handleBeforeUnload = (e) => {
      if (!purchaseFinalized.current) {
        navigator.sendBeacon(`http://localhost:5000/tickets/${ticketId}/purchase`);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timerId.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [ticketId]);

  // Cancel purchase if the countdown reaches zero
  useEffect(() => {
    if (timeLeft === 0 && !purchaseFinalized.current) {
      purchaseFinalized.current = true; // prevent duplicate calls
      fetch(`http://localhost:5000/tickets/${ticketId}/purchase`, {
        method: 'DELETE',
        credentials: 'include'
      })
        .then(() => {
          setErrorMessage("Your 6-minute purchase window has expired. The ticket has been released.");
        })
        .catch(err => console.error('Error cancelling purchase on timeout:', err));
    }
  }, [timeLeft, ticketId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Create a PaymentIntent via the backend
      const res = await fetch(`http://localhost:5000/tickets/${ticketId}/purchase/intent`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create payment intent.');
      }
      const clientSecret = data.client_secret;

      // 2. Confirm the PaymentIntent using card details
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement }
      });

      if (result.error) {
        setErrorMessage(result.error.message);
      } else if (result.paymentIntent) {
        const pi = result.paymentIntent;
        if (pi.status === 'succeeded') {
          // 3. Finalize the purchase on the backend
          const confirmRes = await fetch(`http://localhost:5000/tickets/${ticketId}/purchase/confirm`, {
            method: 'POST',
            credentials: 'include'
          });
          const confirmData = await confirmRes.json();
          if (!confirmRes.ok) {
            const backendError = confirmData.error || 'Purchase was paid but could not be finalized.';
            setErrorMessage(backendError);
            return;
          }
          setSuccessMessage('Payment successful! 🎉 Ticket transfer completed.');
          purchaseFinalized.current = true;  // mark as finalized to prevent cancellation
          clearInterval(timerId.current);
          // Redirect to the homepage after a brief delay
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else if (pi.status === 'requires_action') {
          setErrorMessage('Additional authentication is required to complete the payment.');
        } else if (pi.status === 'requires_capture') {
          setSuccessMessage('Payment authorized! (Pending capture by seller).');
        }
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p><strong>Time remaining:</strong> {Math.floor(timeLeft/60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
      <label htmlFor="card-element">Card Information</label>
      <CardElement
        id="card-element"
        options={{ hidePostalCode: true }}
        onChange={(e) => {
          if (e.error) {
            setErrorMessage(e.error.message);
          } else {
            setErrorMessage(null);
          }
          setCardComplete(e.complete);
        }}
      />
      {errorMessage && <div className="error">Error: {errorMessage}</div>}
      {successMessage && <div className="success">{successMessage}</div>}
      <button 
        type="submit" 
        disabled={!stripe || !elements || processing || !cardComplete || timeLeft <= 0}>
        {processing ? 'Processing…' : 'Pay'}
      </button>
    </form>
  );
};

export default CheckoutForm;
