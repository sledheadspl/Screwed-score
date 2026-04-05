const fs = require('fs')
const path = require('path')

const handlerPath = path.join(
  __dirname,
  '.netlify/functions-internal/___netlify-server-handler/___netlify-server-handler.mjs'
)

if (!fs.existsSync(handlerPath)) {
  console.log('Handler not found, skipping path fix')
  process.exit(0)
}

let content = fs.readFileSync(handlerPath, 'utf8')

// On Windows, @netlify/plugin-nextjs writes paths with backslashes.
// On Linux (where Netlify runs), \v and \t are parsed as escape sequences,
// corrupting the import paths. Replace all \var\task\... with /var/task/...
content = content.replace(/\\var\\task\\getscrewedscore([^'"`\s]*)/g, (match, rest) => {
  return '/var/task/getscrewedscore' + rest.replace(/\\/g, '/')
})

fs.writeFileSync(handlerPath, content)
console.log('Fixed Windows paths in Netlify server handler')
