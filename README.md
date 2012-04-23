# Länsförsäkringar  -- wrapper for Swedish bank Länsförsäkringar's JSON API

Länsförsäkringar has a JSON API used by their iphone app, and I assume its also used in their android as well. 
This is not publicly documented, instead @bjornsallarp has investigated parts of it and documented it on
[blog.sallarp.com](http://blog.sallarp.com/lansforsakringar-api.html#transfer)

This Module wraps part of that API.

## Example

```javascript

require('länsförsäkringar').login('0000000000','0000',function(lf){
    console.log("Logged in");
    
    //list accounts
    lf.accounts('CHECKING',function(accounts){
        accounts.forEach(function(a){        
            //get account details
            lf.account(a.accountNumber,console.log);
            
            //list all transactions
            lf.listAll(a.accountNumber,console.log);
        });
    });
});


```


 
