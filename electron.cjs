const { app, Tray, Menu, shell, clipboard, nativeImage } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

let tray = null
let serverProcess = null
const isDev = !app.isPackaged

// Server configuration
const SERVER_PORT = 3001

// Get the correct resource path
function getResourcePath(...segments) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', ...segments)
  }
  return path.join(__dirname, ...segments)
}

// Check if server is ready
function checkServerReady(timeout = 20000) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const check = () => {
      if (Date.now() - startTime > timeout) {
        resolve(false)
        return
      }
      http.get(`http://localhost:${SERVER_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true)
        } else {
          setTimeout(check, 500)
        }
      }).on('error', () => {
        setTimeout(check, 500)
      })
    }
    check()
  })
}

function startServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      console.log('Dev mode: Assuming server is running separately')
      checkServerReady().then(resolve)
      return
    }

    const serverPath = getResourcePath('server', 'start.cjs')
    const appRoot = getResourcePath()
    console.log('Starting server from:', serverPath)
    
    const nodePath = process.execPath
    
    // Use app.getPath('userData') for persistent storage
    const userDataPath = app.getPath('userData')
    const soundstageDataDir = path.join(userDataPath, 'data')
    
    serverProcess = spawn(nodePath, [serverPath], {
      env: { 
        ...process.env, 
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1',
        PORT: SERVER_PORT.toString(),
        SOUNDSTAGE_DATA_DIR: soundstageDataDir
      },
      cwd: appRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data.toString().trim()}`)
    })

    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim()
      if (!msg.includes('ExperimentalWarning') && !msg.includes('MODULE_TYPELESS')) {
        console.error(`Server Error: ${msg}`)
      }
    })

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err)
      reject(err)
    })

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`)
      serverProcess = null
      updateTrayMenu()
    })

    checkServerReady().then((ready) => {
      if (ready) {
        console.log('Server is ready!')
        updateTrayMenu()
        resolve()
      } else {
        console.error('Server failed to start in time')
        reject(new Error('Server timeout'))
      }
    })
  })
}

function stopServer() {
  if (serverProcess) {
    console.log('Stopping server...')
    serverProcess.kill('SIGTERM')
    serverProcess = null
  }
}

function createTrayIcon() {
  // Load the Soundstage logo for the menu bar
  // Use the actual logo PNG and resize it to menu bar size (22x22 for standard, 44x44 for retina)
  const logoPath = getResourcePath('Logos', 'Soundstage logo.png')
  
  try {
    let icon = nativeImage.createFromPath(logoPath)
    // Resize to 22x22 for menu bar (will be scaled up for retina displays)
    icon = icon.resize({ width: 22, height: 22 })
    icon.setTemplateImage(true) // Makes it adapt to light/dark menu bar
    return icon
  } catch (err) {
    console.error('Failed to load logo, using fallback:', err)
    // Fallback to simple "S" if logo fails to load
    const size = 22
    const canvas = Buffer.alloc(size * size * 4)
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4
        const isS = (
          (x >= 6 && x <= 16 && y >= 2 && y <= 4) ||
          (x >= 4 && x <= 6 && y >= 2 && y <= 9) ||
          (x >= 6 && x <= 16 && y >= 9 && y <= 11) ||
          (x >= 15 && x <= 17 && y >= 11 && y <= 18) ||
          (x >= 5 && x <= 15 && y >= 17 && y <= 19) ||
          (x >= 15 && x <= 17 && y >= 2 && y <= 4) ||
          (x >= 4 && x <= 6 && y >= 17 && y <= 19)
        )
        if (isS) {
          canvas[idx] = 255
          canvas[idx + 1] = 255
          canvas[idx + 2] = 255
          canvas[idx + 3] = 255
        } else {
          canvas[idx] = 0
          canvas[idx + 1] = 0
          canvas[idx + 2] = 0
          canvas[idx + 3] = 0
        }
      }
    }
    
    const fallbackIcon = nativeImage.createFromBuffer(canvas, { width: size, height: size })
    fallbackIcon.setTemplateImage(true)
    return fallbackIcon
  }
}

function createTray() {
  const trayIcon = createTrayIcon()
  tray = new Tray(trayIcon)
  tray.setToolTip('Soundstage Media Server')
  updateTrayMenu()
}

function updateTrayMenu() {
  if (!tray) return
  
  const serverRunning = serverProcess !== null || isDev
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Soundstage Media Server',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open in Browser',
      click: () => {
        shell.openExternal(`http://localhost:${SERVER_PORT}`)
      }
    },
    {
      label: 'Copy Server URL',
      click: () => {
        clipboard.writeText(`http://localhost:${SERVER_PORT}`)
      }
    },
    { type: 'separator' },
    {
      label: serverRunning ? '● Server Running' : '○ Server Stopped',
      enabled: false
    },
    {
      label: `http://localhost:${SERVER_PORT}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit Soundstage',
      click: () => {
        stopServer()
        app.quit()
      }
    }
  ])
  
  tray.setContextMenu(contextMenu)
}

// App lifecycle
app.whenReady().then(async () => {
  // Hide dock icon on macOS - menu bar only
  if (process.platform === 'darwin') {
    app.dock.hide()
  }
  
  console.log('Soundstage starting...')
  console.log('Is packaged:', app.isPackaged)
  
  createTray()
  
  try {
    await startServer()
    console.log('Server started successfully')
    // Auto-open in browser after 1 second delay
    setTimeout(() => {
      shell.openExternal(`http://localhost:${SERVER_PORT}`)
    }, 1000)
  } catch (err) {
    console.error('Server startup error:', err)
  }
})

app.on('window-all-closed', () => {
  // Keep running - we're a menu bar app
})

app.on('before-quit', () => {
  stopServer()
})
