//API described by Björn Sållarp
//http://blog.sallarp.com/lansforsakringar-api.html
var _ = require('underscore');
var request = require('request');

var url_client       = 'https://mobil.lansforsakringar.se/appoutlet/security/client';
var url_user         = 'https://mobil.lansforsakringar.se/appoutlet/security/user';
var url_transactions = 'https://mobil.lansforsakringar.se/appoutlet/account/transaction';

//Calculate hash is taken from http://blog.sallarp.com/lansforsakringar-api.html
function calculateLFHash(challenge) {
	// Add the magic number 4112
	challenge += 4112;
				
	// Convert to hex representation string. Must be lower case!
	var challengeHexString = challenge.toString(16).toLowerCase();
				
	// Hash and we're done!
	var shasum = require('crypto').createHash('sha1');
	shasum.update(challengeHexString);
    return shasum.digest('hex');    				
}


//common logging and error handling
function handleReq(fn,err) {

    return function (error,response, body) {
        if (!error && response.statusCode == 200) {
            if (_.isString(body)) {
                fn(JSON.parse(body));
            } else {
                fn(body);
            }
        } else {
            if (err) {
                err(error,response,body);
            } 
        }
    }
}

  
  
  
function list(ctoken,utoken,account,page,callback,error) {
    //argument parsing, default page to 0
    if (!callback) {
        callback = page;
        page = 0;        
    }

    request.post({
                    url: url_transactions,
                    headers: { 'ctoken': ctoken, 'utoken': utoken, 'DeviceId': 'f8280cf34708c7b5a8bd2ed93dcd3c8148d00000'},
                    json: {"requestedPage":page,"ledger":"DEPIOSIT","accountNumber":account}
                 },
                 handleReq(function(val){ callback(val); },error)
   });
}  



function listAll(ctoken,utoken,account,page,callback,error) {
    var transactions = [];
    //first page
    var recurse = function ctoken,utoken,account,page,callback,error) {
        list(ctoken,utoken,account,page,function(val){
            transactions.push(val.transactions);
            if (val.hasMore) {
               recurse(ctoken,utoken,account,val.nextSequenceNumber,callback,error);
            } else {
               callback(_(transactions).flatten(true));
            }
        },error);
    }
}



//TODO: accounts function



exports.login = function(ssn,pin,callback,error) {
    request.get(url_client, handleReq(function(val){ 
        
        //get token
        request.post({ 
                  url: url_client ,
                  json: {
		                    "originalChallenge": val.number,
		                    "hash": calculateLFHash(val.number),
		                    "challengePair":val.numberPair
		          }  
                },
                handleReq(function(val){
                    var ctoken = val.token;
                    //login
                    request.post({
                        url: url_user,
                        headers: { 'ctoken': ctoken, 'DeviceId': "f8280cf34708c7b5a8bd2ed93dcd3c8148d00000" },
                        json: { ssn: ssn, pin: pin }
                    },handleReq(function(val){
                        var utoken = val.ticket;
                        //we've logged in return the connection object                        
                        callback({
                            utoken: utoken,
                            ctoken: ctoken,
                            accounts: function (callback,error) { accounts(utoken,ctoken,error); },
                            list: function (account_nr,page,callback,error) { list(utoken,ctoken,account_nr,page,callback,error); },
                            listAll: function (account_nr,callback,error) { listAll(utoken,ctoken,account_nr,callback,error); }
                            
                        });                        
                    },error));
                },error)
         );
    }));    
        
}
