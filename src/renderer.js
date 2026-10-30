const authScreen=document.querySelector('#authScreen');const launcherApp=document.querySelector('#launcherApp');
function showLauncher(user){authScreen.classList.add('hidden');launcherApp.classList.remove('hidden');const label=document.querySelector('.player-info strong');if(user?.username)label.textContent=user.username;}
function showLoginMessage(text){document.querySelector('#loginMessage').textContent=text;}
function showRegisterMessage(text){document.querySelector('#registerMessage').textContent=text;}
document.querySelector('#previewButton').addEventListener('click',()=>showLauncher({username:'Aperçu'}));
document.querySelector('#showRegister').addEventListener('click',()=>{document.querySelector('#loginPanel').classList.add('hidden');document.querySelector('#registerPanel').classList.remove('hidden');});
document.querySelector('#showLogin').addEventListener('click',()=>{document.querySelector('#registerPanel').classList.add('hidden');document.querySelector('#loginPanel').classList.remove('hidden');});
document.querySelector('#forgotButton').addEventListener('click',()=>showLoginMessage('La récupération du mot de passe sera ajoutée ensuite.'));
document.querySelector('#loginForm').addEventListener('submit',async event=>{event.preventDefault();showLoginMessage('Connexion en cours…');const fields=event.currentTarget.elements;try{const result=await window.asteriaAuth.signIn({email:fields[0].value.trim(),password:fields[1].value});if(!result.ok){showLoginMessage(result.error||'Connexion impossible.');return;}showLauncher(result.user);}catch(error){showLoginMessage(error?.message||String(error)||'Erreur inattendue pendant la connexion.');}});
document.querySelector('#registerForm').addEventListener('submit',async event=>{event.preventDefault();const fields=event.currentTarget.elements;const email=fields[0].value.trim();const username=fields[1].value.trim();const password=fields[2].value;if(password!==fields[3].value){showRegisterMessage('Les deux mots de passe ne correspondent pas.');return;}if(!fields[4].checked){showRegisterMessage('Confirme la création de ton compte pour continuer.');return;}showRegisterMessage('Création du compte…');try{const result=await window.asteriaAuth.signUp({email,password,username});if(!result.ok){showRegisterMessage(result.error||'Création impossible.');return;}if(result.needsConfirmation){showRegisterMessage('Compte créé ! Ouvre le mail de confirmation. Le lien ouvrira Asteria.');}else{showLauncher(result.user);}}catch(error){showRegisterMessage(error?.message||String(error)||'Erreur inattendue pendant la création.');}});
window.asteriaAuth.onAuthLink(result=>{if(result.ok){showLauncher(result.user);}else{document.querySelector('#loginPanel').classList.remove('hidden');document.querySelector('#registerPanel').classList.add('hidden');showLoginMessage(result.error||'Le lien de confirmation a expiré ou est invalide.');}});
window.asteriaAuth.getSession().then(result=>{if(result.ok&&result.user)showLauncher(result.user);}).catch(()=>{});
const status=document.querySelector('#status');
const updateButton=document.querySelector('#updateButton');
const updateStatus=document.querySelector('#updateStatus');
let updateState='idle';
function renderUpdateState(info){
  updateState=info.state;
  updateButton.disabled=['checking','downloading'].includes(info.state);
  if(info.state==='checking'){updateButton.textContent='VÉRIFICATION…';updateStatus.textContent='Recherche d’une nouvelle version';}
  else if(info.state==='available'){updateButton.textContent=`TÉLÉCHARGER ${info.version||''}`.trim();updateStatus.textContent='Une mise à jour est disponible';}
  else if(info.state==='downloading'){updateButton.textContent=`TÉLÉCHARGEMENT ${info.percent||0}%`;updateStatus.textContent='Le launcher télécharge la mise à jour';}
  else if(info.state==='downloaded'){updateButton.textContent='REDÉMARRER POUR METTRE À JOUR';updateStatus.textContent=`Version ${info.version||''} prête à installer`;}
  else if(info.state==='current'){updateButton.textContent='À JOUR · REVÉRIFIER';updateStatus.textContent=`Version ${info.version||''} · aucune mise à jour disponible`;}
  else if(info.state==='development'){updateButton.textContent='MISES À JOUR';updateStatus.textContent=info.message||'Disponible dans la version installée';}
  else if(info.state==='error'){updateButton.textContent='RÉESSAYER';updateStatus.textContent=info.message||'Vérification impossible';}
  else{updateButton.textContent='VÉRIFIER LES MISES À JOUR';updateStatus.textContent='';}
}
window.asteriaLauncher.onUpdateState(renderUpdateState);
updateButton.addEventListener('click',async()=>{
  if(updateState==='available'){
    updateButton.disabled=true;
    const result=await window.asteriaLauncher.downloadUpdate();
    if(!result.ok)renderUpdateState({state:'error',message:result.message});
  }else if(updateState==='downloaded'){
    updateButton.disabled=true;
    await window.asteriaLauncher.installUpdate();
  }else{
    updateButton.disabled=true;
    const result=await window.asteriaLauncher.checkUpdates();
    if(!result.ok)renderUpdateState({state:result.state||'error',message:result.message});
  }
});
const playButton=document.querySelector('#playButton');
const playButtonLabel=playButton.innerHTML;
function setGameButtonState(running,launching=false){playButton.disabled=running||launching;playButton.innerHTML=launching?'<span>…</span> LANCEMENT… <b></b>':running?'<span>●</span> LANCÉ <b>✓</b>':playButtonLabel;}
window.asteriaLauncher.getClientState().then(state=>{if(state.running){setGameButtonState(true);status.textContent='Minecraft est déjà lancé.';}}).catch(()=>{});
playButton.addEventListener('click',async()=>{setGameButtonState(false,true);status.textContent='Préparation du client NeoForge 26.3…';try{const result=await window.asteriaLauncher.launchDevClient();status.textContent=result.message;if(result.ok)setGameButtonState(true);else setGameButtonState(false);}catch(error){status.textContent='Impossible de démarrer le client de test.';setGameButtonState(false);}});
window.asteriaLauncher.onDevClientExit(()=>{status.textContent='Minecraft est fermé. Tu peux le relancer.';setGameButtonState(false);});
const modal=document.querySelector('#settingsModal');function openSettings(){modal.classList.remove('hidden');}function closeSettings(){modal.classList.add('hidden');}
document.querySelector('#settingsButton').addEventListener('click',openSettings);document.querySelector('#settingsShortcut').addEventListener('click',openSettings);document.querySelector('#closeSettings').addEventListener('click',closeSettings);document.querySelector('#closeBackdrop').addEventListener('click',closeSettings);
const themeToggle=document.querySelector('#themeToggle');const themeKey='asteria-theme-v2';function setTheme(light){document.body.classList.toggle('light',light);themeToggle.classList.toggle('on',light);themeToggle.setAttribute('aria-pressed',String(light));localStorage.setItem(themeKey,light?'light':'dark');}setTheme(localStorage.getItem(themeKey)==='light');themeToggle.addEventListener('click',()=>setTheme(!document.body.classList.contains('light')));
const views={home:document.querySelector('#homeView'),play:document.querySelector('#civilizationsView'),shop:document.querySelector('#shopView'),news:document.querySelector('#newsView'),radio:document.querySelector('#radioView')};
function activateView(name){const button=document.querySelector(`.nav-item[data-view="${name}"]`);if(button)button.click();}
document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item===button));if(button.dataset.view==='settings'){openSettings();return;}Object.entries(views).forEach(([key,view])=>view.classList.toggle('hidden',key!==button.dataset.view));document.querySelector('.crumb').innerHTML='ASTERIA <span>/</span> '+(button.dataset.label||button.textContent.trim().split(/\s+/)[0]).toUpperCase();}));
document.querySelector('#openCivilizations').addEventListener('click',()=>activateView('play'));
document.querySelectorAll('.subtle-action[data-view]').forEach(button=>button.addEventListener('click',()=>activateView(button.dataset.view)));
const selectedCivilization=localStorage.getItem('asteria-civilization');if(selectedCivilization){const selectedCard=document.querySelector(`.civ-card[data-civ="${selectedCivilization}"]`);if(selectedCard)selectedCard.setAttribute('aria-pressed','true');}
document.querySelectorAll('.civ-card').forEach(card=>card.addEventListener('click',()=>{document.querySelectorAll('.civ-card').forEach(item=>item.setAttribute('aria-pressed',String(item===card)));localStorage.setItem('asteria-civilization',card.dataset.civ);status.textContent=`${card.dataset.civ} sélectionnée · choix de prototype enregistré`; }));
document.querySelector('#accountButton').addEventListener('click',async()=>{await window.asteriaAuth.signOut();location.reload();});


