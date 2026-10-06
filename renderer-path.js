const path = require('node:path')

// Both development and packaged applications use the same local-file navigation.
function rendererPath (filename) {
  return path.join(__dirname, 'dist', 'renderer', filename)
}

module.exports = { rendererPath }
