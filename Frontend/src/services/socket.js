import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
  transports: ['websocket'],
})

export const connectSocket = (token) => {
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