import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import socket from '../services/socket'

function ChatWindow({ conversation }) {
  const { user } = useAuth()

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Used to distinguish initial chat loading
  // from new messages arriving later
  const initialLoadRef = useRef(true)

  // Reset scroll behavior whenever conversation changes
  useEffect(() => {
    initialLoadRef.current = true
  }, [conversation])

  useEffect(() => {
    if (!conversation || conversation.isGroup) {
      setIsOnline(false)
      return
    }

    const otherUser = conversation.participants.find(
      (participant) =>
        String(participant._id) !==
        String(user?._id || user?.id)
    )

    if (!otherUser) {
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
  }, [conversation, user])

  useEffect(() => {
    if (!conversation) {
      return
    }

    const handleNewMessage = (message) => {
      const messageConversationId =
        message.conversation?._id ||
        message.conversation

      if (
        String(messageConversationId) !==
        String(conversation._id)
      ) {
        return
      }

      setMessages((prevMessages) => {
        const existingMessage = prevMessages.find(
          (item) =>
            String(item._id) ===
            String(message._id)
        )

        if (existingMessage) {
          return prevMessages.map((item) =>
            String(item._id) ===
            String(message._id)
              ? {
                  ...item,
                  ...message,
                  isDelivered:
                    item.isDelivered ||
                    message.isDelivered,
                  isRead:
                    item.isRead ||
                    message.isRead,
                }
              : item
          )
        }

        return [...prevMessages, message]
      })

      const currentUserId =
        user?._id || user?.id

      const senderId =
        message.sender?._id ||
        message.sender?.id ||
        message.sender

      if (
        String(senderId) !==
        String(currentUserId)
      ) {
        socket.emit(
          'markAsRead',
          conversation._id
        )
      }
    }

    const handleMessageDelivered = ({ messageId }) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          String(message._id) ===
          String(messageId)
            ? {
                ...message,
                isDelivered: true,
              }
            : message
        )
      )
    }

    const handleMessagesDelivered = ({ messageIds }) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          messageIds.some(
            (id) =>
              String(id) === String(message._id)
          )
            ? {
                ...message,
                isDelivered: true,
              }
            : message
        )
      )
    }

    const handleMessagesRead = ({
      conversationId,
      messageIds,
    }) => {
      if (
        String(conversationId) !==
        String(conversation._id)
      ) {
        return
      }

      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          messageIds.some(
            (id) =>
              String(id) ===
              String(message._id)
          )
            ? {
                ...message,
                isDelivered: true,
                isRead: true,
              }
            : message
        )
      )
    }

    socket.on(
      'newMessage',
      handleNewMessage
    )

    socket.on(
      'messageDelivered',
      handleMessageDelivered
    )

    socket.on(
      'messagesDelivered',
      handleMessagesDelivered
    )

    socket.on(
      'messagesRead',
      handleMessagesRead
    )

    return () => {
      socket.off(
        'newMessage',
        handleNewMessage
      )

      socket.off(
        'messageDelivered',
        handleMessageDelivered
      )

      socket.off(
        'messagesDelivered',
        handleMessagesDelivered
      )

      socket.off(
        'messagesRead',
        handleMessagesRead
      )
    }
  }, [conversation, user])

  useEffect(() => {
    if (!conversation) {
      setIsTyping(false)
      return
    }

    setIsTyping(false)

    const handleUserTyping = ({
      userId,
      conversationId,
    }) => {
      const currentUserId =
        user?._id || user?.id

      if (
        String(conversationId) !==
        String(conversation._id)
      ) {
        return
      }

      if (
        String(userId) ===
        String(currentUserId)
      ) {
        return
      }

      setIsTyping(true)
    }

    const handleUserStoppedTyping = ({
      userId,
      conversationId,
    }) => {
      const currentUserId =
        user?._id || user?.id

      if (
        String(conversationId) !==
        String(conversation._id)
      ) {
        return
      }

      if (
        String(userId) ===
        String(currentUserId)
      ) {
        return
      }

      setIsTyping(false)
    }

    socket.on(
      'userTyping',
      handleUserTyping
    )

    socket.on(
      'userStoppedTyping',
      handleUserStoppedTyping
    )

    return () => {
      socket.off(
        'userTyping',
        handleUserTyping
      )

      socket.off(
        'userStoppedTyping',
        handleUserStoppedTyping
      )
    }
  }, [conversation, user])

  useEffect(() => {
    if (!conversation) {
      setMessages([])
      return
    }

    setMessages([])
    setIsTyping(false)

    const fetchMessages = async () => {
      try {
        setLoading(true)

        const response = await api.get(
          `/messages/${conversation._id}`
        )

        setMessages((prevMessages) => {
          const messageMap = new Map()

          response.data.forEach((message) => {
            messageMap.set(
              String(message._id),
              message
            )
          })

          prevMessages.forEach((message) => {
            const id = String(message._id)

            if (!messageMap.has(id)) {
              messageMap.set(id, message)
            } else {
              const existing =
                messageMap.get(id)

              messageMap.set(id, {
                ...existing,
                ...message,
                isDelivered:
                  existing.isDelivered ||
                  message.isDelivered,
                isRead:
                  existing.isRead ||
                  message.isRead,
              })
            }
          })

          return Array.from(
            messageMap.values()
          ).sort(
            (a, b) =>
              new Date(a.createdAt) -
              new Date(b.createdAt)
          )
        })
      } catch (error) {
        console.error(
          'Failed to fetch messages:',
          error
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversation])

  useEffect(() => {
    if (!conversation) {
      return
    }

    const markConversationAsRead = () => {
      socket.emit(
        'markAsRead',
        conversation._id
      )
    }

    if (socket.connected) {
      markConversationAsRead()
    } else {
      socket.once(
        'connect',
        markConversationAsRead
      )
    }

    return () => {
      socket.off(
        'connect',
        markConversationAsRead
      )
    }
  }, [conversation])

  // Scroll behavior
  useEffect(() => {
    if (loading || !messages.length) {
      return
    }

    if (initialLoadRef.current) {
      // Opening a conversation:
      // jump directly to the latest message
      messagesEndRef.current?.scrollIntoView({
        behavior: 'auto',
      })

      initialLoadRef.current = false
      return
    }

    // New message:
    // smoothly scroll to the bottom
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, loading])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        )
      }
    }
  }, [])

  if (!conversation) {
    return (
      <main className="chat-window">
        <div className="chat-window-empty">
          <h2>Welcome to TalkNest</h2>
          <p>Select a conversation to start chatting.</p>
        </div>
      </main>
    )
  }

  const otherUser =
    conversation.participants.find(
      (participant) =>
        String(participant._id) !==
          String(user?._id) &&
        String(participant._id) !==
          String(user?.id)
    )

  const conversationName =
    conversation.isGroup
      ? conversation.groupName
      : otherUser?.name

  const handleTyping = (e) => {
    const value = e.target.value

    setText(value)

    if (
      !conversation ||
      !socket.connected
    ) {
      return
    }

    socket.emit(
      'typing',
      conversation._id
    )

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      )
    }

    if (!value.trim()) {
      socket.emit(
        'stopTyping',
        conversation._id
      )
      return
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        socket.emit(
          'stopTyping',
          conversation._id
        )
      }, 1000)
  }

  const handleSendMessage = (e) => {
    e.preventDefault()

    const trimmedText =
      text.trim()

    if (
      !trimmedText ||
      sending
    ) {
      return
    }

    if (!socket.connected) {
      console.error(
        'Socket is not connected'
      )
      return
    }

    setText('')
    setSending(true)

    socket.emit(
      'stopTyping',
      conversation._id
    )

    socket.emit(
      'sendMessage',
      {
        conversationId:
          conversation._id,
        text: trimmedText,
      },
      (response) => {
        if (!response?.success) {
          console.error(
            'Failed to send message:',
            response?.message ||
              'Unknown socket error'
          )

          setSending(false)
          setText(trimmedText)
          return
        }

        if (response.message) {
          setMessages(
            (prevMessages) => {
              const existingMessage =
                prevMessages.find(
                  (message) =>
                    String(message._id) ===
                    String(
                      response.message._id
                    )
                )

              if (existingMessage) {
                return prevMessages.map(
                  (message) =>
                    String(message._id) ===
                    String(
                      response.message._id
                    )
                      ? {
                          ...message,
                          ...response.message,
                          isDelivered:
                            message.isDelivered ||
                            response.message
                              .isDelivered,
                          isRead:
                            message.isRead ||
                            response.message
                              .isRead,
                        }
                      : message
                )
              }

              return [
                ...prevMessages,
                response.message,
              ]
            }
          )
        }

        setSending(false)
      }
    )
  }

  return (
    <main className="chat-window">

      <div className="chat-window-header">
        <h2>{conversationName}</h2>

        {!conversation.isGroup && (
          <span
            className={
              isOnline
                ? 'online-status'
                : 'offline-status'
            }
          >
            {isOnline
              ? '● Online'
              : 'Offline'}
          </span>
        )}
      </div>

      <div className="chat-messages">

        {loading ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          messages.map((message) => {
            const currentUserId =
              user?._id || user?.id

            const senderId =
              message.sender?._id ||
              message.sender?.id ||
              message.sender

            const isMine =
              String(senderId) ===
              String(currentUserId)

            return (
              <div
                key={message._id}
                className={`chat-message ${
                  isMine
                    ? 'sent'
                    : 'received'
                }`}
              >
                <p>
                  {message.text}
                </p>

                <span className="message-time">
                  {new Date(
                    message.createdAt
                  ).toLocaleTimeString(
                    [],
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}

                  {isMine && (
                    <span className="message-status">
                      {message.isRead
                        ? ' ✓✓ 🔵'
                        : message.isDelivered
                          ? ' ✓✓'
                          : ' ✓'}
                    </span>
                  )}
                </span>
              </div>
            )
          })
        )}

        <div ref={messagesEndRef} />

      </div>

      {isTyping && (
        <div className="typing-indicator">
          {conversationName} is typing...
        </div>
      )}

      <form
        className="chat-input"
        onSubmit={
          handleSendMessage
        }
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={handleTyping}
        />

        <button
          type="submit"
          disabled={sending}
        >
          {sending
            ? 'Sending...'
            : 'Send'}
        </button>
      </form>

    </main>
  )
}

export default ChatWindow