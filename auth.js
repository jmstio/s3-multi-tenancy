/************
* This fiddle uses Amplify SDK Auth class to integrate with Cognito
* https://aws-amplify.github.io/amplify-js/api/classes/authclass.html
* https://docs.amplify.aws/lib/auth/getting-started/q/platform/js
*************/

// Initialize the Amazon Cognito credentials provider
// AWS.config.region = 'eu-west-1'; // Region
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//     IdentityPoolId: 'eu-west-1:62330284-aa63-453f-b4b4-a9c82465dc15',
// });

const Amplify = require('aws-amplify');

/************ Configure user pool and client*/
Amplify.Auth.configure({
  userPoolId: 'eu-west-1_DMHRiABjM',
  userPoolWebClientId: '6i4j64h3ekoc94khgookoh74v5',
  identityPoolId: 'us-west-2:b6277d0a-826e-411a-abce-b98040e43d79',
  region: 'us-west-2'
});
let cognitoUser;

/*****************configure Amplify for APIGW call*/
Amplify.API.configure({
  endpoints: [
    {
      name: "MyAPIGatewayAPI",
      endpoint: "https://t50zs7z6bf.execute-api.us-west-2.amazonaws.com"
    }
  ]
});

/************ sign up*/

async function signUpWithAmplify(){

    var email = $("#signup_email").val();
    var username = $("#signup_username").val();
    var password = $("#signup_password").val();
    var name = $("#signup_name").val();
    var phone_number = $("#signup_phone").val();
    
    const { user } = await Amplify.Auth.signUp({
      username,
      password,
      attributes: {
        email,          
        phone_number, 
        name
      }
    }).then((result) => {
    	console.log('result: ', result);
      Amplify.Auth.confirmSignUp(username, prompt("Please enter confirmation code:"));
    }).catch((error) => {
    	Message.show(error.message);
    });
}

/************ sign in*/
async function signInWithAmplify(username, password){

    console.log("Signing in, username: " +  username + " Password: " + password)
    // var username = $("#signin_username").val();
    // var password = $("#signin_password").val();

    try{
      cognitoUser = await Amplify.Auth.signIn(username, password);
      if (cognitoUser.challengeName === 'SMS_MFA' ||
              cognitoUser.challengeName === 'SOFTWARE_TOKEN_MFA') {

        const code =  prompt('Please input second factor code', '');
        cognitoUser = await Amplify.Auth.confirmSignIn(
          cognitoUser,   // Return object from Auth.signIn()
          code,   // Confirmation code  
          cognitoUser.challengeName // MFA Type e.g. SMS_MFA, SOFTWARE_TOKEN_MFA
        );
      }

      console.log(cognitoUser);
      var accessToken = cognitoUser.signInUserSession.accessToken.jwtToken;
      return accessToken;

    }catch(err){
    	console.error(err);
    }
}

/****************signOut**************/
async function signOut() {
  await Amplify.Auth.signOut();
  $("#idToken").html('');
  $("#accessToken").html('');
  $("#apiresponse").html('');
}

/******************************** enable MFA
* MAKE SUTE TOTP MFA IS ENABLED IN USER POOL
********************************************/
async function enableMFA(){
  try{
  	await Amplify.Auth.setupTOTP(cognitoUser).then(code => {
      
      var tokenObj = cognitoUser.signInUserSession.idToken.payload;
      var totpUri = "otpauth://totp/MFA:"+ tokenObj["cognito:username"] +"?secret="+ code +"&issuer=CognitoJSPOC";

      var qrcode = new QRCode(document.getElementById("qrcode"), {
        text: totpUri,
        width: 128,
        height: 128,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
      
      var totpCode = prompt("Enter software token code");
      
      Amplify.Auth.verifyTotpToken(cognitoUser, totpCode).then((data) => {

        Amplify.Auth.setPreferredMFA(cognitoUser, 'TOTP');
        
      })
    })
    
  }catch(err){console.error(err)}
}

/************ disable MFA*/
async function disableMFA(){
  await Amplify.Auth.setPreferredMFA(cognitoUser, 'NOMFA');
}

/************ call protected APIGW endpoint
*MAKE SURE APIGW COGNITO AUTHORIZER CONFIGURATION IS COMPLE
*MAKE SURE API ACCEPTS ID-TOKEN (NO OAUTH SCOPE DEFINED IN AUTHORIZATION)
*YOU CAN ONLY USE ID-TOKEN SINCE CUSTOM SCOPES ARE NOT SUPPORTED WHEN SDK IS USED
******************************************/
async function callAPIGW(){

  // set ID Token in "Authorization" header
  const headers = {
    headers: {
      'Content-Type': 'application/json', 
      Authorization: cognitoUser.signInUserSession.idToken.jwtToken,
    }
  };

  response = await Amplify.API.get('MyAPIGatewayAPI', '/prod/pets', headers);
  $("#apiresponse").html('<b>Response</b><br>'+JSON.stringify(response,null, 2));

}

/************ list files in S3 bucket
*PREREQUISITES
*1. IDENTITY POOL CREATED AND CONFIGURED TO USE USER POOL AS IDP
*2. PERMISSIONS DEFINED ON THE IAM ROLE TO ALLOW S3 LIST
*3. BUCKET CREATED WITH PROPER X-ORIGIN POLICY TO ALLOW CALLS
*/
async function listFiles(){

	$("#s3files").html('');
  
  await Amplify.Auth.currentCredentials().then(credentials => {
    const s3 = new AWS.S3({
      credentials: Amplify.Auth.essentialCredentials(credentials)
    });

    var params = {
    	Bucket: $("#bucket_name").val(),
      Prefix: $("#prefix").val()
     };
    s3.listObjects(params, function(err, data) {
      if (err) console.log(err); // an error occurred
      else{
        $("#s3files").html('<b>Response</b><br>'+JSON.stringify(data.Contents,['Key'], 2)); // successful response
      }
    });
  });
}


function parseJwt (token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace('-', '+').replace('_', '/');
  return JSON.parse(window.atob(base64));
};


module.exports = { signInWithAmplify, signUpWithAmplify, signOut, enableMFA, openTab, parseJwt, listFiles}