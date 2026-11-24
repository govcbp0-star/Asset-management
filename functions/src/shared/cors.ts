const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true'
const configuredOrigins = (process.env.ALLOWED_WEB_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const localDevelopmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']

export const allowedCallableOrigins: true | string[] = isEmulator || configuredOrigins.length === 0
  ? true
  : [...new Set([...configuredOrigins, ...localDevelopmentOrigins])]
