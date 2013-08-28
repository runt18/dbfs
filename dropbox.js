// Generated by CoffeeScript 1.6.3
(function() {
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  window.db = window.Dropbox;

  BrowserFS.File.DropboxFile = (function(_super) {
    __extends(DropboxFile, _super);

    function DropboxFile() {
      _ref = DropboxFile.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    DropboxFile.prototype.sync = function(cb) {
      return this._fs.client.writeFile(this._path, this._buffer.buff, function(error, stat) {
        if (error) {
          return cb(error);
        } else {
          return cb();
        }
      });
    };

    DropboxFile.prototype.close = function(cb) {
      return this.sync(cb);
    };

    return DropboxFile;

  })(BrowserFS.File.PreloadFile);

  BrowserFS.FileSystem.Dropbox = (function(_super) {
    __extends(Dropbox, _super);

    function Dropbox(testing) {
      var _this = this;
      if (testing == null) {
        testing = false;
      }
      this.init_client = new db.Client({
        key: 'u8sx6mjp5bxvbg4',
        sandbox: true
      });
      if (testing) {
        this.init_client.setCredentials({
          key: "u8sx6mjp5bxvbg4",
          token: "mhkmZQTE4PUAAAAAAAAAAYyMdcdkqvPudyYwmuIZp3REM1YvV9skdtstDBYUxuFg",
          uid: "4326179"
        });
      } else {
        this.init_client.authDriver(new db.AuthDriver.Redirect({
          rememberUser: true
        }));
      }
      this.init_client.authenticate(function(error, authed_client) {
        if (error) {
          console.error('Error: could not connect to Dropbox');
          console.error(error);
          return;
        }
        authed_client.getUserInfo(function(error, info) {
          return console.debug("Successfully connected to " + info.name + "'s Dropbox");
        });
        return _this.client = authed_client;
      });
    }

    Dropbox.prototype.getName = function() {
      return 'Dropbox';
    };

    Dropbox.isAvailable = function() {
      return true;
    };

    Dropbox.prototype.isReadOnly = function() {
      return false;
    };

    Dropbox.prototype.supportsSymlinks = function() {
      return false;
    };

    Dropbox.prototype.supportsProps = function() {
      return false;
    };

    Dropbox.prototype.supportsSynch = function() {
      return false;
    };

    Dropbox.prototype.empty = function(main_cb) {
      var fs;
      fs = this;
      return fs.client.readdir('/', function(error, paths, dir, files) {
        var deleteFile, finished;
        if (error) {
          return main_cb(error);
        } else {
          deleteFile = function(file, cb) {
            return fs.client.remove(file.path, function(err, stat) {
              if (err) {
                return cb(err);
              } else {
                return cb(null);
              }
            });
          };
          finished = function(err) {
            if (err) {
              console.error("Failed to empty Dropbox");
              return console.error(err);
            } else {
              console.debug('Emptied sucessfully');
              return main_cb();
            }
          };
          return async.each(files, deleteFile, finished);
        }
      });
    };

    Dropbox.prototype.rename = function(oldPath, newPath, cb) {
      return this.client.move(oldPath, newPath, function(error, stat) {
        var type;
        if (error) {
          return cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "" + oldPath + " doesn't exist"));
        } else {
          type = stat.isFile ? BrowserFS.node.fs.Stats.FILE : BrowserFS.node.fs.Stats.DIRECTORY;
          stat = new BrowserFS.node.fs.Stats(type, stat.size);
          return cb(null, stat);
        }
      });
    };

    Dropbox.prototype.stat = function(path, isLstat, cb) {
      return this.client.stat(path, {}, function(error, stat) {
        var type;
        if (error) {
          console.log(error);
          return cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "doesn't exist " + path));
        } else {
          type = stat.isFile ? BrowserFS.node.fs.Stats.FILE : BrowserFS.node.fs.Stats.DIRECTORY;
          stat = new BrowserFS.node.fs.Stats(type, stat.size);
          return cb({
            message: path
          }, stat);
        }
      });
    };

    Dropbox.prototype.open = function(path, flags, mode, cb) {
      var fs,
        _this = this;
      fs = this;
      return fs.client.readFile(path, {
        arrayBuffer: true
      }, function(error, content, db_stat, range) {
        var file;
        if (error) {
          if (__indexOf.call(flags.modeStr, 'r') >= 0) {
            cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "" + path + " doesn't exist "));
          } else {
            switch (error.status) {
              case 0:
                console.error('No connection');
                return;
              case 404:
                console.debug("" + path + " doesn't exist, creating...");
                content = '';
                fs.client.writeFile(path, content, function(error, stat) {
                  var file;
                  db_stat = stat;
                  file = fs._convertStat(path, mode, db_stat, content);
                  return cb(null, file);
                });
                return;
              default:
                console.log(error);
                return;
            }
          }
        } else {
          file = fs._convertStat(path, mode, db_stat, content);
          cb(null, file);
        }
      });
    };

    Dropbox.prototype._statType = function(stat) {
      return BrowserFS.node.fs.Stats[stat.isFile ? 'FILE' : 'DIRECTORY'];
    };

    Dropbox.prototype._convertStat = function(path, mode, stat, data) {
      var buffer, type;
      type = this._statType(stat);
      stat = new BrowserFS.node.fs.Stats(type, stat.size);
      data || (data = '');
      buffer = new BrowserFS.node.Buffer(data);
      mode = new BrowserFS.FileMode('w');
      return new BrowserFS.File.DropboxFile(this, path, mode, stat, buffer);
    };

    Dropbox.prototype._remove = function(path, cb, isFile) {
      var fs;
      fs = this;
      return fs.client.stat(path, function(error, stat) {
        var message;
        message = null;
        if (error) {
          return fs.sendError(cb, "" + path + " doesn't exist");
        } else {
          if (stat.isFile && !isFile) {
            return fs.sendError(cb, "Can't remove " + path + " with rmdir -- it's a file, not a directory. Use `unlink` instead.");
          } else if (!stat.isFile && isFile) {
            return fs.sendError(cb, "Can't remove " + path + " with unlink -- it's a directory, not a file. Use `rmdir` instead.");
          } else {
            return fs.client.remove(path, function(error, stat) {
              if (error) {
                return fs.sendError(cb, "Failed to remove " + path);
              } else {
                return cb(null);
              }
            });
          }
        }
      });
    };

    Dropbox.prototype.sendError = function(cb, msg) {
      return cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, msg));
    };

    Dropbox.prototype.unlink = function(path, cb) {
      return this._remove(path, cb, true);
    };

    Dropbox.prototype.rmdir = function(path, cb) {
      return this._remove(path, cb, false);
    };

    Dropbox.prototype.mkdir = function(path, mode, cb) {
      return this.client.mkdir(path, function(error, stat) {
        if (error) {
          return cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "" + path + " already exists"));
        } else {
          return cb(null);
        }
      });
    };

    Dropbox.prototype.readdir = function(path, cb) {
      return this.client.readdir(path, function(error, files, dir_stat, content_stats) {
        return cb(error, files);
      });
    };

    Dropbox.prototype.writeFile = function(path, data, encoding, flag, mode, cb) {
      var fs;
      fs = this;
      if (typeof data === 'string') {
        data = new BrowserFS.node.Buffer(data, encoding);
      }
      return this.client.writeFile(path, data.buff, function(error, stat) {
        var file;
        file = fs._convertStat(path, mode, stat, data);
        return cb(null, file);
      });
    };

    Dropbox.prototype.readFile = function(path, encoding, flag, cb) {
      var fs,
        _this = this;
      fs = this;
      return fs.client.readFile(path, {
        arrayBuffer: true
      }, function(error, content, stat, range) {
        var buffer;
        if (error) {
          return cb(new BrowserFS.ApiError(BrowserFS.ApiError.INVALID_PARAM, "No such file: " + path));
        } else {
          if (content !== null) {
            buffer = new BrowserFS.node.Buffer(content);
          } else {
            buffer = new BrowserFS.node.Buffer(0);
          }
          if (encoding) {
            return cb(null, buffer.toString(encoding));
          } else {
            return cb(null, buffer);
          }
        }
      });
    };

    return Dropbox;

  })(BrowserFS.FileSystem);

}).call(this);
