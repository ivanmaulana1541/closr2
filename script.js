////////////////////////////////////////////////////////
// FIREBASE IMPORT
////////////////////////////////////////////////////////

import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import {
getAuth,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
signOut,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
getDatabase,
ref,
update,
push,
onValue
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

////////////////////////////////////////////////////////
// FIREBASE CONFIG — PAKAI PUNYA KAMU
////////////////////////////////////////////////////////

const firebaseConfig = {
apiKey: "AIzaSyD9SIzJ58zYVlvwGYewKXwCmrq6SGgDLUM",
authDomain: "closr-c35df.firebaseapp.com",
databaseURL: "https://closr-c35df-default-rtdb.firebaseio.com",
projectId: "closr-c35df",
storageBucket: "closr-c35df.firebasestorage.app",
messagingSenderId: "352431132160",
appId: "1:352431132160:web:6125a40a3853d1fd6592e5"
};

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getDatabase(appFirebase);

////////////////////////////////////////////////////////
// MAP INIT
////////////////////////////////////////////////////////

let map = L.map("map").setView([-6.2,106.8],15);

L.tileLayer(
"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
).addTo(map);

let markers = {};
let myUID = null;
let myLat, myLng;

////////////////////////////////////////////////////////
// LOGIN UI
////////////////////////////////////////////////////////

const loginBox = document.getElementById("loginBox");

function showLogin(){

loginBox.innerHTML=`
<h3>Login</h3>
<input id="email"><br>
<input id="pass" type="password"><br>
<button id="reg">Register</button>
<button id="log">Login</button>
`;

reg.onclick=()=>{
createUserWithEmailAndPassword(auth,email.value,pass.value)
.catch(e=>alert(e.message));
};

log.onclick=()=>{
signInWithEmailAndPassword(auth,email.value,pass.value)
.catch(e=>alert(e.message));
};

}

////////////////////////////////////////////////////////
// GPS
////////////////////////////////////////////////////////

function startGPS(){

navigator.geolocation.watchPosition(pos=>{

myLat=pos.coords.latitude;
myLng=pos.coords.longitude;

update(ref(db,"users/"+myUID),{
lat:myLat,
lng:myLng
});

map.setView([myLat,myLng],16);

});

}

window.centerMe=()=>{
if(myLat) map.setView([myLat,myLng],17);
};

////////////////////////////////////////////////////////
// MOMENT
////////////////////////////////////////////////////////

window.openMoment=()=>{
momentBox.style.display="block";
};

window.sendMoment=()=>{

let text=momentText.value.trim();
if(!text) return;

push(ref(db,"moments/"+myUID),{
text,
lat:myLat,
lng:myLng,
time:Date.now()
});

momentText.value="";
momentBox.style.display="none";

};

////////////////////////////////////////////////////////
// RADAR USERS
////////////////////////////////////////////////////////

onValue(ref(db,"users"),snap=>{

for(let id in markers){
map.removeLayer(markers[id]);
}
markers={};

snap.forEach(c=>{

let u=c.val();
if(!u.lat) return;

let icon=L.divIcon({
className:"",
html:`
<img src="avatar/avatar1.png"
style="width:50px;height:50px;border-radius:50%;">
<br>${u.username||"user"}
`
});

markers[c.key]=L.marker([u.lat,u.lng],{icon})
.addTo(map);

});

});

////////////////////////////////////////////////////////
// AUTH
////////////////////////////////////////////////////////

onAuthStateChanged(auth,user=>{

if(user){

myUID=user.uid;

loginBox.innerHTML=`
Logged in: ${user.email}<br><br>
<button id="logout">Logout</button>
`;

logout.onclick=()=>signOut(auth);

startGPS();

}else{

showLogin();

}

});
