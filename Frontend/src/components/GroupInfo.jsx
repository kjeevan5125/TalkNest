import { useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/authContext'

function GroupInfo({
  conversation,
  onClose,
}) {
  const { user } = useAuth()

  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] =
    useState(false)
  const [processing, setProcessing] =
    useState(false)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] =
    useState(false)

  if (!conversation) {
    return null
  }

  const currentUserId =
    user?._id || user?.id

  const participants =
    conversation.participants || []

  const adminId =
    conversation.groupAdmin?._id ||
    conversation.groupAdmin?.id ||
    conversation.groupAdmin

  const isAdmin =
    String(adminId) ===
    String(currentUserId)

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      setError('')

      const response =
        await api.get('/users')

      setUsers(response.data)
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Failed to load users'
      )
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleAddMember = async (
    userId
  ) => {
    try {
      setProcessing(true)
      setError('')

      await api.post(
        `/conversations/${conversation._id}/members`,
        {
          userId,
        }
      )

      setShowAdd(false)
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Failed to add member'
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveMember = async (
    userId
  ) => {
    try {
      setProcessing(true)
      setError('')

      await api.delete(
        `/conversations/${conversation._id}/members`,
        {
          data: {
            userId,
          },
        }
      )

    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Failed to remove member'
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleLeaveGroup = async () => {
    const confirmed =
      window.confirm(
        'Are you sure you want to leave this group?'
      )

    if (!confirmed) {
      return
    }

    try {
      setProcessing(true)
      setError('')

      await api.delete(
        `/conversations/${conversation._id}/leave`
      )

      onClose()
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Failed to leave group'
      )
    } finally {
      setProcessing(false)
    }
  }

  const existingMemberIds =
    participants.map(
      (participant) =>
        String(participant._id)
    )

  const availableUsers =
    users.filter(
      (item) =>
        !existingMemberIds.includes(
          String(item._id)
        )
    )

  return (
    <div className="group-info-overlay">
      <div className="group-info">

        <div className="group-info-header">
          <h3>Group Info</h3>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="group-info-title">
          <div className="group-info-avatar">
            {conversation.groupName
              ?.charAt(0)
              ?.toUpperCase()}
          </div>

          <h2>
            {conversation.groupName}
          </h2>

          <p>
            {participants.length} members
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="group-add-button"
            onClick={() => {
              setShowAdd(!showAdd)

              if (!showAdd) {
                fetchUsers()
              }
            }}
          >
            {showAdd
              ? 'Close Add Member'
              : 'Add Member'}
          </button>
        )}

        {showAdd && isAdmin && (
          <div className="group-add-section">

            {loadingUsers ? (
              <p>
                Loading users...
              </p>
            ) : availableUsers.length ===
              0 ? (
              <p>
                No users available.
              </p>
            ) : (
              availableUsers.map(
                (item) => (
                  <div
                    className="group-add-user"
                    key={item._id}
                  >
                    <div>
                      <strong>
                        {item.name}
                      </strong>

                      <span>
                        {item.email}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={
                        processing
                      }
                      onClick={() =>
                        handleAddMember(
                          item._id
                        )
                      }
                    >
                      Add
                    </button>
                  </div>
                )
              )
            )}

          </div>
        )}

        {error && (
          <p className="group-error">
            {error}
          </p>
        )}

        <div className="group-members">

          <h4>
            Members
          </h4>

          {participants.map(
            (participant) => {
              const participantId =
                participant._id ||
                participant.id

              const isCurrentUser =
                String(
                  participantId
                ) ===
                String(currentUserId)

              const isParticipantAdmin =
                String(
                  participantId
                ) ===
                String(adminId)

              return (
                <div
                  className="group-member"
                  key={participantId}
                >

                  <div className="group-member-avatar">
                    {participant.name
                      ?.charAt(0)
                      ?.toUpperCase()}
                  </div>

                  <div className="group-member-info">

                    <strong>
                      {isCurrentUser
                        ? 'You'
                        : participant.name}
                    </strong>

                    <span>
                      {participant.email}
                    </span>

                  </div>

                  {isParticipantAdmin && (
                    <span className="group-admin">
                      Admin
                    </span>
                  )}

                  {isAdmin &&
                    !isParticipantAdmin &&
                    !isCurrentUser && (
                      <button
                        type="button"
                        className="group-remove-button"
                        disabled={
                          processing
                        }
                        onClick={() =>
                          handleRemoveMember(
                            participantId
                          )
                        }
                      >
                        Remove
                      </button>
                    )}

                </div>
              )
            }
          )}

        </div>

        {!isAdmin && (
          <button
            type="button"
            className="group-leave-button"
            disabled={processing}
            onClick={
              handleLeaveGroup
            }
          >
            Leave Group
          </button>
        )}

      </div>
    </div>
  )
}

export default GroupInfo
