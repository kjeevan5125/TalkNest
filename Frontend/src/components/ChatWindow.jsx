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

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    if (!conversation) {
      return
    }

    const handleNewMessage = (message) => {
      if (
        String(message.conversation) !==
        String(conversation._id)
      ) {
        return
      }

      setMessages((prevMessages) => {
        if (
          prevMessages.some(
            (item) => item._id === message._id
          )
        ) {
          return prevMessages
        }

        return [...prevMessages, message]
      })
    }

    socket.on('newMessage', handleNewMessage)

    return () => {
      socket.off('newMessage', handleNewMessage)
    }
  }, [conversation])

  useEffect(() => {
    if (!conversation) {
      return
    }

    const handleUserTyping = ({ userId }) => {
      const currentUserId = user?._id || user?.id

      if (String(userId) === String(currentUserId)) {
        return
      }

      setIsTyping(true)
    }

    const handleUserStoppedTyping = ({ userId }) => {
      const currentUserId = user?._id || user?.id

      if (String(userId) === String(currentUserId)) {
        return
      }

      setIsTyping(false)
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
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      try {
        setLoading(true)

        const response = await api.get(
          `/messages/${conversation._id}`
        )

        setMessages(response.data)
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages])

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

  const otherUser = conversation.participants.find(
    (participant) =>
      participant._id !== user?._id &&
      participant._id !== user?.id
  )

  const conversationName = conversation.isGroup
    ? conversation.groupName
    : otherUser?.name

  const handleTyping = (e) => {
    setText(e.target.value)

    if (!conversation || !socket.connected) {
      return
    }

    socket.emit('typing', conversation._id)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
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

    setSending(true)

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
          return
        }

        setText('')
        setSending(false)
      }
    )
  }

  return (
    <main className="chat-window">

      <div className="chat-window-header">
        <h2>{conversationName}</h2>
      </div>

      <div className="chat-messages">

        {loading ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          messages.map((message) => {
            const currentUserId = user?._id || user?.id

            const senderId =
              message.sender?._id ||
              message.sender?.id ||
              message.sender

            const isMine =
              String(senderId) === String(currentUserId)

            return (
              <div
                key={message._id}
                className={`chat-message ${
                  isMine ? 'sent' : 'received'
                }`}
              >
                <p>{message.text}</p>

                <span className="message-time">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
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
        onSubmit={handleSendMessage}
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={handleTyping}
        />

        <button type="submit" disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>

    </main>
  )
}

export default ChatWindow