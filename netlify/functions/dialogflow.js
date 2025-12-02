const dialogflow=require('@google-cloud/dialogflow');
const uuid=require('uuid');

exports.handler=async(event)=>{
 try{
  const {text}=JSON.parse(event.body);
  const sessionClient=new dialogflow.SessionsClient({
    credentials:{
      private_key:process.env.DF_PRIVATE_KEY.replace(/\n/g,'\n'),
      client_email:process.env.DF_CLIENT_EMAIL
    }
  });
  const sessionPath=sessionClient.projectAgentSessionPath(process.env.REACT_APP_PROJECT_ID,uuid.v4());
  const req={session:sessionPath,queryInput:{text:{text,languageCode:'en'}}};
  const res=await sessionClient.detectIntent(req);
  return {statusCode:200,body:JSON.stringify({reply:res[0].queryResult.fulfillmentText})};
 }catch(e){
  return {statusCode:500,body:JSON.stringify({error:e.message})};
 }
};