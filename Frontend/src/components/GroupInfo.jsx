import { useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/authContext'

function GroupInfo({ conversation, onClose }) {
  const { user } = useAuth()

  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  if (!conversation) {
    return null
  }

  const currentUserId = user?._id || user?.id
  const participants = conversation.participants || []
  const adminId =
    conversation.groupAdmin?._id ||
    conversation.groupAdmin?.id ||
    conversation.groupAdmin

  const isAdmin = String(adminId) === String(currentUserId)

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      setError('')

      const response = await api.get('/users')
      setUsers(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleAddMember = async (userId) => {
    try {
      setProcessing(true)
      setError('')

      await api.post(`/conversations/${conversation._id}/members`, {
        userId,
      })

      setShowAdd(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member')
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveMember = async (userId) => {
    const confirmed = window.confirm('Remove this member from the group?')
    if (!confirmed) {
      return
    }

    try {
      setProcessing(true)
      setError('')

      await api.delete(`/conversations/${conversation._id}/members`, {
        data: { userId },
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member')
    } finally {
      setProcessing(false)
    }
  }

  const handleMakeAdmin = async (userId, userName) => {
    const confirmed = window.confirm(
      `Make ${userName || 'this member'} the new group admin?`
    )
    if (!confirmed) {
      return
    }

    try {
      setProcessing(true)
      setError('')

      await api.put(`/conversations/${conversation._id}/admin`, {
        userId,
      })
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to assign new group admin'
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleLeaveGroup = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to leave this group?'
    )

    if (!confirmed) {
      return
    }

    try {
      setProcessing(true)
      setError('')

      await api.delete(`/conversations/${conversation._id}/leave`)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave group')
    } finally {
      setProcessing(false)
    }
  }

  const existingMemberIds = participants.map((participant) =>
    String(participant._id || participant.id || participant)
  )

  const availableUsers = users.filter(
    (item) => !existingMemberIds.includes(String(item._id))
  )

  return (
    <div className="group-info-overlay" onClick={onClose}>
      <div className="group-info-card" onClick={(e) => e.stopPropagation()}>
        <div className="group-info-header">
          <h3>Group Details</h3>
          <button type="button" className="group-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="group-info-hero">
          <div className="group-hero-avatar">
            {conversation.groupName?.charAt(0)?.toUpperCase() || 'G'}
          </div>

          <h2 className="group-hero-name">{conversation.groupName}</h2>
          <p className="group-hero-meta">
            {participants.length} {participants.length === 1 ? 'member' : 'members'}
          </p>
        </div>

        {error && <div className="group-error-banner">{error}</div>}

        {isAdmin && (
          <button
            type="button"
            className="group-action-btn primary"
            onClick={() => {
              const next = !showAdd
              setShowAdd(next)
              if (next) {
                fetchUsers()
              }
            }}
          >
            {showAdd ? 'Cancel Add Member' : '+ Add New Member'}
          </button>
        )}

        {showAdd && isAdmin && (
          <div className="group-add-section">
            <h4 className="section-title">Select User to Add</h4>
            {loadingUsers ? (
              <p className="status-muted">Loading users...</p>
            ) : availableUsers.length === 0 ? (
              <p className="status-muted">All registered users are already members.</p>
            ) : (
              <div className="group-user-list">
                {availableUsers.map((item) => (
                  <div className="group-user-item" key={item._id}>
                    <div className="user-avatar-small">
                      {item.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="user-text">
                      <strong>{item.name}</strong>
                      <span>{item.email}</span>
                    </div>
                    <button
                      type="button"
                      className="add-btn-small"
                      disabled={processing}
                      onClick={() => handleAddMember(item._id)}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="group-members-container">
          <h4 className="section-title">
            Members ({participants.length})
          </h4>

          <div className="group-members-list">
            {participants.map((participant) => {
              const participantId = participant._id || participant.id || participant
              const isCurrentUser = String(participantId) === String(currentUserId)
              const isParticipantAdmin = String(participantId) === String(adminId)

              return (
                <div className="group-member-row" key={participantId}>
                  <div className="group-member-avatar">
                    {participant.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>

                  <div className="group-member-details">
                    <span className="member-name">
                      {isCurrentUser ? `${participant.name} (You)` : participant.name}
                    </span>
                    <span className="member-email">{participant.email}</span>
                  </div>

                  <div className="group-member-actions">
                    {isParticipantAdmin && (
                      <span className="badge-admin">Admin</span>
                    )}

                    {isAdmin && !isParticipantAdmin && !isCurrentUser && (
                      <>
                        <button
                          type="button"
                          className="btn-make-admin"
                          disabled={processing}
                          title="Promote to Admin"
                          onClick={() =>
                            handleMakeAdmin(participantId, participant.name)
                          }
                        >
                          Make Admin
                        </button>

                        <button
                          type="button"
                          className="btn-remove-member"
                          disabled={processing}
                          title="Remove Member"
                          onClick={() => handleRemoveMember(participantId)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {!isAdmin && (
          <button
            type="button"
            className="group-leave-btn"
            disabled={processing}
            onClick={handleLeaveGroup}
          >
            Leave Group
          </button>
        )}
      </div>
    </div>
  )
}

export default GroupInfo
