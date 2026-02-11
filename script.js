////////////////////////////////////////////////////////
// CLOSR ULTIMATE — PART 5
// Full engine + Ghost privacy
////////////////////////////////////////////////////////

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getDatabase, ref, update, onValue, push, remove } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

////////////////////////////////////////////////////////
// FIREBASE
////////////////////////////////////////////////////////

const firebaseConfig={
apiKey:"AIzaSyD9SIzJ58zYVlvwGYewKXwCmrq6SGgDLUM",
authDomain:"closr-c35df.firebaseapp.com",
databaseURL:"https://closr-c35df-default-rtdb.firebaseio.com",
projectId:"closr-c35df",
storageBucket:"closr-c35df.firebasestorage.app"
};


const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getDatabase(app);

////////////////////////////////////////////////////////
// MAP
////////////////////////////////////////////////////////

let map=L.map("map").setView([-6.2,106.8],15);

L.tileLayer(
"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
).addTo(map);

////////////////////////////////////////////////////////
// GLOBAL ENGINE
////////////////////////////////////////////////////////

let myUID=null;
let myLat,myLng;
let lastLat,lastLng;

let myFriends={};
let userMarkers={};
let hangoutMarkers={};

let ghostMode=false;

const DISCOVERY_RADIUS=1;

////////////////////////////////////////////////////////
// LOGIN
////////////////////////////////////////////////////////

const loginBox=document.getElementById("loginBox");

function showLogin(){

loginBox.innerHTML=`
<h3>Login</h3>

<input id="email"><br>
<input id="pass" type="password"><br>

<button onclick="registerUser()">Register</button>
<button onclick="loginUser()">Login</button>
`;

}

////////////////////////////////////////////////////////
// GLOBAL AUTH WRAPPERS
////////////////////////////////////////////////////////

window.registerUser=()=>{

let email=email.value;
let pass=pass.value;

createUserWithEmailAndPassword(auth,email,pass)
.then(()=>{
alert("Registered!");
setTimeout(openProfileSetup,500);
})
.catch(e=>alert(e.message));

};


window.loginUser=()=>{

let email=document.getElementById("email").value;
let pass=document.getElementById("pass").value;

signInWithEmailAndPassword(auth,email,pass)
.catch(e=>alert(e.message));

};


////////////////////////////////////////////////////////
// USERNAME
////////////////////////////////////////////////////////

function ensureUsername(){
onValue(ref(db,"users/"+myUID+"/username"),snap=>{
if(!snap.exists())
update(ref(db,"users/"+myUID),{
username:"user_"+myUID.slice(0,5)
});
},{onlyOnce:true});
}

////////////////////////////////////////////////////////
// PROFILE SETUP
////////////////////////////////////////////////////////

function openProfileSetup(){

profileSetup.style.display="block";

}

window.saveProfile=()=>{

let uname=document.getElementById("newUsername").value.trim();
let avatar=document.getElementById("avatarSelect").value;

if(!uname){
alert("Username required");
return;
}

update(ref(db,"users/"+myUID),{
username:uname,
avatar:avatar
});

profileSetup.style.display="none";

};


////////////////////////////////////////////////////////
// GHOST TOGGLE
////////////////////////////////////////////////////////

window.toggleGhost=()=>{

ghostMode=!ghostMode;

alert(
ghostMode?
"👻 Ghost active (friends only visible)":
"👁 Visible to all"
);

update(ref(db,"users/"+myUID+"/presence"),{
ghost:ghostMode
});

};

////////////////////////////////////////////////////////
// DISTANCE
////////////////////////////////////////////////////////

function distanceKm(a,b,c,d){
let R=6371;
let dLat=(c-a)*Math.PI/180;
let dLon=(d-b)*Math.PI/180;
let x=Math.sin(dLat/2)**2+
Math.cos(a*Math.PI/180)*
Math.cos(c*Math.PI/180)*
Math.sin(dLon/2)**2;
return R*(2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)));
}

////////////////////////////////////////////////////////
// PRESENCE
////////////////////////////////////////////////////////

function detectStatus(lat,lng){
if(!lastLat){lastLat=lat;lastLng=lng;return"online";}
let move=Math.abs(lat-lastLat)+Math.abs(lng-lastLng);
lastLat=lat;lastLng=lng;
return move>0.0002?"moving":"idle";
}

////////////////////////////////////////////////////////
// GPS LOOP
////////////////////////////////////////////////////////

function startGPS(){
navigator.geolocation.watchPosition(pos=>{

myLat=pos.coords.latitude;
myLng=pos.coords.longitude;

update(ref(db,"users/"+myUID),{
lat:myLat,lng:myLng,
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
// ANIMATION
////////////////////////////////////////////////////////

function pulse(marker){
let s=1;
setInterval(()=>{
s=s===1?1.25:1;
if(marker._icon)
marker._icon.style.transform=`scale(${s})`;
},1000);
}

////////////////////////////////////////////////////////
// USER RADAR + GHOST FILTER
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

let nearby=false;

if(myLat && c.key!==myUID){
nearby=
distanceKm(
myLat,myLng,
u.lat,u.lng
)<=DISCOVERY_RADIUS;
}

let badge=nearby?"🔥 nearby":"";

let icon=L.divIcon({
html:`
<div style="
background:${nearby?"#FFF3E0":"white"};
padding:4px;
border-radius:12px;
font-size:11px;
text-align:center;
">
${u.username}<br>
🟢 ${status}<br>
${badge}<br>
<button onclick="pingUser('${c.key}')">Ping</button>
</div>`
});

let m=L.marker([u.lat,u.lng],{icon}).addTo(map);
pulse(m);

userMarkers[c.key]=m;

});

});

////////////////////////////////////////////////////////
// PING SYSTEM
////////////////////////////////////////////////////////

window.pingUser=(uid)=>{
if(!myFriends[uid]){
alert("Ping hanya teman");
return;
}
push(ref(db,"pings/"+uid),{
from:myUID,time:Date.now()
});
};

onValue(ref(db,"pings/"+myUID),snap=>{
snap.forEach(c=>{
alert("🔔 Friend ping!");
remove(ref(db,"pings/"+myUID+"/"+c.key));
});
});

////////////////////////////////////////////////////////
// HANGOUT SYSTEM
////////////////////////////////////////////////////////

window.createHangout=()=>{
if(!myLat) return;
push(ref(db,"hangouts"),{
owner:myUID,
lat:myLat,lng:myLng,
expires:Date.now()+1000*60*30
});
};

window.joinHangout=id=>{
update(ref(db,"hangouts/"+id+"/members/"+myUID),true);
alert("Joined hangout!");
};

onValue(ref(db,"hangouts"),snap=>{

for(let k in hangoutMarkers)
map.removeLayer(hangoutMarkers[k]);

hangoutMarkers={};

snap.forEach(c=>{

let h=c.val();

if(Date.now()>h.expires){
remove(ref(db,"hangouts/"+c.key));
return;
}

hangoutMarkers[c.key]=
L.circleMarker([h.lat,h.lng],{
radius:14,color:"orange"
})
.addTo(map)
.bindPopup(`
🔥 Hangout<br>
<button onclick="joinHangout('${c.key}')">
Join
</button>
`);

});

});

////////////////////////////////////////////////////////
// AUTH
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
