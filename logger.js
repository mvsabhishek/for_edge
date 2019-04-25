// Log generation code
var fs = require("fs");
var Logger = (exports.Logger = {});
var infoStream = fs.createWriteStream("logs/info.txt", {flags:'a'});
var errorStream = fs.createWriteStream("logs/error.txt", {flags:'a'});
var debugStream = fs.createWriteStream("logs/debug.txt", {flags:'a'});

Logger.info = function(msg) {
  var message = '\n'+ new Date().toISOString() + " : " + msg;
  infoStream.write(message);
};

Logger.debug = function(msg) {
  var message = '\n'+ new Date().toISOString() + " : " + msg;
  debugStream.write(message);
};

Logger.error = function(msg) {
  var message = '\n' + new Date().toISOString() + " : " + msg;
  errorStream.write(message);
};
