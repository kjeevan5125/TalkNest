import { useEffect, useState } from 'react'
import api from '../services/api'
import socket from '../services/socket'
import { useAuth } from '../context/AuthContext'

function ConversationList({ onSelectConversation }) {
  const { user } = useAuth()

  const [conversations, setConversations] = useState([])

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api.get('/conversations')
        setConversations(response.data)
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
      }
    }

    const handleUserOnline = ({ userId }) => {
      setConversations((prevConversations) =>
        prevConversations.map((conversation) => ({
          ...conversation,
          participants: conversation.participants.map(
            (participant) =>
              String(participant._id) === String(userId)
                ? {
                    ...participant,
                    isOnline: true,
                  }
                : participant
          ),
        }))
      )
    }

    const handleUserOffline = ({ userId }) => {
      setConversations((prevConversations) =>
        prevConversations.map((conversation) => ({
          ...conversation,
          participants: conversation.participants.map(
            (participant) =>
              String(participant._id) === String(userId)
                ? {
                    ...participant,
                    isOnline: false,
                  }
                : participant
          ),
        }))
      )
    }

    const handleNewMessage = (message) => {
      const conversationId =
        message.conversation?._id ||
        message.conversation

      setConversations((prevConversations) => {
        const exists = prevConversations.some(
          (conversation) =>
            String(conversation._id) ===
            String(conversationId)
        )

        if (!exists) {
          return prevConversations
        }

        const updatedConversations = prevConversations.map(
          (conversation) =>
            String(conversation._id) ===
            String(conversationId)
              ? {
                  ...conversation,
                  lastMessage: message,
                  updatedAt: message.createdAt,
                }
              : conversation
        )

        return updatedConversations.sort(
          (a, b) =>
            new Date(b.updatedAt) -
            new Date(a.updatedAt)
        )
      })
    }

    fetchConversations()

    socket.on('newMessage', handleNewMessage)
    socket.on('userOnline', handleUserOnline)
    socket.on('userOffline', handleUserOffline)

    return () => {
      socket.off('newMessage', handleNewMessage)
      socket.off('userOnline', handleUserOnline)
      socket.off('userOffline', handleUserOffline)
    }
  }, [])

  return (
    <aside className="conversation-list">

      <div className="conversation-header">
        <h3>Conversations</h3>
        <button>+</button>
      </div>

      <input
        type="text"
        placeholder="Search conversations"
        className="conversation-search"
      />

      <div className="conversation-items">

        {conversations.map((conversation) => {

          const otherUser = conversation.participants.find(
            (participant) =>
              participant._id !== user?._id &&
              participant._id !== user?.id
          )

          const name = conversation.isGroup
            ? conversation.groupName
            : otherUser?.name

          return (
            <div
              className="conversation-item"
              key={conversation._id}
              onClick={() =>
                onSelectConversation(conversation)
              }
            >
              <div
                className={`conversation-avatar ${
                  !conversation.isGroup &&
                  otherUser?.isOnline
                    ? 'online'
                    : ''
                }`}
              >
                {name?.charAt(0)}
              </div>

              <div className="conversation-info">
                <strong>{name}</strong>

                <p>
                  {conversation.lastMessage?.text ||
                    'No messages yet'}
                </p>
              </div>
            </div>
          )
        })}

      </div>

    </aside>
  )
}

export default ConversationList