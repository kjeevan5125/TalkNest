import { useEffect, useState } from 'react'
import { useAuth } from '../context/authContext'
import ConversationList from './ConversationList'
import ChatWindow from './ChatWindow'
import socket, {
  connectSocket,
  disconnectSocket,
} from '../services/socket'

function ChatLayout() {
  const { user, logout } =
    useAuth()

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState(null)

  const token =
    localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      return
    }

    connectSocket(token)

    return () => {
      disconnectSocket()
    }
  }, [token])

  useEffect(() => {
    if (!selectedConversation) {
      return
    }

    const conversationId =
      selectedConversation._id

    const joinConversation =
      () => {
        socket.emit(
          'joinConversation',
          conversationId
        )
      }

    if (socket.connected) {
      joinConversation()
    } else {
      socket.once(
        'connect',
        joinConversation
      )
    }

    return () => {
      socket.off(
        'connect',
        joinConversation
      )
    }
  }, [selectedConversation])

  useEffect(() => {
    if (!token) {
      return
    }

    const handleNewMessage = (
      message
    ) => {
      const currentUserId =
        user?._id || user?.id

      const senderId =
        message.sender?._id ||
        message.sender?.id ||
        message.sender

      if (
        String(senderId) ===
        String(currentUserId)
      ) {
        return
      }

      socket.emit(
        'messageDelivered',
        message._id
      )
    }

    const handleGroupUpdated = (
      conversation
    ) => {
      if (
        !conversation?._id
      ) {
        return
      }

      const currentUserId =
        user?._id || user?.id

      const isMember =
        conversation.participants?.some(
          (participant) =>
            String(
              participant._id
            ) ===
            String(currentUserId)
        )

      if (!isMember) {
        if (
          selectedConversation &&
          String(
            selectedConversation._id
          ) ===
            String(
              conversation._id
            )
        ) {
          setSelectedConversation(
            null
          )
        }

        return
      }

      if (
        selectedConversation &&
        String(
          selectedConversation._id
        ) ===
          String(
            conversation._id
          )
      ) {
        setSelectedConversation(
          conversation
        )
      }
    }

    socket.on(
      'newMessage',
      handleNewMessage
    )

    socket.on(
      'groupUpdated',
      handleGroupUpdated
    )

    return () => {
      socket.off(
        'newMessage',
        handleNewMessage
      )

      socket.off(
        'groupUpdated',
        handleGroupUpdated
      )
    }
  }, [
    token,
    user,
    selectedConversation,
  ])

  return (
    <div className="chat-layout">

      <header className="chat-header">

        <h2>
          TalkNest
        </h2>

        <div className="chat-user">

          <span>
            {user?.name}
          </span>

          <button
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>

      <div className="chat-body">

        <ConversationList
          onSelectConversation={
            setSelectedConversation
          }
        />

        <ChatWindow
          key={
            selectedConversation?._id ||
            'empty-chat'
          }
          conversation={
            selectedConversation
          }
        />

      </div>

    </div>
  )
}

export default ChatLayout
