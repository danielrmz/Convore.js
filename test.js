var Convore = require("./Convore.js");
var sys = require("sys");

console.log("Starting...");
var local = new Convore("danielrmz","");
local.Live(function(message) {
    console.log(sys.inspect(message));
});

console.log("bye! ");
