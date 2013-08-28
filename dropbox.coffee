window.db = window.Dropbox

class BrowserFS.File.DropboxFile extends BrowserFS.File.PreloadFile
  sync: ->
    @_fs.client.writeFile(@_path, @_buffer.buff, (error, stat) ->
      console.log error if error
    )

  close: -> @sync()

class BrowserFS.FileSystem.Dropbox extends BrowserFS.FileSystem
  constructor: (testing=false) ->
    @init_client = new db.Client
      key: 'u8sx6mjp5bxvbg4'
      sandbox: true

    # Authenticate with pregenerated credentials for unit testing so that it
    # can be automatic
    if testing
      @init_client.setCredentials({
        key: "u8sx6mjp5bxvbg4",
        token: "mhkmZQTE4PUAAAAAAAAAAYyMdcdkqvPudyYwmuIZp3REM1YvV9skdtstDBYUxuFg",
        uid: "4326179"
      })
    # Prompt the user to authenticate under normal use
    else
      @init_client.authDriver(new db.AuthDriver.Redirect({ rememberUser: true }))

    @init_client.authenticate((error, authed_client) =>
      if error
        console.error 'Error: could not connect to Dropbox'
        console.error error
        return

      authed_client.getUserInfo((error, info) ->
        console.debug "Successfully connected to #{info.name}'s Dropbox"
      )

      @client = authed_client
    )

  getName: -> 'Dropbox'

  # Dropbox.js works on all supported browsers and Node.js
  @isAvailable: -> true

  # Files can be written to Dropbox
  isReadOnly: -> false

  # Dropbox doesn't support symlinks, properties, or synchronous calls
  supportsSymlinks: -> false

  supportsProps: -> false

  supportsSynch: -> false

  empty: (main_cb) ->
    fs = this
    fs.client.readdir('/', (error, paths, dir, files) ->
      if error
        main_cb(error)
      else
        deleteFile = (file, cb) ->
          fs.client.remove(file.path, (err, stat) ->
            if err
              cb(err)
            else
              cb(null)
          )
        finished = (err) ->
          if err
            console.error("Failed to empty Dropbox")
            console.error(err)
          else
            console.debug('Emptied sucessfully')
            main_cb()

        async.each(files, deleteFile, finished)
    )

  rename: (oldPath, newPath, cb) ->
    @client.move(oldPath, newPath, (error, stat) ->
      if error
        cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "#{oldPath} doesn't exist"))
      else
        type = if stat.isFile
          BrowserFS.node.fs.Stats.FILE
        else
          BrowserFS.node.fs.Stats.DIRECTORY

        stat = new BrowserFS.node.fs.Stats(type, stat.size)
        cb(null, stat)
    )

  stat: (path, isLstat, cb) ->
    @client.stat(path, {}, (error, stat) ->
      if error
        console.log(error)
        cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "doesn't exist #{path}"))
      else
        type = if stat.isFile
          BrowserFS.node.fs.Stats.FILE
        else
          BrowserFS.node.fs.Stats.DIRECTORY

        stat = new BrowserFS.node.fs.Stats(type, stat.size)
        cb({message: path}, stat)
    )

  open: (path, flags, mode, cb) ->
    fs = this
    # Try and get the file's contents
    fs.client.readFile(path, {arrayBuffer: true}, (error, content, db_stat, range) =>
      if error
        # If the file's being opened for reading and doesn't exist, return an error
        if 'r' in flags
          cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "#{path} doesn't exist "))
        else
          switch error.status
            when 0
              console.error('No connection')
              return
            # If it's being opened for writing, create it so that it can be written to
            when 404
              console.debug("#{path} doesn't exist, creating...")
              content = ''
              fs.client.writeFile(path, content, (error, stat) ->
                db_stat = stat
                file = fs._convertStat(path, mode, db_stat, content)
                cb(null, file)
              )
              return
            else
              console.log(error)
              return
      else
        file = fs._convertStat(path, mode, db_stat, content)
        cb(null, file)

      return
    )

  _statType: (stat) ->
    if stat.isFile
      BrowserFS.node.fs.Stats.FILE
    else
      BrowserFS.node.fs.Stats.DIRECTORY

  _convertStat: (path, mode, stat, data) ->
    type = @_statType(stat)

    stat = new BrowserFS.node.fs.Stats(type, stat.size)
    data or= ''

    buffer = new BrowserFS.node.Buffer(data)
    mode = new BrowserFS.FileMode('w')

    return new BrowserFS.File.DropboxFile(this, path, mode, stat, buffer)

  _remove: (path, cb, isFile) ->
    fs = this
    fs.client.stat(path, (error, stat) ->
      message = null
      if error
        fs.sendError(cb, "#{path} doesn't exist")
      else
        if stat.isFile and not isFile
          fs.sendError(cb, "Can't remove #{path} with rmdir -- it's a file, not a directory. Use `unlink` instead.")
        else if not stat.isFile and isFile
          fs.sendError(cb, "Can't remove #{path} with unlink -- it's a directory, not a file. Use `rmdir` instead.")
        else
          fs.client.remove(path, (error, stat) ->
            if error
              fs.sendError(cb, "Failed to remove #{path}")
            else
              cb(null)
          )
    )

  sendError: (cb, msg) ->
    cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, msg))

  # Delete a file
  unlink: (path, cb) -> @_remove(path, cb, true)

  # Delete a directory
  rmdir: (path, cb) -> @_remove(path, cb, false)

  # Create a directory
  mkdir: (path, mode, cb) ->
    @client.mkdir(path, (error, stat) ->
      if error
        cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "#{path} already exists"))
      else
        cb(null)
    )

  # Get the names of the files in a directory
  readdir: (path, cb) ->
    @client.readdir(path, (error, files, dir_stat, content_stats) ->
      cb(error, files)
    )

  writeFile: (path, data, encoding, flag, mode, cb) ->
    fs = this
    if typeof data is 'string'
      data = new BrowserFS.node.Buffer(data, encoding)
    @client.writeFile(path, data.buff, (error, stat) ->
      file = fs._convertStat(path, mode, stat, data)
      cb(null, file)
    )

  readFile: (path, encoding, flag, cb) ->
    fs = this
    # Try and get the file's contents
    fs.client.readFile(path, {arrayBuffer: true}, (error, content, stat, range) =>
      if error
        cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "No such file: #{path}"))
        # switch error.status
        #   when 0
        #     console.error('No connection to Dropbox')
        #   when 404
        #     console.log("#{path} doesn't exist")
        #   else
        #     console.log(error)
      else
        if content isnt null
          buffer = new BrowserFS.node.Buffer(content)

        # Dropbox.js seems to set `content` to `null` rather than to an empty
        # buffer when reading an empty file. Not sure why this is.
        else
          buffer = new BrowserFS.node.Buffer(0)

        if encoding
          cb(null, buffer.toString(encoding))
        else
          cb(null, buffer)
    )
