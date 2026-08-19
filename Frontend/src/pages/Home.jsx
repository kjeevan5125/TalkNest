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

        <div className="nav-links">
          <Link to="/">Home</Link>

          {user ? (
            <Link to="/chat" className="nav-button">
              Open Chat
            </Link>
          ) : (
            <>
              <Link to="/login">Login</Link>

              <Link to="/register" className="nav-button">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="home-content">

        <section className="intro">
          <h1>Welcome to TalkNest</h1>

          <p>
            A simple real-time chatting application where you
            can connect with friends, send messages and create
            group conversations.
          </p>

          <div className="home-buttons">
            {user ? (
              <Link to="/chat" className="primary-button">
                Open Chat
              </Link>
            ) : (
              <>
                <Link to="/register" className="primary-button">
                  Get Started
                </Link>

                <Link to="/login" className="secondary-button">
                  Login
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="chat-preview">

          <div className="preview-title">
            <h2>TalkNest</h2>

            <span>
              <span className="online-dot"></span>
              Online
            </span>
          </div>

          <div className="preview-body">

            <div className="preview-sidebar">
              <h3>Chats</h3>

              <div className="chat-user active">
                <div className="avatar">A</div>

                <div>
                  <strong>Alex</strong>
                  <p>Hey, how are you?</p>
                </div>
              </div>

              <div className="chat-user">
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
                Thanks!
              </div>

              <div className="message received">
                Let's start chatting.
              </div>

            </div>

          </div>

        </section>

      </main>

      <section className="features">

        <h2>What you can do</h2>

        <div className="feature-list">

          <div className="feature">
            <h3>💬 Chat</h3>
            <p>
              Send messages and have real-time conversations.
            </p>
          </div>

          <div className="feature">
            <h3>👥 Groups</h3>
            <p>
              Create groups and chat with multiple users.
            </p>
          </div>

          <div className="feature">
            <h3>⚡ Real-time</h3>
            <p>
              See messages and typing activity instantly.
            </p>
          </div>

        </div>

      </section>

    </div>
  )
}

export default Home