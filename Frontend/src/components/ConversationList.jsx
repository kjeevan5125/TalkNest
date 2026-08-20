import { useEffect, useState } from 'react'
import api from '../services/api'
import socket from '../services/socket'
import { useAuth } from '../context/authContext'
import CreateGroup from './CreateGroup'
import NewConversation from './NewConversation'

function ConversationList({ selectedConversationId, onSelectConversation }) {
  const { user } = useAuth()

  const [conversations, setConversations] = useState([])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api.get('/conversations')
        const data = response.data

        const conversationData = Array.isArray(data)
          ? data
          : Array.isArray(data?.conversations)
          ? data.conversations
          : Array.isArray(data?.data)
          ? data.data
          : []

        setConversations(conversationData)
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
        setConversations([])
      }
    }

    const handleUserOnline = ({ userId }) => {
      setConversations((prevConversations) =>
        prevConversations.map((conversation) => ({
          ...conversation,
          participants:
            conversation.participants?.map((participant) =>
              String(participant._id) === String(userId)
                ? { ...participant, isOnline: true }
                : participant
            ) || [],
        }))
      )
    }

    const handleUserOffline = ({ userId }) => {
      setConversations((prevConversations) =>
        prevConversations.map((conversation) => ({
          ...conversation,
          participants:
            conversation.participants?.map((participant) =>
              String(participant._id) === String(userId)
                ? { ...participant, isOnline: false }
                : participant
            ) || [],
        }))
      )
    }

    const handleNewMessage = (message) => {
      const conversationId = message.conversation?._id || message.conversation

      setConversations((prevConversations) => {
        const exists = prevConversations.some(
          (conversation) => String(conversation._id) === String(conversationId)
        )

        if (!exists) {
          return prevConversations
        }

        const updated = prevConversations.map((conversation) =>
          String(conversation._id) === String(conversationId)
            ? {
                ...conversation,
                lastMessage: message,
                updatedAt: message.createdAt,
              }
            : conversation
        )

        return updated.sort(
          (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        )
      })
    }

    const handleNewConversation = (conversation) => {
      if (!conversation?._id) {
        return
      }

      setConversations((prevConversations) => {
        const alreadyExists = prevConversations.some(
          (item) => String(item._id) === String(conversation._id)
        )

        if (alreadyExists) {
          return prevConversations
        }

        return [conversation, ...prevConversations]
      })
    }

    const handleGroupUpdated = (conversation) => {
      if (!conversation?._id) {
        return
      }

      const currentUserId = user?._id || user?.id

      const isMember = conversation.participants?.some(
        (participant) =>
          String(participant._id || participant.id || participant) ===
          String(currentUserId)
      )

      setConversations((prevConversations) => {
        const exists = prevConversations.some(
          (item) => String(item._id) === String(conversation._id)
        )

        if (!isMember) {
          return prevConversations.filter(
            (item) => String(item._id) !== String(conversation._id)
          )
        }

        if (!exists) {
          return [conversation, ...prevConversations]
        }

        return prevConversations
          .map((item) =>
            String(item._id) === String(conversation._id) ? conversation : item
          )
          .sort(
            (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
          )
      })
    }

    fetchConversations()

    socket.on('newMessage', handleNewMessage)
    socket.on('userOnline', handleUserOnline)
    socket.on('userOffline', handleUserOffline)
    socket.on('newConversation', handleNewConversation)
    socket.on('groupUpdated', handleGroupUpdated)

    return () => {
      socket.off('newMessage', handleNewMessage)
      socket.off('userOnline', handleUserOnline)
      socket.off('userOffline', handleUserOffline)
      socket.off('newConversation', handleNewConversation)
      socket.off('groupUpdated', handleGroupUpdated)
    }
  }, [user])

  const handleConversationCreated = (conversation) => {
    setConversations((prevConversations) => {
      const alreadyExists = prevConversations.some(
        (item) => String(item._id) === String(conversation._id)
      )

      if (alreadyExists) {
        return prevConversations.map((item) =>
          String(item._id) === String(conversation._id)
            ? conversation
            : item
        )
      }

      return [conversation, ...prevConversations]
    })

    onSelectConversation(conversation)
  }

  const handleGroupCreated = (conversation) => {
    if (!conversation?._id) {
      return
    }

    setConversations((prevConversations) => {
      const alreadyExists = prevConversations.some(
        (item) => String(item._id) === String(conversation._id)
      )

      if (alreadyExists) {
        return prevConversations
      }

      return [conversation, ...prevConversations]
    })

    onSelectConversation(conversation)
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredConversations = conversations.filter((conversation) => {
    if (!normalizedQuery) {
      return true
    }

    const participants = conversation.participants || []
    const currentUserId = user?._id || user?.id
    const otherUser = participants.find(
      (participant) =>
        String(participant._id || participant.id || participant) !==
        String(currentUserId)
    )
    const conversationName = conversation.isGroup
      ? conversation.groupName
      : otherUser?.name

    return conversationName?.toLowerCase().includes(normalizedQuery)
  })

  return (
    <aside className="conversation-sidebar">
      <div className="conversation-header">
        <h3>Conversations</h3>

        <div className="conversation-header-actions">
          <button
            type="button"
            className="create-group-btn"
            title="Start New Conversation"
            onClick={() => setShowNewConversation(true)}
          >
            +
          </button>

          <button
            type="button"
            className="create-group-btn"
            title="Create New Group"
            onClick={() => setShowCreateGroup(true)}
          >
            👥
          </button>
        </div>
      </div>

      <div className="conversation-search-container">
        <input
          type="text"
          placeholder="Search chats..."
          className="conversation-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="conversation-items-list">
        {filteredConversations.map((conversation) => {
          const participants = conversation.participants || []
          const currentUserId = user?._id || user?.id

          const otherUser = participants.find(
            (participant) =>
              String(participant._id || participant.id || participant) !==
              String(currentUserId)
          )

          const conversationName = conversation.isGroup
            ? conversation.groupName
            : otherUser?.name || 'Chat'

          const isSelected =
            String(selectedConversationId) === String(conversation._id)

          const isOnline = !conversation.isGroup && Boolean(otherUser?.isOnline)

          return (
            <div
              className={`conversation-item ${isSelected ? 'active' : ''}`}
              key={conversation._id}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="avatar-wrapper">
                <div
                  className={`conversation-avatar ${
                    conversation.isGroup ? 'group-avatar' : ''
                  }`}
                >
                  {conversationName?.charAt(0)?.toUpperCase()}
                </div>
                {isOnline && <span className="online-badge-dot"></span>}
              </div>

              <div className="conversation-details">
                <div className="conversation-top-row">
                  <strong className="conversation-name">
                    {conversationName}
                  </strong>
                </div>

                <p className="conversation-last-msg">
                  {conversation.lastMessage?.text || 'No messages yet'}
                </p>
              </div>
            </div>
          )
        })}

        {filteredConversations.length === 0 && (
          <div className="conversation-empty-state">
            <p>No conversations found</p>
          </div>
        )}
      </div>

      {showNewConversation && (
        <NewConversation
          onClose={() => setShowNewConversation(false)}
          onConversationCreated={handleConversationCreated}
        />
      )}

      {showCreateGroup && (
        <CreateGroup
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </aside>
  )
}

export default ConversationList
