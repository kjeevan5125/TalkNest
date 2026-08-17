import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Home() {
  const { user } = useAuth()

  return (
    <div className="home-page">

      <nav className="home-navbar">
        <Link to="/" className="brand">
          TalkNest
        </Link>

        <div className="home-nav-actions">
          {user ? (
            <Link to="/chat" className="nav-button primary">
              Open Chat
            </Link>
          ) : (
            <>
              <Link to="/login" className="nav-button">
                Login
              </Link>

              <Link to="/register" className="nav-button primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="home-hero">

        <div className="hero-content">

          <div className="hero-badge">
            Real-time communication
          </div>

          <h1>
            Connect.
            <br />
            Talk.
            <br />
            <span>Share.</span>
          </h1>

          <p>
            TalkNest makes it simple to connect with people,
            have real-time conversations, and stay connected
            wherever you are.
          </p>

          <div className="hero-buttons">
            {user ? (
              <Link to="/chat" className="hero-primary">
                Open TalkNest
              </Link>
            ) : (
              <>
                <Link to="/register" className="hero-primary">
                  Get Started
                </Link>

                <Link to="/login" className="hero-secondary">
                  Login
                </Link>
              </>
            )}
          </div>

        </div>

        <div className="hero-preview">

          <div className="preview-header">
            <div className="preview-brand">
              TalkNest
            </div>

            <div className="online-indicator">
              <span></span>
              Online
            </div>
          </div>

          <div className="preview-chat">

            <div className="preview-sidebar">
              <div className="sidebar-title">
                Conversations
              </div>

              <div className="conversation active">
                <div className="avatar">A</div>

                <div>
                  <strong>Alex</strong>
                  <p>Hey! How are you?</p>
                </div>
              </div>

              <div className="conversation">
                <div className="avatar">S</div>

                <div>
                  <strong>Sarah</strong>
                  <p>See you soon!</p>
                </div>
              </div>
            </div>

            <div className="preview-messages">

              <div className="message received">
                Hey! Welcome to TalkNest 👋
              </div>

              <div className="message sent">
                Thanks! Great to be here.
              </div>

              <div className="message received">
                Let's start chatting!
              </div>

            </div>

          </div>

        </div>

      </main>

      <section className="home-features">

        <div className="feature">
          <div className="feature-icon">⚡</div>
          <h3>Real-time</h3>
          <p>
            Send and receive messages instantly.
          </p>
        </div>

        <div className="feature">
          <div className="feature-icon">💬</div>
          <h3>Conversations</h3>
          <p>
            Keep all your conversations organized.
          </p>
        </div>

        <div className="feature">
          <div className="feature-icon">👥</div>
          <h3>Groups</h3>
          <p>
            Create groups and chat with multiple people.
          </p>
        </div>

      </section>

    </div>
  )
}

export default Home