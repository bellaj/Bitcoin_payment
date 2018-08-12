'use strict';	
 var bitcore_lib = require('bitcore-lib');	
var PaymentProtocol = require('bitcore-payment-protocol');	
var express = require('express');	
var bodyParser = require('body-parser');	
var URI = require('bitcore-lib/lib/uri');	
var request=require("request");	
const https = require('https');	
var fs=require("fs");	
 /************************************************/	
 var dcert= fs.readFileSync('./key_final/cert.der');	
var mcert= fs.readFileSync('./key_final/cert.pem');	
var mkey= fs.readFileSync('./key_final/key.pem');	
 /******************************/	
var credentials = {key: mkey, cert: mcert};	
var app = express();	
 bitcore_lib.Networks.defaultNetwork = bitcore_lib.Networks.testnet;	
var privateKey =bitcore_lib.PrivateKey();	
var publicKey = bitcore_lib.PublicKey(privateKey);	
var M_address = bitcore_lib.Address(publicKey, bitcore_lib.Networks.defaultNetwork );	
console.log(M_address);	
//////////////////////IP//////////////////////////////////// 	
var os = require('os');	
 var interfaces = os.networkInterfaces();	
var addresses = [];	
for (var k in interfaces) {	
    for (var k2 in interfaces[k]) {	
        var address = interfaces[k][k2];	
        if (address.family === 'IPv4' && !address.internal) {	
            addresses.push(address.address);	
        }	
    }	
}	
 var IP=addresses[0];	
var port=8443;	
var http_port=3000;	
 /*****************URI composition***************************/	
 function compose_uri(amount){	
var pay_url = "http://"+IP+":"+http_port+"/request";	
var uriString = new URI({	
  address: M_address,	
  amount : amount, // in satoshis	
  message: 'payment request'	
});	
//var valid = URI.isValid(uriString);	
var paymentUri = uriString+"&r="+pay_url;	
return paymentUri;	
}	
/************************************************************/	
 app.get("/", function(req, res){	
  res.send('Bitcoin Payment protocol');	
});	
 /************first action************************/	
var path    = require("path");	
app.use(express.static(path.join(__dirname + '/views')));//middleware	
console.log(__dirname + '/views');	
 app.get('/checkout',function(req,res){	
       	
   res.sendFile(path.join(__dirname+'/views/index.html'));	
 });	
 /********want to pay **********/	
 app.use(bodyParser.json());	
 app.post("/want_pay", function(req, res){	
var amount_=req.body.amount; 	
var resp=compose_uri(amount_)+"?amount="+amount_;	
res.send(resp);	
});	
  app.use(bodyParser.json());   	
 var urlencodedParser = bodyParser.urlencoded({ extended: false });	
  app.get("/request", urlencodedParser, function(req, res){	
 var isbrowser=0;	
  var Script = bitcore_lib.Script;	
 var amount = req.query.amount;	
if(req.query.browser)	
 isbrowser=1;  	
 if(amount==undefined) amount=0;	
 var script = Script.buildPublicKeyHashOut(M_address.toString());	
 	
//**************prepare output to request payment ***********//	
// define the refund outputs	
  var merchant_outputs = []; // Where payment should be sent	
  var outputs = new PaymentProtocol().makeOutput();	
  outputs.set('amount', amount);	
  outputs.set('script', script.toBuffer());	
  merchant_outputs.push(outputs.message);	
 /***************************make payment detail* PaymentRequest message, which contains meta-information about the merchant and a digital signature. *************/	
  var details = new PaymentProtocol().makePaymentDetails();	
  var now = Date.now() / 1000 | 0;	
  details.set('network', 'testnet');	
  details.set('outputs', merchant_outputs);	
  details.set('time', now);	
  details.set('expires', now + 60 * 60 * 24);	
  details.set('memo', 'A payment request from the merchant.');	
  details.set('payment_url', "http://"+IP+":"+http_port+"/payment?id=12345");	
  details.set('merchant_data', new Buffer("Transaction N 12345")); // identify the request	
/************** form the request + sign it ***************/	
  var request = new PaymentProtocol().makePaymentRequest();	
  request.set('payment_details_version', 1);	
  var certificates = new PaymentProtocol().makeX509Certificates();	
  certificates.set('certificate',dcert);	
  request.set('pki_type', 'x509+sha256');	
  request.set('pki_data', certificates.serialize());	
  request.set('serialized_payment_details', details.serialize());	
  request.sign(mkey);	
  var rawbody = request.serialize();	
 /*****************ADDED********************/	
  res.set({	
    'Content-Type': PaymentProtocol.PAYMENT_REQUEST_CONTENT_TYPE,	
    'Content-Length': request.length,	
    'Content-Transfer-Encoding': 'binary'	
  });	
/******************For Browser************************************/	
 if(isbrowser==1){	
 var buf = new Buffer(rawbody, 'binary').toString('base64');	
 res.contentType(PaymentProtocol.PAYMENT_REQUEST_CONTENT_TYPE);	
 res.send(buf);	
}	
/********************for bitcoin client**************************************/	
else 	
res.status(200).send(rawbody); 	
 	
});	
 /*****************Receive a payment  *********/	
  var rawBodyParser = bodyParser.raw({type: PaymentProtocol.PAYMENT_CONTENT_TYPE});	
  app.post("/payment", rawBodyParser, function(req, res){	
 	
/************in case sender create payment using bitcore****/	
  var body = PaymentProtocol.Payment.decode(req.body);	
  var payment = new PaymentProtocol().makePayment(body);	
  var transaction = payment.get('transactions');	
  var refund_to = payment.get('refund_to'); //output where a refund should be sent. 	
  console.log((new Buffer(transaction,'hex')).toString());	
  var memo = payment.get('memo');	
//extract and brodcast tx to network	
/***********************send back ACK*****************************/	
  var ack = new PaymentProtocol().makePaymentACK();	
  ack.set('payment', payment.message);	
  ack.set('memo', 'Payment processed,Thank you !invoice number is :'+req.query.id);	
  var rawack = ack.serialize();	
  res.set({	
  'Content-Type': PaymentProtocol.PAYMENT_ACK_CONTENT_TYPE,	
  'Content-Length': rawack.length,	
  });	
  res.send(rawack);	
 });	
 app.get("/invoice", urlencodedParser, function(req, res){	
 	
 var invoice_id = req.query.id;	
 var detail="details about the invoice N:"+invoice_id; //from database  	
 res.send(detail);	
});	
 app.listen(http_port, function(){	
  console.log("http Server listening on :"+IP+" port"+ http_port);	
  console.log("https Server listening on :"+IP+" port"+ port);	
});	
 https.createServer(credentials, app).listen(port);
