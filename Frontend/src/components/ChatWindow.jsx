import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/authContext'
import socket from '../services/socket'
import GroupInfo from './GroupInfo'

function ChatWindow({ conversation }) {
  const { user } = useAuth()

  const currentUserId = user?._id || user?.id

  const otherUser = conversation?.participants?.find(
    (participant) => String(participant._id) !== String(currentUserId)
  )

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [typingUser, setTypingUser] = useState(null)
  const [isOnline, setIsOnline] = useState(() => Boolean(otherUser?.isOnline))
  const [showGroupInfo, setShowGroupInfo] = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const initialLoadRef = useRef(true)

  useEffect(() => {
    if (!conversation || conversation.isGroup || !otherUser) {
      return
    }

    setIsOnline(Boolean(otherUser.isOnline))

    const handleUserOnline = ({ userId }) => {
      if (String(userId) === String(otherUser._id)) {
        setIsOnline(true)
      }
    }

    const handleUserOffline = ({ userId }) => {
      if (String(userId) === String(otherUser._id)) {
        setIsOnline(false)
      }
    }

    socket.on('userOnline', handleUserOnline)
    socket.on('userOffline', handleUserOffline)

    return () => {
      socket.off('userOnline', handleUserOnline)
      socket.off('userOffline', handleUserOffline)
    }
  }, [conversation, otherUser])

  useEffect(() => {
    if (!conversation) {
      return
    }

    const handleNewMessage = (message) => {
      const messageConversationId =
        message.conversation?._id || message.conversation

      if (String(messageConversationId) !== String(conversation._id)) {
        return
      }

      setMessages((prevMessages) => {
        const existingMessage = prevMessages.find(
          (item) => String(item._id) === String(message._id)
        )

        if (existingMessage) {
          return prevMessages.map((item) =>
            String(item._id) === String(message._id)
              ? {
                  ...item,
                  ...message,
                  isDelivered: item.isDelivered || message.isDelivered,
                  isRead: item.isRead || message.isRead,
                }
              : item
          )
        }

        return [...prevMessages, message]
      })

      const currentUserId = user?._id || user?.id
      const senderId =
        message.sender?._id || message.sender?.id || message.sender

      if (String(senderId) !== String(currentUserId)) {
        socket.emit('markAsRead', conversation._id)
      }
    }

    const handleMessageDelivered = ({ messageId, userId }) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          String(message._id) === String(messageId)
            ? {
                ...message,
                isDelivered: true,
                deliveredTo: [
                  ...(message.deliveredTo || []),
                  userId,
                ].filter(
                  (id, index, allIds) =>
                    allIds.findIndex((item) => String(item) === String(id)) ===
                    index
                ),
              }
            : message
        )
      )
    }

    const handleMessagesRead = ({ conversationId, messageIds, userId }) => {
      if (String(conversationId) !== String(conversation._id)) {
        return
      }

      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          messageIds.some((id) => String(id) === String(message._id))
            ? {
                ...message,
                isDelivered: true,
                isRead: true,
                readBy: [
                  ...(message.readBy || []),
                  userId,
                ].filter(
                  (id, index, allIds) =>
                    allIds.findIndex((item) => String(item) === String(id)) ===
                    index
                ),
              }
            : message
        )
      )
    }

    socket.on('newMessage', handleNewMessage)
    socket.on('messageDelivered', handleMessageDelivered)
    socket.on('messagesRead', handleMessagesRead)

    return () => {
      socket.off('newMessage', handleNewMessage)
      socket.off('messageDelivered', handleMessageDelivered)
      socket.off('messagesRead', handleMessagesRead)
    }
  }, [conversation, user])

  useEffect(() => {
    if (!conversation) {
      return
    }

    const handleUserTyping = ({ userId, conversationId }) => {
      const currentUserId = user?._id || user?.id

      if (String(conversationId) !== String(conversation._id)) {
        return
      }

      if (String(userId) === String(currentUserId)) {
        return
      }

      const participant = conversation.participants?.find(
        (item) => String(item._id) === String(userId)
      )

      setTypingUser(participant?.name || 'Someone')
    }

    const handleUserStoppedTyping = ({ userId, conversationId }) => {
      const currentUserId = user?._id || user?.id

      if (String(conversationId) !== String(conversation._id)) {
        return
      }

      if (String(userId) === String(currentUserId)) {
        return
      }

      setTypingUser(null)
    }

    socket.on('userTyping', handleUserTyping)
    socket.on('userStoppedTyping', handleUserStoppedTyping)

    return () => {
      socket.off('userTyping', handleUserTyping)
      socket.off('userStoppedTyping', handleUserStoppedTyping)
    }
  }, [conversation, user])

  useEffect(() => {
    if (!conversation) {
      return
    }

    let cancelled = false

    const fetchMessages = async () => {
      try {
        setLoading(true)

        const response = await api.get(`/messages/${conversation._id}`)

        if (cancelled) {
          return
        }

        setMessages((prevMessages) => {
          const messageMap = new Map()

          response.data.forEach((message) => {
            messageMap.set(String(message._id), message)
          })

          prevMessages.forEach((message) => {
            const id = String(message._id)

            if (!messageMap.has(id)) {
              messageMap.set(id, message)
            } else {
              const existing = messageMap.get(id)

              messageMap.set(id, {
                ...existing,
                ...message,
                isDelivered:
                  existing.isDelivered || message.isDelivered,
                isRead: existing.isRead || message.isRead,
              })
            }
          })

          return Array.from(messageMap.values()).sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          )
        })
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch messages:', error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchMessages()

    return () => {
      cancelled = true
    }
  }, [conversation])

  useEffect(() => {
    if (!conversation) {
      return
    }

    const markConversationAsRead = () => {
      socket.emit('markAsRead', conversation._id)
    }

    if (socket.connected) {
      markConversationAsRead()
    } else {
      socket.once('connect', markConversationAsRead)
    }

    return () => {
      socket.off('connect', markConversationAsRead)
    }
  }, [conversation])

  useEffect(() => {
    if (loading || !messages.length) {
      return
    }

    if (initialLoadRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      initialLoadRef.current = false
      return
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  if (!conversation) {
    return (
      <main className="chat-window empty">
        <div className="chat-window-empty">
          <div className="empty-chat-icon">💬</div>
          <h2>Welcome to TalkNest</h2>
          <p>Select a conversation from the sidebar to start chatting.</p>
        </div>
      </main>
    )
  }

  const conversationName = conversation.isGroup
    ? conversation.groupName
    : otherUser?.name || 'Chat'

  const handleTyping = (e) => {
    const value = e.target.value
    setText(value)

    if (!conversation || !socket.connected) {
      return
    }

    socket.emit('typing', conversation._id)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (!value.trim()) {
      socket.emit('stopTyping', conversation._id)
      return
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', conversation._id)
    }, 1000)
  }

  const handleSendMessage = (e) => {
    e.preventDefault()

    const trimmedText = text.trim()
    if (!trimmedText || sending) {
      return
    }

    if (!socket.connected) {
      console.error('Socket is not connected')
      return
    }

    setText('')
    setSending(true)
    setTypingUser(null)

    socket.emit('stopTyping', conversation._id)

    socket.emit(
      'sendMessage',
      {
        conversationId: conversation._id,
        text: trimmedText,
      },
      (response) => {
        if (!response?.success) {
          console.error(
            'Failed to send message:',
            response?.message || 'Unknown socket error'
          )
          setSending(false)
          setText(trimmedText)
          return
        }

        setSending(false)
      }
    )
  }

  return (
    <main className="chat-window">
      <div className="chat-window-header">
        <div className="chat-header-user-info">
          <div className="chat-header-avatar">
            {conversationName?.charAt(0)?.toUpperCase()}
          </div>

          <div className="chat-header-text">
            <h2>{conversationName}</h2>

            {conversation.isGroup ? (
              <span className="chat-header-subtitle">
                {conversation.participants?.length || 0} members
              </span>
            ) : (
              <span
                className={`chat-header-subtitle ${
                  isOnline ? 'online' : 'offline'
                }`}
              >
                {isOnline ? '● Online' : 'Offline'}
              </span>
            )}
          </div>
        </div>

        {conversation.isGroup && (
          <button
            type="button"
            className="group-info-btn"
            onClick={() => setShowGroupInfo(true)}
          >
            ⚙️ Group Info
          </button>
        )}
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="chat-status-container">
            <p className="chat-status-text">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-status-container">
            <p className="chat-status-text">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((message) => {
            const senderId =
              message.sender?._id || message.sender?.id || message.sender

            const isMine = String(senderId) === String(currentUserId)

            const recipientIds = conversation.participants
              .map(
                (participant) =>
                  participant._id || participant.id || participant
              )
              .filter(
                (participantId) => String(participantId) !== String(senderId)
              )

            const hasReceiptFromEveryone = (receipts, legacyValue) => {
              if (!conversation.isGroup) {
                return receipts?.length > 0 || legacyValue
              }

              return (
                recipientIds.length > 0 &&
                recipientIds.every((recipientId) =>
                  receipts?.some(
                    (receiptId) => String(receiptId) === String(recipientId)
                  )
                )
              )
            }

            const isDeliveredToEveryone = hasReceiptFromEveryone(
              message.deliveredTo,
              message.isDelivered
            )

            const isReadByEveryone = hasReceiptFromEveryone(
              message.readBy,
              message.isRead
            )

            return (
              <div
                key={message._id}
                className={`chat-message ${isMine ? 'sent' : 'received'}`}
              >
                {conversation.isGroup && !isMine && (
                  <span className="chat-message-sender">
                    {message.sender?.name || 'Member'}
                  </span>
                )}

                <p className="chat-message-text">{message.text}</p>

                <div className="message-meta">
                  <span className="message-time">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {isMine && (
                    <span
                      className={`message-status ${
                        isReadByEveryone ? 'read' : ''
                      }`}
                    >
                      {isReadByEveryone
                        ? '✓✓'
                        : isDeliveredToEveryone
                        ? '✓✓'
                        : '✓'}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {typingUser && (
        <div className="typing-indicator">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span>{typingUser} is typing...</span>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="chat-input-field"
          placeholder="Type a message..."
          value={text}
          onChange={handleTyping}
        />

        <button
          type="submit"
          className="chat-send-btn"
          disabled={sending || !text.trim()}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>

      {showGroupInfo && (
        <GroupInfo
          conversation={conversation}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </main>
  )
}

export default ChatWindow
