import { io } from 'socket.io-client'
import { getBaseUrl } from './config'

const socket = io(getBaseUrl(), {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
})

export const connectSocket = (token) => {
  if (!token) return

  socket.auth = {
    token,
  }

  if (!socket.connected) {
    socket.connect()
  }
}

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect()
  }
}

export default socket