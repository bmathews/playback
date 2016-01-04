import {
  app,
  dialog,
  BrowserWindow,
  ipcMain as ipc,
  powerSaveBlocker,
  globalShortcut,
  default as electron
} from 'electron'

electron.crashReporter.start()

let win

const allowSleep = () => {
  if (typeof app.sleepId !== 'undefined') {
    console.log('Allowing sleep')
    powerSaveBlocker.stop(app.sleepId)
    delete app.sleepId
  }
}

const preventSleep = () => {
  if (typeof app.sleepId === 'undefined') {
    console.log('Preventing sleep')
    app.sleepId = powerSaveBlocker.start('prevent-display-sleep')
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  allowSleep()
})

app.on('ready', () => {
  win = new BrowserWindow({
    title: 'playback',
    frame: false,
    width: 860,
    height: 470
  })
  win.loadURL('file://' + __dirname + '/front/index.html#' + JSON.stringify(process.argv.slice(2)))
  win.webContents.openDevTools()

  win.on('closed', () => {
    win = null
  })

  win.on('enter-full-screen', () => { win.send('fullscreen-change', true) })
  win.on('leave-full-screen', () => { win.send('fullscreen-change', false) })

  globalShortcut.register('mediaplaypause', () => { win.send('togglePlay') })
  globalShortcut.register('medianexttrack', () => { win.send('next') })
  globalShortcut.register('mediaprevioustrack', () => { win.send('previous') })
})

ipc.on('open-file-dialog', () => {
  const files = dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
  if (files) win.send('load-files', files)
})

ipc.on('toggle-fullscreen', () => {
  win.setFullScreen(!win.isFullScreen())
})

ipc.on('focus', () => {
  win.focus()
})

ipc.on('minimize', () => {
  win.minimize()
})

ipc.on('maximize', () => {
  win.maximize()
})

ipc.on('close', () => {
  app.quit()
})

ipc.on('prevent-sleep', () => {
  preventSleep()
})

ipc.on('allow-sleep', () => {
  allowSleep()
})

ipc.on('resize', (e, message) => {
  if (win.isMaximized()) return
  const width = win.getSize()[0]
  win.setSize(width, message.height / message.width * width | 0)
})
