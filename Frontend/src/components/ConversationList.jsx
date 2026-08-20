import { useEffect, useState } from 'react'
import api from '../services/api'
import socket from '../services/socket'
import { useAuth } from '../context/authContext'
import CreateGroup from './CreateGroup'

function ConversationList({
  onSelectConversation,
}) {
  const { user } = useAuth()

  const [conversations, setConversations] =
    useState([])
  const [showCreateGroup, setShowCreateGroup] =
    useState(false)
  const [searchQuery, setSearchQuery] =
    useState('')

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response =
          await api.get('/conversations')

        const data = response.data

        const conversationData =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data?.conversations
              )
              ? data.conversations
              : Array.isArray(data?.data)
                ? data.data
                : []

        setConversations(
          conversationData
        )
      } catch (error) {
        console.error(
          'Failed to fetch conversations:',
          error
        )

        setConversations([])
      }
    }

    const handleUserOnline = ({
      userId,
    }) => {
      setConversations(
        (prevConversations) =>
          prevConversations.map(
            (conversation) => ({
              ...conversation,
              participants:
                conversation.participants?.map(
                  (participant) =>
                    String(
                      participant._id
                    ) ===
                    String(userId)
                      ? {
                          ...participant,
                          isOnline: true,
                        }
                      : participant
                ) || [],
            })
          )
      )
    }

    const handleUserOffline = ({
      userId,
    }) => {
      setConversations(
        (prevConversations) =>
          prevConversations.map(
            (conversation) => ({
              ...conversation,
              participants:
                conversation.participants?.map(
                  (participant) =>
                    String(
                      participant._id
                    ) ===
                    String(userId)
                      ? {
                          ...participant,
                          isOnline: false,
                        }
                      : participant
                ) || [],
            })
          )
      )
    }

    const handleNewMessage = (
      message
    ) => {
      const conversationId =
        message.conversation?._id ||
        message.conversation

      setConversations(
        (prevConversations) => {
          const exists =
            prevConversations.some(
              (conversation) =>
                String(
                  conversation._id
                ) ===
                String(
                  conversationId
                )
            )

          if (!exists) {
            return prevConversations
          }

          const updated =
            prevConversations.map(
              (conversation) =>
                String(
                  conversation._id
                ) ===
                String(
                  conversationId
                )
                  ? {
                      ...conversation,
                      lastMessage:
                        message,
                      updatedAt:
                        message.createdAt,
                    }
                  : conversation
            )

          return updated.sort(
            (a, b) =>
              new Date(
                b.updatedAt || 0
              ) -
              new Date(
                a.updatedAt || 0
              )
          )
        }
      )
    }

    const handleNewConversation = (
      conversation
    ) => {
      if (!conversation?._id) {
        return
      }

      setConversations(
        (prevConversations) => {
          const alreadyExists =
            prevConversations.some(
              (item) =>
                String(item._id) ===
                String(
                  conversation._id
                )
            )

          if (alreadyExists) {
            return prevConversations
          }

          return [
            conversation,
            ...prevConversations,
          ]
        }
      )
    }

    const handleGroupUpdated = (
      conversation
    ) => {
      if (!conversation?._id) {
        return
      }

      const currentUserId =
        user?._id || user?.id

      const isMember =
        conversation.participants?.some(
          (participant) =>
            String(participant._id) ===
            String(currentUserId)
        )

      setConversations(
        (prevConversations) => {
          const exists =
            prevConversations.some(
              (item) =>
                String(item._id) ===
                String(
                  conversation._id
                )
            )

          if (!isMember) {
            return prevConversations.filter(
              (item) =>
                String(item._id) !==
                String(
                  conversation._id
                )
            )
          }

          if (!exists) {
            return [
              conversation,
              ...prevConversations,
            ]
          }

          return prevConversations
            .map((item) =>
              String(item._id) ===
              String(
                conversation._id
              )
                ? conversation
                : item
            )
            .sort(
              (a, b) =>
                new Date(
                  b.updatedAt || 0
                ) -
                new Date(
                  a.updatedAt || 0
                )
            )
        }
      )
    }

    fetchConversations()

    socket.on(
      'newMessage',
      handleNewMessage
    )

    socket.on(
      'userOnline',
      handleUserOnline
    )

    socket.on(
      'userOffline',
      handleUserOffline
    )

    socket.on(
      'newConversation',
      handleNewConversation
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
        'userOnline',
        handleUserOnline
      )

      socket.off(
        'userOffline',
        handleUserOffline
      )

      socket.off(
        'newConversation',
        handleNewConversation
      )

      socket.off(
        'groupUpdated',
        handleGroupUpdated
      )
    }
  }, [user])

  const handleGroupCreated = (
    conversation
  ) => {
    if (!conversation?._id) {
      return
    }

    setConversations(
      (prevConversations) => {
        const alreadyExists =
          prevConversations.some(
            (item) =>
              String(item._id) ===
              String(
                conversation._id
              )
          )

        if (alreadyExists) {
          return prevConversations
        }

        return [
          conversation,
          ...prevConversations,
        ]
      }
    )

    onSelectConversation(
      conversation
    )
  }

  const normalizedQuery =
    searchQuery.trim().toLowerCase()

  const filteredConversations =
    conversations.filter((conversation) => {
      if (!normalizedQuery) {
        return true
      }

      const participants =
        conversation.participants || []
      const currentUserId =
        user?._id || user?.id
      const otherUser = participants.find(
        (participant) =>
          String(participant._id) !==
          String(currentUserId)
      )
      const conversationName =
        conversation.isGroup
          ? conversation.groupName
          : otherUser?.name

      return conversationName
        ?.toLowerCase()
        .includes(normalizedQuery)
    })

  return (
    <aside className="conversation-list">

      <div className="conversation-header">
        <h3>
          Conversations
        </h3>

        <button
          type="button"
          onClick={() =>
            setShowCreateGroup(true)
          }
        >
          +
        </button>
      </div>

      <input
        type="text"
        placeholder="Search conversations"
        className="conversation-search"
        value={searchQuery}
        onChange={(event) =>
          setSearchQuery(event.target.value)
        }
      />

      <div className="conversation-items">

        {filteredConversations.map(
          (conversation) => {
            const participants =
              conversation.participants ||
              []

            const currentUserId =
              user?._id || user?.id

            const otherUser =
              participants.find(
                (participant) =>
                  String(
                    participant._id
                  ) !==
                  String(
                    currentUserId
                  )
              )

            const conversationName =
              conversation.isGroup
                ? conversation.groupName
                : otherUser?.name

            return (
              <div
                className="conversation-item"
                key={
                  conversation._id
                }
                onClick={() =>
                  onSelectConversation(
                    conversation
                  )
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
                  {conversationName
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>

                <div className="conversation-info">

                  <strong>
                    {conversationName}
                  </strong>

                  <p>
                    {conversation.lastMessage
                      ?.text ||
                      'No messages yet'}
                  </p>

                </div>

              </div>
            )
          }
        )}

        {filteredConversations.length === 0 && (
          <p className="conversation-empty">
            No conversations found.
          </p>
        )}

      </div>

      {showCreateGroup && (
        <CreateGroup
          onClose={() =>
            setShowCreateGroup(false)
          }
          onGroupCreated={
            handleGroupCreated
          }
        />
      )}

    </aside>
  )
}

export default ConversationList
