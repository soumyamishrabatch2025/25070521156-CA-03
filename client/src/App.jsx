import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const TOKEN_KEY = 'flexi-token'
const EMAIL_KEY = 'flexi-email'

async function apiRequest(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }

  return data
}

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getInitials(email) {
  return email?.split('@')[0]?.slice(0, 2).toUpperCase() || 'FL'
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) || '')
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [activeView, setActiveView] = useState('overview')
  const [authMode, setAuthMode] = useState('login')
  const [isLoading, setIsLoading] = useState(Boolean(token))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [transfer, setTransfer] = useState({ recipientEmail: '', amount: '' })
  const [showBalance, setShowBalance] = useState(true)

  const loadWallet = useCallback(async (authToken) => {
    const [balanceData, historyData] = await Promise.all([
      apiRequest('/api/transactions/balance', authToken),
      apiRequest('/api/transactions/history?limit=50', authToken),
    ])
    return { balance: balanceData.balance, transactions: historyData.transactions || [] }
  }, [])

  useEffect(() => {
    if (!token) return undefined
    let isCurrent = true

    loadWallet(token)
      .then((wallet) => {
        if (!isCurrent) return
        setBalance(wallet.balance)
        setTransactions(wallet.transactions)
        setError('')
      })
      .catch((requestError) => {
        if (!isCurrent) return
        if (/unauthorized/i.test(requestError.message)) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(EMAIL_KEY)
          setToken(null)
          setEmail('')
        }
        setError(requestError.message)
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [token, loadWallet])

  const totals = useMemo(() => transactions.reduce((summary, transaction) => {
    const amount = Number(transaction.amount) || 0
    const isSent = transaction.sender?.email?.toLowerCase() === email.toLowerCase()

    if (isSent) summary.sent += amount
    else summary.received += amount
    return summary
  }, { sent: 0, received: 0 }), [transactions, email])

  const handleAuth = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const result = await apiRequest(endpoint, null, {
        method: 'POST',
        body: JSON.stringify(form),
      })

      localStorage.setItem(TOKEN_KEY, result.token)
      localStorage.setItem(EMAIL_KEY, form.email)
      setIsLoading(true)
      setToken(result.token)
      setEmail(form.email)
      setActiveView('overview')
      setNotice(authMode === 'login' ? 'Welcome back.' : 'Your wallet is ready.')
      setForm({ email: '', password: '' })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSend = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      await apiRequest('/api/transactions/send', token, {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: transfer.recipientEmail.trim(),
          amount: Number(transfer.amount),
        }),
      })
      setTransfer({ recipientEmail: '', amount: '' })
      setNotice('Your transfer was sent successfully.')
      setActiveView('overview')
      const wallet = await loadWallet(token)
      setBalance(wallet.balance)
      setTransactions(wallet.transactions)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMAIL_KEY)
    setToken(null)
    setEmail('')
    setTransactions([])
    setBalance(0)
    setError('')
    setNotice('')
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-story">
          <a className="brand brand-light" href="#" aria-label="DummyBank home">
            <span className="brand-mark">D</span>
            <span>DummyBank</span>
          </a>
          <div className="story-copy">
            <span className="eyebrow">YOUR MONEY, IN MOTION</span>
            <h1>A little more<br />freedom with<br /><span>every move.</span></h1>
            <p>A simpler way to keep track, send money, and stay in control of your day-to-day.</p>
          </div>
          <div className="story-bottom"><span className="story-orbit">✳</span> Money made personal.</div>
        </section>

        <section className="auth-panel">
          <a className="brand brand-dark" href="#" aria-label="DummyBank home">
            <span className="brand-mark">D</span>
            <span>DummyBank</span>
          </a>
          <div className="auth-card">
            <div className="auth-heading">
              <span className="eyebrow">{authMode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span>
              <h2>{authMode === 'login' ? 'Sign in to DummyBank' : 'Create your account'}</h2>
              <p>{authMode === 'login' ? 'Your money is right where you left it.' : 'A fresh start for your everyday money.'}</p>
            </div>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <form className="auth-form" onSubmit={handleAuth}>
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
              <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
                <span aria-hidden="true">↗</span>
              </button>
            </form>
            <p className="auth-switch">
              {authMode === 'login' ? 'New to DummyBank?' : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                  setError('')
                }}
              >
                {authMode === 'login' ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </div>
          <p className="auth-footnote">A little more clarity, every day.</p>
        </section>
      </main>
    )
  }

  const recentTransactions = transactions.slice(0, activeView === 'transactions' ? 50 : 5)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand brand-dark" href="#" aria-label="DummyBank home" onClick={() => setActiveView('overview')}>
          <span className="brand-mark">D</span>
          <span>DummyBank</span>
        </a>
        <div className="side-label">MENU</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={activeView === 'overview' ? 'nav-link active' : 'nav-link'} onClick={() => setActiveView('overview')}>
            <span className="nav-icon">◫</span> Overview
          </button>
          <button className={activeView === 'send' ? 'nav-link active' : 'nav-link'} onClick={() => setActiveView('send')}>
            <span className="nav-icon">↗</span> Send money
          </button>
          <button className={activeView === 'transactions' ? 'nav-link active' : 'nav-link'} onClick={() => setActiveView('transactions')}>
            <span className="nav-icon">⇄</span> Transactions
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card">
            <span className="support-spark">✳</span>
            <strong>Here for your<br />next big thing.</strong>
            <span>Money moves better with DummyBank.</span>
          </div>
          <button className="nav-link signout-link" onClick={signOut}>
            <span className="nav-icon">↪</span> Sign out
          </button>
          <div className="sidebar-footer">© 2026 DummyBank Financial</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeView === 'overview' ? 'Overview' : activeView === 'send' ? 'Send money' : 'Transactions'}</strong></div>
          <div className="topbar-user">
            <span className="status-dot" />
            <span className="user-email">{email}</span>
            <button className="topbar-signout" onClick={signOut}>Sign out</button>
            <span className="avatar">{getInitials(email)}</span>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="alert alert-error page-alert" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button>
            </div>
          )}
          {notice && (
            <div className="alert alert-success page-alert" role="status">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification">×</button>
            </div>
          )}

          {activeView === 'send' ? (
            <section className="send-page">
              <div className="page-heading">
                <div><span className="eyebrow">MOVE WITH DUMMYBANK</span><h1>Send money</h1><p>Send money to another DummyBank account, simply and securely.</p></div>
                <button className="button button-quiet" onClick={() => setActiveView('overview')}>← Back to overview</button>
              </div>
              <div className="send-layout">
                <form className="send-card" onSubmit={handleSend}>
                  <div className="card-title-row"><span className="round-icon">↗</span><div><h2>New transfer</h2><p>Transfers are processed right away.</p></div></div>
                  <label htmlFor="recipient-email">Recipient email</label>
                  <input
                    id="recipient-email"
                    type="email"
                    placeholder="friend@example.com"
                    value={transfer.recipientEmail}
                    onChange={(event) => setTransfer({ ...transfer, recipientEmail: event.target.value })}
                    required
                  />
                  <label htmlFor="transfer-amount">Amount</label>
                  <div className="amount-input"><span>¤</span><input
                    id="transfer-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={transfer.amount}
                    onChange={(event) => setTransfer({ ...transfer, amount: event.target.value })}
                    required
                  /></div>
                  <div className="available-line"><span>Available balance</span><strong>{showBalance ? formatAmount(balance) : '••••••'}</strong></div>
                  <button className="button button-primary send-submit" type="submit" disabled={isSubmitting || isLoading}>
                    {isSubmitting ? 'Sending…' : 'Review and send'} <span aria-hidden="true">↗</span>
                  </button>
                  <p className="secure-note"><span>◈</span> Your transfer is protected and encrypted.</p>
                </form>
                <aside className="send-aside">
                  <div className="aside-icon">✳</div>
                  <h3>A note before you send</h3>
                  <p>Double-check the recipient’s email and amount before sending. Transfers can’t be reversed once completed.</p>
                  <div className="aside-rule" />
                  <span className="aside-label">YOUR AVAILABLE BALANCE</span>
                  <strong className="aside-balance">{showBalance ? formatAmount(balance) : '••••••'}</strong>
                  <span className="aside-caption">Available to send</span>
                </aside>
              </div>
            </section>
          ) : (
            <>
              <div className="page-heading overview-heading">
                <div><span className="eyebrow">{activeView === 'overview' ? 'YOUR FINANCIAL SPACE' : 'YOUR MONEY, IN MOTION'}</span><h1>{activeView === 'overview' ? 'Good to see you.' : 'Transactions'}</h1><p>{activeView === 'overview' ? 'Here’s what’s happening with your wallet today.' : 'A clear view of every transfer in and out.'}</p></div>
                {activeView === 'overview' && <button className="button button-primary heading-action" onClick={() => { setActiveView('send'); setError(''); setNotice('') }}><span>↗</span> Send money</button>}
              </div>

              {activeView === 'overview' && (
                <>
                  <section className="overview-grid">
                    <article className="balance-card">
                      <div className="balance-card-top">
                        <span className="balance-label">TOTAL BALANCE</span>
                        <button className="visibility-button" onClick={() => setShowBalance(!showBalance)} aria-label={showBalance ? 'Hide balance' : 'Show balance'}>{showBalance ? '◉' : '◎'}</button>
                      </div>
                      <div className="balance-amount">{isLoading ? <span className="skeleton skeleton-balance" /> : showBalance ? formatAmount(balance) : '••••••'}</div>
                      <div className="balance-foot"><span className="balance-mark">↗</span><span>Your DummyBank wallet</span></div>
                      <span className="balance-decoration decor-one" /><span className="balance-decoration decor-two" />
                    </article>
                    <article className="stat-card"><div className="stat-top"><span>Money sent</span><span className="stat-icon sent-icon">↗</span></div><strong>{formatAmount(totals.sent)}</strong><span className="stat-caption">Total outgoing transfers</span></article>
                    <article className="stat-card"><div className="stat-top"><span>Money received</span><span className="stat-icon received-icon">↙</span></div><strong>{formatAmount(totals.received)}</strong><span className="stat-caption">Total incoming transfers</span></article>
                  </section>

                  <section className="quick-actions">
                    <div><span className="eyebrow">QUICK ACTIONS</span><h2>What would you like to do?</h2></div>
                    <button className="action-tile" onClick={() => { setActiveView('send'); setError(''); setNotice('') }}>
                      <span className="action-icon">↗</span><span><strong>Send money</strong><small>Transfer to a friend</small></span><span className="action-arrow">→</span>
                    </button>
                  </section>
                </>
              )}

              <section className="transactions-section">
                <div className="section-heading">
                  <div><span className="eyebrow">{activeView === 'overview' ? 'YOUR ACTIVITY' : 'RECENT ACTIVITY'}</span><h2>{activeView === 'overview' ? 'Recent transactions' : 'All transactions'}</h2></div>
                  {activeView === 'overview' && <button className="text-button" onClick={() => setActiveView('transactions')}>View all <span>→</span></button>}
                </div>
                <div className="transaction-card">
                  <div className="transaction-table-head"><span>TRANSACTION</span><span>DATE</span><span>STATUS</span><span className="align-right">AMOUNT</span></div>
                  {isLoading ? (
                    <div className="empty-state"><span className="loading-spinner" /><p>Loading your activity…</p></div>
                  ) : recentTransactions.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">⇄</span><h3>No transactions yet</h3><p>Your sends and incoming transfers will show up here.</p>{activeView === 'overview' && <button className="text-button" onClick={() => setActiveView('send')}>Make your first transfer <span>→</span></button>}</div>
                  ) : recentTransactions.map((transaction) => {
                    const senderEmail = transaction.sender?.email || 'DummyBank user'
                    const recipientEmail = transaction.recipient?.email || 'DummyBank user'
                    const isSent = senderEmail.toLowerCase() === email.toLowerCase()
                    return (
                      <article className="transaction-row" key={transaction._id}>
                        <div className="transaction-person">
                          <span className={isSent ? 'transaction-avatar avatar-out' : 'transaction-avatar avatar-in'}>{getInitials(isSent ? recipientEmail : senderEmail)}</span>
                          <span><strong>{isSent ? recipientEmail : senderEmail}</strong><small>{isSent ? 'You sent money' : 'You received money'}</small></span>
                        </div>
                        <span className="transaction-date">{new Date(transaction.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span><span className="status-pill"><i /> Completed</span></span>
                        <strong className={isSent ? 'transaction-amount sent-amount align-right' : 'transaction-amount received-amount align-right'}>{isSent ? '−' : '+'}{formatAmount(transaction.amount)}</strong>
                      </article>
                    )
                  })}
                </div>
              </section>
              <footer className="page-footer"><span>© 2026 DummyBank Financial</span><span>Simple money. Clear mind.</span></footer>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
