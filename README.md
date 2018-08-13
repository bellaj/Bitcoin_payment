# Bitcoin_payment

## Instructions 


in root folder :
``npm install``

in view directory:
``bower install``

then in root folder : ``npm start``

## Potential issues: 

**issue 1**: More than one instance of bitcore-lib found. Please make sure to require bitcore-lib and check that submodules do not also include their own bitcore-lib dependency.


**Solution** : edit node_modules/bitcore-payment-protocol/node_modules/bitcore-lib/index.js

``bitcore.versionGuard = function(version) {
  /*if (version !== undefined) {
    var message = 'More than one instance of bitcore-lib found. ' + 
      'Please make sure to require bitcore-lib and check that submodules do' +
      ' not also include their own bitcore-lib dependency.';
    throw new Error(message);
  }*/
}``


**issue 2**: Cannot find module '../..' from '/home/user/deletme/Bitcoin_payment/node_modules/asn1.js-rfc5280'

**solution** : edit node_modules/asn1.js-rfc5280/index.js
Change: ``var asn1 = require('../..');`` to  ``var asn1 = require('../' + '..');``

**issue3** There is an issue with Firefox 
Error for ReferenceError: $ is not defined[Learn More]

Cause : Firefox doesn't trust the link provided for Jquery!!

if you have any additional problem, please consider to open an issue in this respository.

