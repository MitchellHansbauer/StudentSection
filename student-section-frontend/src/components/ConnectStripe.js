import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import { useNavigate } from 'react-router-dom';

export default function ConnectStripe() {
  const [error, setError] = useState('');
  const [instance, setInstance] = useState(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let onboardingElement;

    (async () => {
      try {
        // 1) Get current user
        const { data: me } = await axios.get(
          'http://localhost:5000/users/me',
          { withCredentials: true }
        );

        // 2) Fetch their profile to see if we already have a stripe_account_id
        const { data: { profile } } = await axios.get(
          `http://localhost:5000/users/${me.user_id}/profile`,
          { withCredentials: true }
        );
        let accountId = profile.third_party_account?.stripe_account_id;

        // 3) If not, call your backend to create it
        if (!accountId) {
          const { data } = await axios.post(
            'http://localhost:5000/users/stripe_account',
            {},
            { withCredentials: true }
          );
          accountId = data.account;
        }

        if (!mounted) return;

        // 4) Initialize Connect.js
        const inst = loadConnectAndInitialize({
          publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
          fetchClientSecret: async () => {
            const { data } = await axios.post(
              'http://localhost:5000/users/stripe_account_session',
              { account: accountId },
              { withCredentials: true }
            );
            return data.client_secret;
          },
          appearance: { overlays: 'dialog' },
        });

        if (!mounted) return;
        setInstance(inst);

        // 5) Create the onboarding element and mount it into our container
        onboardingElement = await inst.create('account-onboarding', {
          onExit: () => navigate('/profile'),
        });
        if (containerRef.current) {
          containerRef.current.appendChild(onboardingElement);
        }
      } catch (err) {
        console.error(err);
        const msg =
          err.response?.data?.error ||
          err.message ||
          'Error initializing Stripe Connect';
        if (mounted) setError(msg);
      }
    })();

    return () => {
      mounted = false;
      // Clean up the embedded element
      if (instance && onboardingElement) {
        try {
          instance.unmount(onboardingElement);
        } catch {}
      }
    };
  }, [navigate]);

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }
  if (!instance) {
    return <div>Loading Stripe onboarding…</div>;
  }

  return (
    <div className="container mt-4">
      <h2>Stripe Onboarding</h2>
      <div ref={containerRef} />
    </div>
  );
}
