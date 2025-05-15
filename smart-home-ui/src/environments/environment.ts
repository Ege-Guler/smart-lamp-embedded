export const environment = {
  production: false,
  mqtt: {
    host: '',
    port: 8884,
    protocol: 'wss',
    path: '/mqtt',
    username: '',
    password: '',
    clientId: 'smart-home-ui-' + Math.random().toString(16).substring(2, 8)
  }
}; 