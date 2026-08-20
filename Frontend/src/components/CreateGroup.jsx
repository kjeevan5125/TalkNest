import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/authContext'

function CreateGroup({ onClose, onGroupCreated }) {
  const { user } = useAuth()

  const [groupName, setGroupName] = useState('')
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users')

        setUsers(response.data)
      } catch (error) {
        console.error(
          'Failed to fetch users:',
          error
        )

        setError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter(
            (id) => id !== userId
          )
        : [...prev, userId]
    )
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()

    if (!groupName.trim()) {
      setError('Enter a group name')
      return
    }

    if (selectedUsers.length === 0) {
      setError('Select at least one member')
      return
    }

    try {
      setCreating(true)
      setError('')

      const currentUserId =
        user?._id || user?.id

      const response = await api.post(
        '/conversations/group',
        {
          groupName: groupName.trim(),

          participants: [
            ...selectedUsers,
            currentUserId,
          ],
        }
      )

      const createdConversation =
        response.data?.conversation ||
        response.data

      if (!createdConversation?._id) {
        throw new Error(
          'Invalid group response from server'
        )
      }

      onGroupCreated(
        createdConversation
      )

      onClose()
    } catch (error) {
      console.error(
        'Failed to create group:',
        error
      )

      setError(
        error.response?.data?.message ||
          error.message ||
          'Failed to create group'
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="group-modal-overlay">

      <div className="group-modal">

        <div className="group-modal-header">

          <h3>Create Group</h3>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <form
          onSubmit={
            handleCreateGroup
          }
        >

          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) =>
              setGroupName(
                e.target.value
              )
            }
          />

          <h4>
            Select members
          </h4>

          {loading ? (
            <p>
              Loading users...
            </p>
          ) : users.length === 0 ? (
            <p>
              No users available.
            </p>
          ) : (
            <div className="group-user-list">

              {users.map((item) => (
                <label
                  key={item._id}
                  className="group-user-item"
                >

                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(
                      item._id
                    )}
                    onChange={() =>
                      toggleUser(
                        item._id
                      )
                    }
                  />

                  <span>
                    {item.name}
                  </span>

                  <small>
                    {item.isOnline
                      ? 'Online'
                      : 'Offline'}
                  </small>

                </label>
              ))}

            </div>
          )}

          {error && (
            <p className="group-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={creating}
          >
            {creating
              ? 'Creating...'
              : 'Create Group'}
          </button>

        </form>

      </div>

    </div>
  )
}

export default CreateGroup
