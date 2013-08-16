// Generated by IcedCoffeeScript 1.6.3-e
(function() {
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };



  window.db = window.Dropbox;

  BrowserFS.File.DropboxFile = (function(_super) {
    __extends(DropboxFile, _super);

    function DropboxFile() {
      _ref = DropboxFile.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    DropboxFile.prototype.syncSync = function() {
      this._fs.client.write(this._path, this._buffer.toString(), function(error, stat) {
        if (error) {
          return console.log(error);
        }
      });
    };

    DropboxFile.prototype.closeSync = function() {
      return this.syncSync();
    };

    return DropboxFile;

  })(BrowserFS.File.PreloadFile);

  BrowserFS.FileSystem.Dropbox = (function(_super) {
    __extends(Dropbox, _super);

    function Dropbox() {
      var _this = this;
      this.init_client = new db.Client({
        key: 'u8sx6mjp5bxvbg4',
        sandbox: true
      });
      this.init_client.authDriver(new db.AuthDriver.Redirect({
        rememberUser: true
      }));
      this.init_client.authenticate(function(error, authed_client) {
        if (error) {
          console.error('Error: could not connect to Dropbox.');
          console.error(error);
          return;
        }
        authed_client.getUserInfo(function(error, info) {
          return console.log(info.name);
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

    Dropbox.prototype.rename = function(oldPath, newPath, cb) {
      return this.client.move(oldPath, newPath, function(error, stat) {
        if (error) {
          return cb(error);
        }
      });
    };

    Dropbox.prototype.stat = function(path, isLstat, cb) {
      return this.client.stat(path, {}, function(error, stat) {
        return cb(error, stat);
      });
    };

    Dropbox.prototype.open = function(path, flags, mode, cb) {
      var fs;
      fs = this;
      return this.client.readFile(path, function(error, content, stat, range) {
        var file;
        if (error) {
          if (error.status === 404) {
            content = '';
            this.client.writeFile(path, content, function(error) {
              return console.log(error);
            });
          }
        }
        file = new BrowserFS.File.DropboxFile(fs, path, mode, stat, content);
        return cb(error, file);
      });
    };

    Dropbox.prototype._remove = function(path, cb) {
      return this.client.remove(path, function(error, stat) {
        if (error) {
          return cb(error);
        }
      });
    };

    Dropbox.prototype.unlink = function(path, cb) {
      return this._remove(path, cb);
    };

    Dropbox.prototype.rmdir = function(path, cb) {
      return this._remove(path, cb);
    };

    Dropbox.prototype.mkdir = function(path, mode, cb) {
      return this.client.mkdir(path, function(error, stat) {
        if (error) {
          return cb(error);
        }
      });
    };

    Dropbox.prototype.readdir = function(path, cb) {
      return this.client.readdir(path, {}, function(error, files, dir_stat, content_stats) {
        return cb(error, files);
      });
    };

    Dropbox.prototype.writeFile = function(fname, data, encoding, flag, mode, cb) {
      return this.open(fname, flag, mode, function(error, file) {
        return file.write(data, 0, data.length, 0, function(error) {
          return cb(err);
        });
      });
    };

    return Dropbox;

  })(BrowserFS.FileSystem);

}).call(this);
