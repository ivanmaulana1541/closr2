////////////////////////////////////////////////////////
// CLOSR ULTIMATE — PART 1
// Core realtime engine + presence foundation
////////////////////////////////////////////////////////

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getDatabase, ref, update, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

////////////////////////////////////////////////////////
// FIREBASE CONFIG (pakai milikmu)
////////////////////////////////////////////////////////

const firebaseConfig={
apiKey:"AIza...",
authDomain:"...",
databaseURL:"...",
projectId:"...",
storageBucket:"..."
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getDatabase(app);

////////////////////////////////////////////////////////
// MAP INIT
////////////////////////////////////////////////////////

let map=L.map("map").setView([-6.2,106.8],15);

L.tileLayer(
"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
).addTo(map);

////////////////////////////////////////////////////////
// GLOBAL STATE ENGINE
////////////////////////////////////////////////////////

let myUID=null;
let myLat,myLng;
let lastLat,lastLng;

let myFriends={};
let userMarkers={};

let ghostMode=false; // dipakai part berikutnya

////////////////////////////////////////////////////////
// LOGIN UI
////////////////////////////////////////////////////////

const loginBox=document.getElementById("loginBox");

function showLogin(){
loginBox.innerHTML=`
<h3>Login</h3>
<input id="email"><br>
<input id="pass" type="password"><br>
<button onclick="createUserWithEmailAndPassword(auth,email.value,pass.value)">Register</button>
<button onclick="signInWithEmailAndPassword(auth,email.value,pass.value)">Login</button>`;
}

////////////////////////////////////////////////////////
// USERNAME INIT
////////////////////////////////////////////////////////

function ensureUsername(){
onValue(ref(db,"users/"+myUID+"/username"),snap=>{
if(!snap.exists()){
update(ref(db,"users/"+myUID),{
username:"user_"+myUID.slice(0,5)
});
}
},{onlyOnce:true});
}

////////////////////////////////////////////////////////
// DISTANCE ENGINE (dipakai discovery nanti)
////////////////////////////////////////////////////////

function distanceKm(a,b,c,d){

let R=6371;

let dLat=(c-a)*Math.PI/180;
let dLon=(d-b)*Math.PI/180;

let x=
Math.sin(dLat/2)**2+
Math.cos(a*Math.PI/180)*
Math.cos(c*Math.PI/180)*
Math.sin(dLon/2)**2;

return R*(2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)));
}

////////////////////////////////////////////////////////
// PRESENCE ENGINE
////////////////////////////////////////////////////////

function detectStatus(lat,lng){

if(!lastLat){
lastLat=lat;
lastLng=lng;
return "online";
}

let move=Math.abs(lat-lastLat)+Math.abs(lng-lastLng);

lastLat=lat;
lastLng=lng;

return move>0.0002?"moving":"idle";
}

////////////////////////////////////////////////////////
// GPS + PRESENCE LOOP
////////////////////////////////////////////////////////

function startGPS(){

navigator.geolocation.watchPosition(pos=>{

myLat=pos.coords.latitude;
myLng=pos.coords.longitude;

update(ref(db,"users/"+myUID),{

lat:myLat,
lng:myLng,

presence:{
status:detectStatus(myLat,myLng),
lastActive:Date.now(),
ghost:ghostMode
}

});

map.setView([myLat,myLng],16);

});
}

window.centerMe=()=>{
if(myLat) map.setView([myLat,myLng],17);
};

////////////////////////////////////////////////////////
// FRIEND CACHE
////////////////////////////////////////////////////////

function loadFriends(){

onValue(ref(db,"friends/"+myUID),snap=>{
myFriends=snap.val()||{};
});

}

////////////////////////////////////////////////////////
// ANIMATED PRESENCE PULSE
////////////////////////////////////////////////////////

function presencePulse(marker){

let scale=1;

setInterval(()=>{

scale=scale===1?1.3:1;

if(marker._icon)
marker._icon.style.transform=
`scale(${scale})`;

},1000);

}

////////////////////////////////////////////////////////
// USER RADAR (presence-ready)
////////////////////////////////////////////////////////

onValue(ref(db,"users"),snap=>{

for(let k in userMarkers)
map.removeLayer(userMarkers[k]);

userMarkers={};

snap.forEach(c=>{

let u=c.val();
if(!u.lat) return;

let ghost=u.presence?.ghost;

if(ghost && !myFriends[c.key] && c.key!==myUID)
return;

let status=u.presence?.status||"offline";

let icon=L.divIcon({

html:`
<div style="
background:white;
padding:4px;
border-radius:12px;
font-size:11px;
text-align:center;
">
${u.username||"user"}<br>
🟢 ${status}
</div>`

});

let m=L.marker([u.lat,u.lng],{icon})
.addTo(map);

presencePulse(m);

userMarkers[c.key]=m;

});

});

////////////////////////////////////////////////////////
// AUTH FLOW
////////////////////////////////////////////////////////

onAuthStateChanged(auth,user=>{

if(user){

myUID=user.uid;

ensureUsername();
loadFriends();
startGPS();

loginBox.innerHTML=
`Logged in<br>
<button onclick="signOut(auth)">
Logout
</button>`;

}else showLogin();

});
