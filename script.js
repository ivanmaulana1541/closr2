////////////////////////////////////////////////////////
// CLOSR — FIXED ENGINE
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

const map=L.map("map").setView([-6.2,106.8],15);

L.tileLayer(
"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
).addTo(map);

////////////////////////////////////////////////////////
// GLOBAL STATE
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
// LOGIN UI
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
// AUTH WRAPPERS
////////////////////////////////////////////////////////

window.registerUser=()=>{

let email=document.getElementById("email").value;
let pass=document.getElementById("pass").value;

createUserWithEmailAndPassword(auth,email,pass)
.then(()=>{
alert("Registered!");
openProfileSetup();
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
// PROFILE SETUP
////////////////////////////////////////////////////////

function openProfileSetup(){

let box=document.getElementById("profileSetup");
if(box) box.style.display="block";

}

window.saveProfile=()=>{

let uname=document.getElementById("newUsername").value.trim();
let avatar=document.getElementById("avatarSelect").value;

if(!uname) return alert("Username required");

update(ref(db,"users/"+myUID),{
username:uname,
avatar:avatar
});

let box=document.getElementById("profileSetup");
if(box) box.style.display="none";

};

////////////////////////////////////////////////////////
// USERNAME AUTO
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
// GPS ENGINE
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

function startGPS(){

navigator.geolocation.watchPosition(

pos=>{

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

},

err=>{
alert("GPS permission diperlukan!");
console.log(err);
},

{enableHighAccuracy:true}

);

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
// GHOST MODE
////////////////////////////////////////////////////////

window.toggleGhost=()=>{

ghostMode=!ghostMode;

alert(ghostMode?"👻 Ghost ON":"👁 Visible");

update(ref(db,"users/"+myUID+"/presence"),{
ghost:ghostMode
});

};

////////////////////////////////////////////////////////
// USER RADAR
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

let icon=L.divIcon({
html:`<div style="font-size:11px;text-align:center">
${u.username||"user"}
</div>`
});

userMarkers[c.key]=
L.marker([u.lat,u.lng],{icon}).addTo(map);

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

loginBox.innerHTML=`
Logged in<br>
<button onclick="signOut(auth)">Logout</button>
`;

}else showLogin();

});
