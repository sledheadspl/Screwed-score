// Timestamped line logging. Every decision the bot makes goes through here, so
// a dry run leaves exactly the trail a live run would.

function stamp () {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

export function log (kind, message, extra = '') {
  const tail = extra ? ` - ${extra}` : ''
  const line = `${stamp()} [${kind}] ${message}${tail}`
  if (kind === 'error') console.error(line)
  else console.log(line)
}

export const info = message => log('info', message)
