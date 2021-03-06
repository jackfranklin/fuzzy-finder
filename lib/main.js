const {Disposable} = require('atom')
const FileIcons = require('./file-icons')

module.exports = {
  activate (state) {
    this.active = true

    atom.commands.add('atom-workspace', {
      'jf-fuzzy-finder:toggle-file-finder': () => {
        this.createProjectView().toggle()
      },
      'jf-fuzzy-finder:toggle-buffer-finder': () => {
        this.createBufferView().toggle()
      },
      'jf-fuzzy-finder:toggle-git-status-finder': () => {
        this.createGitStatusView().toggle()
      },
      'jf-fuzzy-finder:reindex': () => {
        this.createProjectView().reIndex()
      },
    })

    process.nextTick(() => this.startLoadPathsTask())

    for (let editor of atom.workspace.getTextEditors()) {
      editor.lastOpened = state[editor.getPath()]
    }

    atom.workspace.observePanes((pane) => {
      pane.observeActiveItem((item) => {
        if (item != null) item.lastOpened = Date.now()
      })
    })
  },

  deactivate () {
    if (this.projectView != null) {
      this.projectView.destroy()
      this.projectView = null
    }
    if (this.bufferView != null) {
      this.bufferView.destroy()
      this.bufferView = null
    }
    if (this.gitStatusView != null) {
      this.gitStatusView.destroy()
      this.gitStatusView = null
    }
    this.projectPaths = null
    this.stopLoadPathsTask()
    this.active = false
  },

  consumeFileIcons (service) {
    FileIcons.setService(service)
    return new Disposable(() => FileIcons.resetService())
  },

  serialize () {
    const paths = {}
    for (let editor of atom.workspace.getTextEditors()) {
      const path = editor.getPath()
      if (path != null) { paths[path] = editor.lastOpened }
    }
    return paths
  },

  createProjectView () {
    this.stopLoadPathsTask()

    if (this.projectView == null) {
      const ProjectView = require('./project-view')
      this.projectView = new ProjectView(this.projectPaths)
      this.projectPaths = null
    }
    return this.projectView
  },

  createGitStatusView () {
    if (this.gitStatusView == null) {
      const GitStatusView = require('./git-status-view')
      this.gitStatusView = new GitStatusView()
    }
    return this.gitStatusView
  },

  createBufferView () {
    if (this.bufferView == null) {
      const BufferView = require('./buffer-view')
      this.bufferView = new BufferView()
    }
    return this.bufferView
  },

  startLoadPathsTask () {
    this.stopLoadPathsTask()

    if (!this.active) return
    if (atom.project.getPaths().length === 0) return

    const PathLoader = require('./path-loader')
    this.loadPathsTask = PathLoader.startTask((projectPaths) => {
      this.projectPaths = projectPaths
    })
    this.projectPathsSubscription = atom.project.onDidChangePaths(() => {
      this.projectPaths = null
      this.stopLoadPathsTask()
    })
  },

  stopLoadPathsTask () {
    if (this.projectPathsSubscription != null) {
      this.projectPathsSubscription.dispose()
    }
    this.projectPathsSubscription = null

    if (this.loadPathsTask != null) {
      this.loadPathsTask.terminate()
    }
    this.loadPathsTask = null
  }
}
