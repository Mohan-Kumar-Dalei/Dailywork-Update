import { useState } from 'react';
import { api } from './api.js';
import { cx, card, hint, statusErr } from './ui.js';

function GoogleLogo() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.5 6.6-16.3z"/>
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.2l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.3 15.5 46 24 46z"/>
      <path fill="#FBBC05" d="M11.8 28.4c-.4-1.3-.7-2.7-.7-4.4s.3-3.1.7-4.4v-5.7H4.5C2.9 17.1 2 20.4 2 24s.9 6.9 2.5 10.1l7.3-5.7z"/>
      <path fill="#EA4335" d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4 29.9 2 24 2 15.5 2 8.1 6.7 4.5 13.9l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/>
    </svg>
  );
}

function Mark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M9 9v12M15 9v12" />
    </svg>
  );
}

export default function Login({ cfg, authMessage }) {
  // Jis URL par app khula hai, redirect URI wahi banti hai --
  // localhost ho ya Render, dono par sahi dikhega
  const redirectUri = window.location.origin + '/api/auth/callback';

  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const options = cfg?.signInOptions?.length
    ? cfg.signInOptions
    : [{ kind: 'personal', label: 'Sign in with Google' }];

  async function signIn(kind) {
    setBusy(kind);
    setError(null);
    try {
      const { url } = await api.authUrl(kind);
      window.location.href = url;
    } catch (e) {
      setError(e.message);
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-6">
      <div className={cx(card, 'w-full max-w-[420px] m-0 px-7 py-8 shadow-[0_20px_45px_rgba(140,100,60,.14)]')}>
        <div className="w-11 h-11 mb-4 grid place-items-center rounded-[13px]
                        bg-gradient-to-br from-brand to-brand2
                        shadow-[0_8px_20px_rgba(201,106,58,.3)]">
          <Mark />
        </div>

        <h1 className="m-0 mb-1.5 text-[21px] font-semibold tracking-[-.02em] text-ink">
          Daily Work Report
        </h1>
        <p className="m-0 mb-5 text-[13px] text-dim">
          Sign in with the Google account that has access to your tracker sheet.
          The app writes on your behalf, so the sheet does not need to be shared with anyone.
        </p>

        {authMessage && authMessage !== 'ok' && (
          <p className={statusErr}>Sign-in failed: {authMessage}</p>
        )}

        {cfg?.oauthConfigured ? (
          <div className="flex flex-col gap-2.5">
            {options.map((o) => (
              <button
                key={o.kind}
                disabled={Boolean(busy)}
                onClick={() => signIn(o.kind)}
                className="flex items-center justify-center gap-2.5 w-full py-3 text-sm
                           font-semibold text-[#3c4043] bg-white border border-line
                           rounded-[10px] cursor-pointer transition-colors
                           hover:border-brand disabled:opacity-60"
              >
                <GoogleLogo />
                {busy === o.kind
                  ? 'Opening Google...'
                  : options.length > 1 ? 'Sign in with ' + o.label : 'Sign in with Google'}
              </button>
            ))}
            {options.length > 1 && (
              <p className={cx(hint, 'text-center mt-1')}>Use your work account if you have one.</p>
            )}
          </div>
        ) : (
          <>
            <p className={statusErr}>OAuth client is not configured yet. This is a one-time setup.</p>
            <ol className="mt-3 pl-4 text-[12.5px] text-dim list-decimal [&>li]:mb-2.5">
              <li>
                Open{' '}
                <a className="text-brand hover:underline"
                   href="https://console.cloud.google.com/apis/credentials"
                   target="_blank" rel="noreferrer">Cloud Console → Credentials</a>
              </li>
              <li>Create credentials → OAuth client ID</li>
              <li>Application type: <b>Web application</b></li>
              <li>
                Add this authorised redirect URI:
                <pre className="mt-1.5 p-2 text-[11px] bg-bg border border-linesoft rounded-md whitespace-pre-wrap">
                  {redirectUri}
                </pre>
              </li>
              <li>
                Put the client ID and secret into <code className="px-1 bg-bg rounded">backend/.env</code>
              </li>
              <li>Restart the server and reload this page</li>
            </ol>
          </>
        )}

        {error && <p className={statusErr}>{error}</p>}
      </div>
    </div>
  );
}
