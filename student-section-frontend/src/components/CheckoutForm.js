import React, { useState } from 'react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;  // Stripe.js has not loaded yet
    setProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Create a PaymentIntent by calling our backend API
      const res = await fetch(`http://localhost:5000/tickets/${ticketId}/purchase/intent`, {
        method: 'POST',
        credentials: 'include'  // include cookies for session authentication
      });
      const data = await res.json();
      if (!res.ok) {
        // If backend returned an error, throw to enter catch block
        throw new Error(data.error || 'Failed to create payment intent.');
      }
      const clientSecret = data.client_secret;

      // 2. Confirm the PaymentIntent using the card details from the CardElement
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement }
      });

      if (result.error) {
        // Payment failed (card declined, authentication failed, etc.)
        setErrorMessage(result.error.message);
      } else if (result.paymentIntent) {
        // PaymentIntent was successfully confirmed by Stripe
        const pi = result.paymentIntent;
        if (pi.status === 'succeeded') {
          // Payment is complete on Stripe's side
          // 3. Finalize the purchase on the backend (confirm ticket transfer)
          const confirmRes = await fetch(`http://localhost:5000/tickets/${ticketId}/purchase/confirm`, {
            method: 'POST',
            credentials: 'include'
          });
          const confirmData = await confirmRes.json();
          if (!confirmRes.ok) {
            // If transfer finalization failed, show an error
            const backendError = confirmData.error || 'Purchase was paid but could not be finalized.';
            setErrorMessage(backendError);
            return;  // Stay on page to let user see the error
          }
          // Backend purchase confirmation succeeded
          setSuccessMessage('Payment successful! 🎉 Ticket transfer completed.');
          // Navigate to confirmation screen (you can pass any relevant state or fetch on the next page)
          navigate('/confirmation', { state: { ticketId } });
        } else if (pi.status === 'requires_action') {
          // Payment requires additional steps (e.g., 3D Secure authentication)
          // (Stripe.js will normally handle pop-ups for 3D Secure before this status)
          setErrorMessage('Additional authentication is required to complete the payment.');
        } else if (pi.status === 'requires_capture') {
          // Payment is authorized but not captured (for manual capture flows, if used)
          setSuccessMessage('Payment authorized! (Pending capture by seller).');
          // (In this app, PaymentIntents are captured automatically, so this state is unlikely)
        }
      }
    } catch (err) {
      // Network or unexpected error occurred
      setErrorMessage(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* (Optional) You could display the ticket price or details here for user confirmation */}
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
      {/* Display any error or success messages */}
      {errorMessage && <div className="error">Error: {errorMessage}</div>}
      {successMessage && <div className="success">{successMessage}</div>}
      <button type="submit" disabled={!stripe || !elements || processing || !cardComplete}>
        {processing ? 'Processing…' : 'Pay'}
      </button>
    </form>
  );
};

export default CheckoutForm;
// Note: Ensure you have the necessary Stripe.js and React Stripe.js setup in your project.
// This includes loading the Stripe.js script and wrapping your app in the <Elements> provider.
// You can refer to the Stripe documentation for more details on how to set this up:
// https://stripe.com/docs/stripe-js/react#quick-start