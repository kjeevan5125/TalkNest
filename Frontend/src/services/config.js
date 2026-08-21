export const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL

  if (envUrl) {
    try {
      const url = new URL(envUrl)
      const currentHost = window.location.hostname

      if (
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
        currentHost !== 'localhost' &&
        currentHost !== '127.0.0.1' &&
        currentHost !== ''
      ) {
        url.hostname = currentHost
        return url.origin
      }
      return envUrl
    } catch {
      return envUrl
    }
  }

  const protocol = window.location.protocol || 'http:'
  const hostname = window.location.hostname || 'localhost'
  return `${protocol}//${hostname}:5000`
}

