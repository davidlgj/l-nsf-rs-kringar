//    Copyright: David Jensen 2012 <david.lgj@gmail.com>

//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.

//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.

//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.
    
    
//API described by Björn Sållarp
//http://blog.sallarp.com/lansforsakringar-api.html

var _ = require('underscore');
var request = require('request');

var url_client       = 'https://mobil.lansforsakringar.se/appoutlet/security/client';
var url_user         = 'https://mobil.lansforsakringar.se/appoutlet/security/user';
var url_transactions = 'https://mobil.lansforsakringar.se/appoutlet/account/transaction';
var url_bytype       = 'https://mobil.lansforsakringar.se/appoutlet/account/bytype';
var url_bynumber     = 'https://mobil.lansforsakringar.se/appoutlet/account/bynumber';

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
            //console.log(body)
            if (_.isString(body)) {
                fn(JSON.parse(body));
            } else {
                fn(body);
            }
        } else {
            //console.log("Error!")
            //console.log(body)
            //console.log(error)
            //console.log(response.statusCode)
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
    var obj = {
                    url: url_transactions,
                    headers: { 'ctoken': ctoken, 'utoken': utoken, 'DeviceId': 'f8280cf34708c7b5a8bd2ed93dcd3c8148d00000'},
                    json: {"requestedPage":page,"ledger":"DEPIOSIT","accountNumber":account}
                 };
                 //console.log(obj)
    request.post(obj,
                 handleReq(function(val){ callback(val); },error)
   );
}  



function listAll(ctoken,utoken,account,callback,error) {
    var transactions = [];
    //first page
    var recurse = function(ctoken,utoken,account,page,callback,error) {
        list(ctoken,utoken,account,page,function(val){
            transactions.push(val.transactions);
            if (val.hasMore) {
               recurse(ctoken,utoken,account,val.nextSequenceNumber,callback,error);
            } else {
               callback(_(transactions).flatten(true));
            }
        },error);
    }
    
    //start it off
    recurse(ctoken,utoken,account,0,callback,error);
}



function accounts(ctoken,utoken,callback,error) {

    request.post({
                    url: url_bytype,
                    headers: { ctoken: ctoken, utoken: utoken,"DeviceId": "f8280cf34708c7b5a8bd2ed93dcd3c8148d00000"},
                    json: {"accountType":"CHECKING"}
                  },
                  handleReq(function(val){
                    if (val.accounts) {
                        callback(val.accounts);
                    } else {
                        callback(val);
                    }
                  },error)); 
}

function account(ctoken,utoken,account_nr,callback,error) {

    request.post({
                    url: url_bynumber,
                    headers: { ctoken: ctoken, utoken: utoken,"DeviceId": "f8280cf34708c7b5a8bd2ed93dcd3c8148d00000"},
                    json: { "accountNumber": account_nr }
                  },
                  handleReq(function(val){
                    callback(val);
                  },error)); 
}



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
                            utoken:   utoken,
                            ctoken:   ctoken,
                            account:  function (account_nr,callback,error) { account(ctoken,utoken,account_nr,callback,error); },
                            accounts: function (callback,error) { accounts(ctoken,utoken,callback,error); },
                            list:     function (account_nr,page,callback,error) { list(ctoken,utoken,account_nr,page,callback,error); },
                            listAll:  function (account_nr,callback,error) { listAll(ctoken,utoken,account_nr,callback,error); }
                            
                            
                        });                        
                    },error));
                },error)
         );
    }));    
        
}
