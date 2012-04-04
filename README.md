# Länsförsäkringar  -- wrapper for Swedish bank Länsförsäkringar's JSON API

Länsförsäkringar has a JSON API used by their iphone app, and I assume its also used in their android as well. 
This is not publicly documented, instead @bjornsallarp has investigated parts of it and documented it on
[blog.sallarp.com](http://blog.sallarp.com/lansforsakringar-api.html#transfer)

This Module wraps part of that API.

## Example

```javascript

require('länsförsäkringar').login('0000000000','0000',function(lf) {
    console.log("Logged in");
    //list accounts
    lf.accounts(console.log);
    
    //account details
    lf.account("12345678910",console.log);
        
    //list all transactions of a account
    lf.listAll("12345678910",console.log,function(error){ console.log('Error:'+error) });
        
});


```


 
