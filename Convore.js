/*
 * Convore's API Wrapper.
 * @author Daniel Ramirez <hello@danielrmz.com>
 * @license MIT License
 *
 * Provides all the functions associated to the wrapper as of March 1st. 2011.
 */
var sys = require('sys'),
    path = require('path'),
    http = require('http');

/*
 * @constructor
 */
var Convore = function(username, password) { 
	this._username = username;
	this._password = password;
};

/*
 * Creates the httpClient and makes the request.
 *
 * @param {string} method
 * @param {string} path
 * @param {object} body
 * @param {Function=} callback
 */
Convore.prototype._request = function(method, path, body, callback) {
	if(typeof body == 'function' && !callback) { 
		callback = body;
		body = null;
	}

	var headers = {};
	var client  = null;

	if(match = path.match(/^(https?):\/\/([^\/]+?)(\/.+)/) ) {
		console.log("match! [0] => " + match[0] + ", [1] => " + match[1] + ", [2] => " + match[2] + ", [3] => " + match[3]);
		headers = {"Host": match[2], 
			   "Content-Type": "application/json", 
			   "User-Agent": "ConvieNode" };
		port    = (match[1] == "https")?443:80;
		client  = http.createClient(port, match[2], port == 443);
		path    = match[3];
	} else {
		headers = {"Authorization":"Basic " + new Buffer(this._username + ":" + this._password).toString("base64"), 
			   "Host": "convore.com",
			   "Content-Type":"application/json",
			   "User-Agent":"ConvieNode"};
		client  = http.createClient(443, "184.106.83.80"/*"convore.com"*/, true);
	}
	if(method == "POST") {
		headers["Content-Length"] = body.length;
	}
	
	var req = client.request(method, path, headers);
	req.on("response", function(response) { 
		console.log("ResponseCode: " + response.statusCode);
		if(response.statusCode == 200) {
			var data = "";
			response.setEncoding("utf8");
			response.on("data", function(chunk) { data += chunk; });
			response.on("end", function() {
                                if(callback) {
					try { 
						body = JSON.parse(data);
					} catch(e) { 
						body = data;
					}
					callback(body);
				}
                                
			});
                } else if(response.statusCode == 401) { /* Unauthorized */
                    body = {"error":{"code":401,"message":"Unauthorized"}};
                    callback(body);
		} else if(response.statusCode == 302) {
			this._request(method, path, body, callback);
		} else {
			console.log("[ERROR] " + response.statusCode + ": " + path);
			response.setEncoding("utf8");
			response.on("data", function(chunk) { console.log(chunk); });
			process.exit(1);
		}
	});
	
	if(method == 'POST' && body) {
		req.write(body);
	}

	req.end();
};

/*
 * Creates a POST Request
 *
 * @param {string} path
 * @param {string} body
 * @param {Function=} callback
 */
Convore.prototype._post = function(path, body, callback) {
    this._request('POST', path, body, callback);
};

/*
 * Creates a GET Request
 *
 * @param {string} path
 * @param {string} body
 * @param {Function=} callback
 */
Convore.prototype._get  = function(path, body, callback) {
    this._request('GET', path, body, callback);
};

/* Custom Exceptions */
var ParameterException = function(message){ throw new Error(message); };
var ExceptionMessage = {"GroupId" : "A valid GroupId is required. ",
                        "TopicId": "A valid TopicId is required.",
                        "NullString": function(str) { return "The parameter: " + str + " is null. Value required. "; }};

/* APIs core wrappers functions */
Convore.prototype.Account_markRead = function(callback) { 
    this._post("/api/account/mark_read.json", callback);
};

Convore.prototype.Account_verify = function(user, pass, callback){ 
    (new Convore(user, pass))._get("/api/account/verify.json", callback);
};

Convore.prototype.Account_online = function(callback) { 
    this._get("api/account/online.json", callback);
};

Convore.prototype.Groups = function(callback) { 
    this._get("api/groups.json", callback);
};

Convore.prototype.Groups_byId = function(group_id, callback) {
    if(typeof group_id != 'number' || group_id <= 0) {
        ParameterRequired(ExceptionMessage.GroupId);
    }
    this._get("api/groups/"+group_id+".json", callback);
};

/*optional: description, slug */
Convore.prototype.Groups_create = function(name, kind, optional, callback) {
    var data = {"name":name, "kind": kind};
    if(optional && optional["description"]) {
        data["description"] = optional["description"];
    }
    if(optional && optional["slug"]) {
        data["slug"] = optional["slug"];
    }
    this._post("api/groups/create.json", data, callback);
};

Convore.prototype.Groups_join = function(group_id, callback) { 
    if(typeof group_id != 'number' || group_id <= 0) {
        ParameterRequired(ExceptionMessage.GroupId);
    }
    this._post("api/groups/"+group_id+"/join.json", callback);
};

Convore.prototype.Groups_request = function(group_id, callback) { 
    if(typeof group_id != 'number' || group_id <= 0) {
        ParameterRequired(ExceptionMessage.GroupId);
    }
    this._post("api/groups/"+group_id+"/request.json", callback);
};

Convore.prototype.Groups_leave = function(group_id, callback) { 
    if(typeof group_id != 'number' || group_id <= 0) {
        ParameterRequired(ExceptionMessage.GroupId);
    }
    this._post("api/groups/"+group_id+"/leave.json", callback);
};

Convore.prototype.Groups_online = function(group_id, callback) { 
    if(typeof group_id != 'number' || group_id <= 0) {
        ParameterRequired(ExceptionMessage.GroupId);
    }
    this._get("api/groups/"+group_id+"/online.json", callback);
};

/*optional: until_id */
Convore.prototype.Groups_topics = function(group_id, optional, callback) {
    var data = {};
    if(optional && optional["until_id"]) {
        data["until_id"] = optional["until_id"];
    }
    this._get("api/groups/"+group_id+"/topics.json", data, callback);
};

Convore.prototype.Groups_createTopic = function(group_id, name, callback) { 
    if(typeof group_id != 'number' || group_id <= 0) {
        ParameterRequired(ExceptionMessage.GroupId);
    }
    if(typeof name != 'string' || name.trim() == "") {
        ParameterRequired(ExceptionMessage.NullString("name"))
    }
    this._post("api/groups/"+group_id+"/topics/create.json", {"name":name}, callback);
};

Convore.prototype.Groups_markRead = function(group_id, callback) { 
    if(typeof group_id != 'number' || group_id <= 0) {
        ParameterRequired(ExceptionMessage.GroupId);
    }
    this._post("api/groups/"+group_id+"/mark_read.json", callback);
};

Convore.prototype.Topics_byId = function(topic_id, callback) { 
    if(typeof topic_id != 'number' || topic_id <= 0) {
        ParameterRequired(ExceptionMessage.TopicId);
    }
    this._get("api/topics/"+topic_id+".json", callback);
};

/*optional: until_id */
Convore.prototype.Topics_messages = function(topic_id, optional, callback) {
    if(typeof topic_id != 'number' || topic_id <= 0) {
        ParameterRequired(ExceptionMessage.TopicId);
    }

    var data = {};
    if(optional && optional["until_id"]) {
        data["until_id"] = optional["until_id"];
    }
    this._get("api/topics/"+topic_id+"/messages.json", data, callback);
};

Convore.prototype.Topics_createMessage = function(topic_id, message, callback) { 
    if(typeof topic_id != 'number' || topic_id <= 0) {
        ParameterRequired(ExceptionMessage.TopicId);
    }
    if(typeof message != 'string' || message.trim() == "") {
        ParameterRequired(ExceptionMessage.NullString("message"))
    }
    this._post("api/topics/"+topic_id+"/messages/create.json", {"message":message}, callback);
};

Convore.prototype.Topics_delete = function(topic_id, callback) { 
    if(typeof topic_id != 'number' || topic_id <= 0) {
        ParameterRequired(ExceptionMessage.TopicId);
    }
    this._post("api/topics/"+topic_id+"/delete.json", callback);
};

Convore.prototype.Topics_markRead = function(topic_id, callback) { 
    if(typeof topic_id != 'number' || topic_id <= 0) {
        ParameterRequired(ExceptionMessage.TopicId);
    }
    this._post("api/topics/"+topic_id+"/mark_read.json", callback);
};

Convore.prototype.Messages_star = function(message_id, callback){ 
    if(typeof message_id != 'number' || message_id <= 0) {
        ParameterRequired(ExceptionMessage.TopicId);
    }
    this._post("api/messages/"+message_id+"/star.json", callback);
};

Convore.prototype.Messages_delete = function(message_id, callback) { 
    if(typeof message_id != 'number' || message_id <= 0) {
        ParameterRequired(ExceptionMessage.TopicId);
    }
    this._post("api/messages/"+message_id+"/delete.json", callback);
};

/* Discovery APIs */

/* Live endpoint */
Convore.prototype._lastMessageId = null;

Convore.prototype.Live = function(callback, cursor) {
	var url = '/api/live.json';
	if(cursor && cursor.constructor == String){
		url+="?cursor="+cursor;
	}
        var self = this;

	this._get(url, function(body) {
                
		for (var id in body.messages) {
                    var message = body.messages[id];
                    if(callback && typeof callback == 'function') {
                        callback(message);
                    }
                    self._lastMessageId = message._id;
		}
                
                if(self._lastMessageId && self._lastMessageId) {
                    self.Live(callback, self._lastMessageId);
                } else {
                    self.Live(callback);
                }
        });
};


module.exports = Convore;
