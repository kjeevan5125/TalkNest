import { useEffect, useState } from 'react'
import api from '../services/api'

function NewConversation({ onClose, onConversationCreated }) {
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users')
        setUsers(Array.isArray(response.data) ? response.data : [])
      } catch (error) {
        console.error('Failed to fetch users:', error)
        setError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleStartConversation = async (userId) => {
    try {
      setCreating(true)
      setError('')

      const response = await api.post('/conversations', { userId })

      const conversation =
        response.data?.conversation || response.data

      if (!conversation?._id) {
        throw new Error('Invalid conversation response from server')
      }

      onConversationCreated(conversation)
      onClose()
    } catch (error) {
      console.error('Failed to create conversation:', error)
      setError(
        error.response?.data?.message ||
          error.message ||
          'Failed to start conversation'
      )
    } finally {
      setCreating(false)
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredUsers = users.filter((item) => {
    if (!normalizedQuery) {
      return true
    }

    return (
      item.name?.toLowerCase().includes(normalizedQuery) ||
      item.email?.toLowerCase().includes(normalizedQuery)
    )
  })

  return (
    <div className="new-conversation-overlay">
      <div className="new-conversation-modal">
        <div className="new-conversation-header">
          <h3>New Conversation</h3>

          <button
            type="button"
            className="new-conversation-close"
            onClick={onClose}
            disabled={creating}
          >
            ×
          </button>
        </div>

        <input
          type="text"
          className="new-conversation-search"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={creating}
        />

        {error && (
          <p className="new-conversation-error">{error}</p>
        )}

        <div className="new-conversation-user-list">
          {loading ? (
            <p className="new-conversation-status">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="new-conversation-status">
              {normalizedQuery
                ? 'No users found'
                : 'No other users available'}
            </p>
          ) : (
            filteredUsers.map((item) => (
              <button
                type="button"
                key={item._id}
                className="new-conversation-user"
                onClick={() => handleStartConversation(item._id)}
                disabled={creating}
              >
                <div className="new-conversation-avatar">
                  {item.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>

                <div className="new-conversation-user-info">
                  <strong>{item.name}</strong>
                  <span>{item.email}</span>
                </div>

                <span
                  className={`new-conversation-status-dot ${
                    item.isOnline ? 'online' : ''
                  }`}
                />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default NewConversation
