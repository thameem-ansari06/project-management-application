import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function JoinTeam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  // If user is already logged in with a token, try to accept directly
  useEffect(() => {
    const existingToken = localStorage.getItem('token');
    if (existingToken && token) {
      // Redirect to homepage — the MainLayout will auto-accept the invite via ?token param
      navigate(`/?token=${token}`, { replace: true });
    }
  }, [token, navigate]);

  const handleAcceptInvite = () => {
    // Navigate to the main app (login screen) with the invite params in state
    navigate('/', {
      state: {
        authView: 'login',
        inviteToken: token,
        inviteEmail: email,
        fromInvite: true,
      }
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      padding: '24px',
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
        maxWidth: '420px',
        width: '100%',
      }}>
        {/* Logo mark */}
        <div style={{
          width: '52px',
          height: '52px',
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '32px',
          boxShadow: '0 0 0 4px rgba(255,255,255,0.03)',
        }}>
          <img
            src="/xbp_asia_icon.png"
            alt="XBP ASIA"
            style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<span style="font-size:18px;font-weight:900;color:#fff">X</span>';
            }}
          />
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#ffffff',
          letterSpacing: '-0.6px',
          marginBottom: '12px',
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          Join the Workspace
        </h1>

        <p style={{
          fontSize: '15px',
          color: '#71717a',
          lineHeight: 1.6,
          textAlign: 'center',
          marginBottom: '40px',
          maxWidth: '320px',
        }}>
          You've been invited to collaborate. Sign in with Google to accept your invitation and get started.
        </p>

        {/* Email badge (if provided) */}
        {email && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '100px',
            padding: '6px 14px',
            marginBottom: '28px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: '#22c55e',
              borderRadius: '50%',
            }} />
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 500 }}>
              {email}
            </span>
          </div>
        )}

        {/* Accept Invite Button */}
        <button
          id="accept-invite-btn"
          onClick={handleAcceptInvite}
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '14px 24px',
            background: '#ffffff',
            color: '#09090b',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            letterSpacing: '-0.2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'opacity 0.15s ease, transform 0.1s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.92';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0px) scale(0.99)';
          }}
        >
          Accept invite →
        </button>

        {/* Separator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          maxWidth: '320px',
          margin: '20px 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: '#27272a' }} />
          <span style={{ fontSize: '12px', color: '#52525b', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#27272a' }} />
        </div>

        {/* Direct Google OAuth button (bypasses login screen) */}
        <a
          id="google-oauth-direct-btn"
          href={`http://127.0.0.1:8000/api/auth/google/login?invite_token=${encodeURIComponent(token)}&invite_email=${encodeURIComponent(email)}`}
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '13px 24px',
            background: 'transparent',
            color: '#e4e4e7',
            border: '1px solid #3f3f46',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            letterSpacing: '-0.1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            textDecoration: 'none',
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#52525b';
            e.currentTarget.style.background = '#18181b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#3f3f46';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* Google G SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2045c0-.638-.0573-1.252-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7177v2.2581h2.9086c1.7018-1.5668 2.6836-3.874 2.6836-6.6163z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9086-2.2581c-.8059.54-1.8368.859-3.0477.859-2.3441 0-4.3295-1.5832-5.036-3.7105H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9574C.3477 6.1732 0 7.5482 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
            <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5813C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6705 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        {/* Fine print */}
        <p style={{
          fontSize: '12px',
          color: '#3f3f46',
          marginTop: '32px',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          By accepting, you agree to the workspace collaboration terms.
        </p>
      </div>
    </div>
  );
}
