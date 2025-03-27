import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const CheckoutForm = ({ ticketId }) => {
  const stripe = useStripe();       // Stripe instance
  const elements = useElements();   // Stripe Elements instance
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Call backend to create PaymentIntent and get client secret
    try {
      const res = await fetch(`/tickets/${ticketId}/purchase`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Backend error creating PaymentIntent');
      }
      const clientSecret = data.client_secret;  // The PaymentIntent client secret
            // 2. Confirm the payment on the frontend using Stripe.js
            const cardElement = elements.getElement(CardElement);
            const result = await stripe.confirmCardPayment(clientSecret, {
              payment_method: {
                card: cardElement,
                // You can optionally pass billing_details or other info here
              }
            });
      
            if (result.error) {
              // Payment failed – e.g., card was declined or authentication failed
              setErrorMessage(result.error.message);
            } else if (result.paymentIntent) {
              // Payment succeeded or requires capture
              const pi = result.paymentIntent;
              if (pi.status === 'succeeded') {
                setSuccessMessage('Payment successful! 🎉');
              } else if (pi.status === 'requires_capture') {
                setSuccessMessage('Payment authorized! (Pending capture)');
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
            <CardElement options={{ hidePostalCode: true }} />
            <button type="submit" disabled={!stripe || !elements || processing}>
              {processing ? 'Processing...' : 'Pay'}
            </button>
            {errorMessage && <div className="error">Error: {errorMessage}</div>}
            {successMessage && <div className="success">{successMessage}</div>}
          </form>
        );
      };
      
      export default CheckoutForm;
      