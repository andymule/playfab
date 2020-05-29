var GAMES_LIST_SUFFIX = '_GamesList';

function getGamesListId(playerId) {
    'use strict';
    return String(playerId) + GAMES_LIST_SUFFIX;
}

// http://stackoverflow.com/a/21273362/1449056
function undefinedOrNull(variable) {	'use strict'; return variable === undefined || variable === null; } //return variable == null;

// checks to see if an object has any properties
// Returns true for empty objects and false for non-empty objects
function isEmpty(obj) {
    'use strict';
	// Object.getOwnPropertyNames(obj).length vs. Object.keys(obj).length 
	// http://stackoverflow.com/a/22658584/1449056
	return (undefinedOrNull(obj) || Object.getOwnPropertyNames(obj).length === 0);
}

function createSharedGroup(id) {
    'use strict';
	try {
		server.CreateSharedGroup({SharedGroupId : id});
	} catch (e) { throw e; }
}

function isString(obj) {
    'use strict';
    return (typeof obj === 'string' || obj instanceof String);
}

function updateSharedGroupData(id, data) {
    'use strict';
    var key;
	try {
        for (key in data) {
			if (data.hasOwnProperty(key) && !undefinedOrNull(data[key]) && !isString(data[key])) {
                data[key] = JSON.stringify(data[key]);
            }
        }
		server.UpdateSharedGroupData({ SharedGroupId: id, Data: data });
	} catch (e) { throw e; }
}

function getSharedGroupData(id, keys) {
    'use strict';
	try {
        var data = {}, key;
		if (undefinedOrNull(keys)) {
			data = server.GetSharedGroupData({ SharedGroupId: id }).Data;
		} else {
			data = server.GetSharedGroupData({ SharedGroupId: id, Keys: keys }).Data;
		}
        for (key in data) {
			if (data.hasOwnProperty(key)) {
                data[key] = JSON.parse(data[key].Value); // 'LastUpdated' and 'Permission' properties are overwritten
            }
        }
        return data;
	} catch (e) { throw e; }
}

function deleteSharedGroup(id) {
    'use strict';
    try {
        server.DeleteSharedGroup({SharedGroupId : id});
    } catch (e) { throw e; }
}

function getSharedGroupEntry(id, key) {
    'use strict';
    try {
        return getSharedGroupData(id, [key]);
    } catch (e) { throw e; }
}

function updateSharedGroupEntry(id, key, value) {
    'use strict';
    try {
        var data = {};
        data[key] = value;
        updateSharedGroupData(id, data);
    } catch (e) { throw e; }
}

function deleteSharedGroupEntry(id, key) {
    'use strict';
    try {
        updateSharedGroupEntry(id, key, null);
    } catch (e) { throw e; }
}

function getISOTimestamp() {
    'use strict';
    try {
        return (new Date()).toISOString();
    } catch (e) { throw e; }
}

function logException(timestamp, data, message) {
    'use strict';
    //TEMPORARY solution until log functions' output is available from GameManager
    server.SetTitleData({
        Key: timestamp + Math.random(),
        Value: JSON.stringify({Message: message, Data: data})
    });
}

function PhotonException(code, msg, timestamp, data) {
    'use strict';
	this.ResultCode = code;
	this.Message = msg;
    this.Timestamp = timestamp;
    this.Data = data;
    logException(timestamp, data, msg);
    //this.Stack = (new Error()).stack;
}

PhotonException.prototype = Object.create(Error.prototype);
PhotonException.prototype.constructor = PhotonException;

var LeaveReason = { ClientDisconnect: '0', ClientTimeoutDisconnect: '1', ManagedDisconnect: '2', ServerDisconnect: '3', TimeoutDisconnect: '4', ConnectTimeout: '5',
                    SwitchRoom: '100', LeaveRequest: '101', PlayerTtlTimedOut: '102', PeerLastTouchTimedout: '103', PluginRequest: '104', PluginFailedJoin: '105' };

function checkWebhookArgs(args, timestamp) {
    'use strict';
	var msg = 'Missing argument: ';
	if (undefinedOrNull(args.AppId)) {
		throw new PhotonException(1, msg + 'AppId', timestamp, args);
	}
	if (undefinedOrNull(args.AppVersion)) {
		throw new PhotonException(1, msg + 'AppVersion', timestamp, args);
	}
	if (undefinedOrNull(args.Region)) {
		throw new PhotonException(1, msg + 'Region', timestamp, args);
	}
	if (undefinedOrNull(args.GameId)) {
		throw new PhotonException(1, msg + 'GameId', timestamp, args);
	}
	if (undefinedOrNull(args.Type)) {
		throw new PhotonException(1, msg + 'Type', timestamp, args);
	}
	if (args.Type !== 'Close' && args.Type !== 'Save') {
		if (undefinedOrNull(args.ActorNr)) {
			throw new PhotonException(1, msg + 'ActorNr', timestamp, args);
		}
		if (undefinedOrNull(args.UserId)) {
			throw new PhotonException(1, msg + 'UserId', timestamp, args);
		}
        if (args.UserId !== currentPlayerId) {
            throw new PhotonException(3, 'currentPlayerId=' + currentPlayerId + ' does not match UserId', timestamp, args);
        }
		if (undefinedOrNull(args.Username) && undefinedOrNull(args.Nickname)) {
			throw new PhotonException(1, msg + 'Username/Nickname', timestamp, args);
		}
	} else {
		if (undefinedOrNull(args.ActorCount)) {
            throw new PhotonException(1, msg + 'ActorCount', timestamp, args);
		}
        if (!undefinedOrNull(args.State2) && !undefinedOrNull(args.State2.ActorList)) {
            if (args.State2.ActorList.length !== args.ActorCount) {
                throw new PhotonException(2, 'ActorCount does not match ActorList.count', timestamp, args);
            }
        }
	}
	switch (args.Type) {
    case 'Load':
        if (undefinedOrNull(args.CreateIfNotExists)) {
            throw new PhotonException(1, msg + 'CreateIfNotExists', timestamp, args);
        }
        break;
    case 'Create':
        if (undefinedOrNull(args.CreateOptions)) {
            throw new PhotonException(1, msg + 'CreateOptions', timestamp, args);
        }
        if (args.ActorNr !== 1) {
            throw new PhotonException(2, 'ActorNr != 1 and Type == Create', timestamp, args);
        }
        break;
    case 'Join':
        break;
    case 'Player':
        if (undefinedOrNull(args.TargetActor)) {
            throw new PhotonException(1, msg + 'TargetActor', timestamp, args);
        }
        if (undefinedOrNull(args.Properties)) {
            throw new PhotonException(1, msg + 'Properties', timestamp, args);
        }
        if (!undefinedOrNull(args.Username) && undefinedOrNull(args.State)) {
            throw new PhotonException(1, msg + 'State', timestamp, args);
        }
        break;
    case 'Game':
        if (undefinedOrNull(args.Properties)) {
            throw new PhotonException(1, msg + 'Properties', timestamp, args);
        }
        if (!undefinedOrNull(args.Username) && undefinedOrNull(args.State)) {
            throw new PhotonException(1, msg + 'State', timestamp, args);
        }
        break;
    case 'Event':
        if (undefinedOrNull(args.Data)) {
            throw new PhotonException(1, msg + 'Data', timestamp, args);
        }
        if (!undefinedOrNull(args.Username) && undefinedOrNull(args.State)) {
            throw new PhotonException(1, msg + 'State', timestamp, args);
        }
        break;
    case 'Save':
        if (undefinedOrNull(args.State)) {
            throw new PhotonException(1, msg + 'State', timestamp, args);
        }
        if (args.ActorCount <= 0) {
            throw new PhotonException(2, 'ActorCount <= 0 and Type == Save', timestamp, args);
        }
        break;
    case 'Close':
        if (args.ActorCount !== 0) {
            throw new PhotonException(2, 'ActorCount != 0 and Type == Close', timestamp, args);
        }
        break;
    case 'Leave':
        throw new PhotonException(2, 'Deprecated forward plugin webhook!', timestamp, args);
    default:
        if (LeaveReason.hasOwnProperty(args.Type)) {
            if (undefinedOrNull(args.IsInactive)) {
                throw new PhotonException(1, msg + 'IsInactive', timestamp, args);
            }
            if (undefinedOrNull(args.Reason)) {
                throw new PhotonException(1, msg + 'Reason', timestamp, args);
            }
            if (LeaveReason[args.Type] !== args.Reason) { // For some reason Type string does not match Reason code
                throw new PhotonException(2, 'Reason code does not match Leave Type string', timestamp, args);
            }
            if (['1', '100', '103', '105'].indexOf(args.Reason) > -1) { // Unexpected leave reasons
                throw new PhotonException(2, 'Unexpected LeaveReason', timestamp, args);
            }
        } else {
            throw new PhotonException(2, 'Unexpected Type:' + args.Type);
        }
        break;
	}
}

function onGameCreated(args, timestamp) {
    server.WriteTitleEvent({
        EventName : "on_game_created",
        Body : args
    });
    'use strict';
    var data = {};
    server.WriteTitleEvent({EventName : "1.1"});
    createSharedGroup(args.GameId);
    server.WriteTitleEvent({EventName : "1"});
    data.Env = {Region: args.Region, AppVersion: args.AppVersion, AppId: args.AppId, TitleId: script.titleId,
                CloudScriptVersion: script.version, CloudScriptRevision: script.revision, PlayFabServerVersion: server.version,
               WebhooksVersion: undefinedOrNull(args.Nickname) ? '1.0' : '1.2'};
    server.WriteTitleEvent({EventName : "2"});
    data.RoomOptions = args.CreateOptions;
    data.Creation = {Timestamp: timestamp, UserId: args.UserId, Type: args.Type};
    data.Actors = {1: {UserId: args.UserId, Inactive: false}};
    data.NextActorNr = 2;
    server.WriteTitleEvent({EventName : "3"});
    updateSharedGroupData(args.GameId, data);
    server.WriteTitleEvent({EventName : "4"});
    updateSharedGroupEntry(getGamesListId(currentPlayerId), args.GameId, data);
}

handlers.RoomCreated = function (args) {
    server.WriteTitleEvent({
        EventName : "room_created",
        Body : args
    });
    // return { ResultCode : 0, Message: 'Success' };
    
    // obv dont do after this stuff yet cuz idk wats up
    'use strict';
    try {
        var timestamp = getISOTimestamp(),
            data = {};
        checkWebhookArgs(args, timestamp);
        if (args.Type === 'Create') {
            onGameCreated(args, timestamp);
            return {ResultCode: 0, Message: 'OK'};
        } else if (args.Type === 'Load') {
            server.WriteTitleEvent({
                EventName : "LOADED"
            });
            data = getSharedGroupEntry(getGamesListId(currentPlayerId), args.GameId);
            if (data.Creation.UserId !== currentPlayerId) {
                data = getSharedGroupEntry(getGamesListId(data.Creation.UserId), args.GameId);
            }
            if (undefinedOrNull(data.State)) {
                if (args.CreateIfNotExists === false) {
                    throw new PhotonException(5, 'Room=' + args.GameId + ' not found', timestamp, args);
                } else {
                    onGameCreated(args, timestamp);
                    return {ResultCode: 0, Message: 'Success', State: ''}; // TBD: test if State property is required or what can be returned
                }
            }
            if (undefinedOrNull(data.LoadEvents)) {
                data.LoadEvents = {};
            }
            data.LoadEvents[timestamp] = {ActorNr: args.ActorNr, UserId: args.UserId};
            createSharedGroup(args.GameId);
            updateSharedGroupData(args.GameId, data);
            return {ResultCode: 0, Message: 'OK', State: data.State};
        } else {
            server.WriteTitleEvent({
                EventName : "photon PhotonException thrown 11"
            });
            throw new PhotonException(2, 'Wrong PathCreate Type=' + args.Type, timestamp, {Webhook: args});
        }
    } catch (e) {
        if (e instanceof PhotonException) {
            return {ResultCode: e.ResultCode, Message: e.Message};
        }
        return {ResultCode: 255, Message: e.name + ': ' + e.message};
    }
};

handlers.RoomJoined = function (args) {
    server.WriteTitleEvent({
        EventName : "room_joined",
        Body : args
    });
    return { ResultCode : 0, Message: 'Success' };
};

handlers.RoomLeft = function (args) {
    server.WriteTitleEvent({
        EventName : "room_left",
        Body : args
    });
    return { ResultCode : 0, Message: 'Success' };
};

handlers.RoomClosed = function (args) {
    server.WriteTitleEvent({
        EventName : "room_closed",
        Body : args
    });
    return { ResultCode : 0, Message: 'Success' };
};

handlers.RoomPropertyUpdated = function (args) {
    server.WriteTitleEvent({
        EventName : "room_property_changed",
        Body : args
    });
    return { ResultCode : 0, Message: 'Success' };
};

handlers.RoomEventRaised = function (args) {
    server.WriteTitleEvent({
        EventName : "room_event_raised",
        Body : args
    });
    return { ResultCode : 0, Message: 'Success' };
};