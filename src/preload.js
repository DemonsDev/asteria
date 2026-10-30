const { contextBridge, ipcRenderer } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://hugjwphcsscnuuhcvkfy.supabase.co','sb_publishable_xvzqSzoVd-PvDttbqlEEPQ_ch0TR74e',{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
function publicUser(user){if(!user)return null;return{id:user.id,email:user.email,username:user.user_metadata?.username||user.email?.split('@')[0]||'Joueur'};}
contextBridge.exposeInMainWorld('asteriaAuth',{
  signUp:async({email,password,username})=>{try{const{data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:'asteria://auth/callback',data:{username}}});return{ok:!error,error:error?.message||null,user:publicUser(data?.user),needsConfirmation:!data?.session};}catch(error){return{ok:false,error:error?.message||String(error)};}},
  signIn:async({email,password})=>{try{const{data,error}=await supabase.auth.signInWithPassword({email,password});return{ok:!error,error:error?.message||null,user:publicUser(data?.user)};}catch(error){return{ok:false,error:error?.message||String(error)};}},
  getSession:async()=>{const{data,error}=await supabase.auth.getSession();return{ok:!error,user:publicUser(data?.session?.user)};},
  signOut:async()=>{const{error}=await supabase.auth.signOut();return{ok:!error,error:error?.message||null};},
  onAuthLink:callback=>{const listener=async(_event,url)=>{try{const parsed=new URL(url);const code=parsed.searchParams.get('code');const description=parsed.searchParams.get('error_description');if(description){callback({ok:false,error:description});return;}if(!code){callback({ok:false,error:'Le lien reçu ne contient pas de code de confirmation.'});return;}const{data,error}=await supabase.auth.exchangeCodeForSession(code);callback({ok:!error,error:error?.message||null,user:publicUser(data?.user)});}catch(error){callback({ok:false,error:error.message||'Impossible de traiter le lien.'});}};ipcRenderer.on('auth-link',listener);return()=>ipcRenderer.removeListener('auth-link',listener);}
});


contextBridge.exposeInMainWorld('asteriaLauncher', {
  launchDevClient: () => ipcRenderer.invoke('launcher:launch-dev-client'),
  getClientState: () => ipcRenderer.invoke('launcher:get-client-state'),
  checkUpdates: () => ipcRenderer.invoke('launcher:check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('launcher:download-update'),
  installUpdate: () => ipcRenderer.invoke('launcher:install-update'),
  onUpdateState: callback => { const listener = (_event, state) => callback(state); ipcRenderer.on('launcher:update-state', listener); return () => ipcRenderer.removeListener('launcher:update-state', listener); },
  onDevClientExit: callback => { const listener = () => callback(); ipcRenderer.on('dev-client-exit', listener); return () => ipcRenderer.removeListener('dev-client-exit', listener); }
});
