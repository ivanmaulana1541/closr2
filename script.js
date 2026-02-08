////////////////////////////////////////////////
// FIREBASE
////////////////////////////////////////////////

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
set,
remove,
onValue
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

const firebaseConfig = {
apiKey: "AIzaSyD9SIzJ58zYVlvwGYewKXwCmrq6SGgDLUM",
authDomain: "closr-c35df.firebaseapp.com",
databaseURL: "https://closr-c35df-default-rtdb.firebaseio.com",
projectId: "closr-c35df",
storageBucket: "closr-c35df.firebasestorage.app",
messagingSenderId: "352431132160",
appId: "1:352431132160:web:6125a40a3853d1fd6592e5"
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getDatabase(app);

////////////////////////////////////////////////
// MAP
////////////////////////////////////////////////

let map=L.map("map").setView([-6.2,106.8],15);

L.tileLayer(
"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
).addTo(map);

let myUID=null;
let myLat,myLng;
let markers={};

////////////////////////////////////////////////
// LOGIN UI
////////////////////////////////////////////////

const loginBox=document.getElementById("loginBox");

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

////////////////////////////////////////////////
// USERNAME + AVATAR SETUP
////////////////////////////////////////////////

window.saveUsername=()=>{

let name=uname.value.trim();
if(!name) return;

update(ref(db,"users/"+myUID),{username:name});

usernameBox.style.display="none";
avatarBox.style.display="block";

};

document.querySelectorAll(".pick").forEach(img=>{

img.onclick=()=>{

update(ref(db,"users/"+myUID),{
avatar:img.src
});

avatarBox.style.display="none";

};

});

////////////////////////////////////////////////
// GPS
////////////////////////////////////////////////

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

////////////////////////////////////////////////
// MOMENT
////////////////////////////////////////////////

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

////////////////////////////////////////////////
// FRIEND SYSTEM
////////////////////////////////////////////////

function sendFriend(uid){
set(ref(db,"friendReq/"+uid+"/"+myUID),true);
alert("Request sent!");
}

function watchRequests(){

onValue(ref(db,"friendReq/"+myUID),snap=>{

snap.forEach(r=>{

let from=r.key;

if(confirm("Friend request from "+from+" ?")){

update(ref(db,"friends/"+myUID+"/"+from),true);
update(ref(db,"friends/"+from+"/"+myUID),true);

remove(ref(db,"friendReq/"+myUID+"/"+from));

}

});

});

}

////////////////////////////////////////////////
// INTERACTION POPUP
////////////////////////////////////////////////

function showInteraction(uid,name){

interactionBox.style.display="block";

interactionBox.innerHTML=`
<b>${name}</b><br><br>
<button onclick="openDM('${uid}','${name}')">DM</button>
<button onclick="sendFriend('${uid}')">Add Friend</button>
<button onclick="interactionBox.style.display='none'">Close</button>
`;

}

////////////////////////////////////////////////
// DM SYSTEM
////////////////////////////////////////////////

let chatUID=null;

window.openDM=(uid,name)=>{

chatUID=uid;

chatTitle.innerText="Chat: "+name;
chatBox.style.display="block";

listenDM();

};

window.closeChat=()=>{
chatBox.style.display="none";
};

window.sendDM=()=>{

let msg=chatInput.value.trim();
if(!msg) return;

let room=[myUID,chatUID].sort().join("_");

push(ref(db,"dm/"+room),{
from:myUID,
text:msg
});

chatInput.value="";

};

function listenDM(){

let room=[myUID,chatUID].sort().join("_");

onValue(ref(db,"dm/"+room),snap=>{

chatLog.innerHTML="";

snap.forEach(m=>{

let d=m.val();

chatLog.innerHTML+=
(d.from===myUID?"me: ":"them: ")
+d.text+"<br>";

});

});

}

////////////////////////////////////////////////
// RADAR
////////////////////////////////////////////////

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
<img src="${u.avatar||'avatar/avatar1.png'}"
style="width:50px;height:50px;border-radius:50%;">
<br>${u.username||"user"}
`
});

let m=L.marker([u.lat,u.lng],{icon}).addTo(map);

m.on("click",()=>{
if(c.key!==myUID)
showInteraction(c.key,u.username||"user");
});

markers[c.key]=m;

});

});

////////////////////////////////////////////////
// AUTH
////////////////////////////////////////////////

onAuthStateChanged(auth,user=>{

if(user){

myUID=user.uid;

loginBox.innerHTML=`
Logged in: ${user.email}<br>
<button id="logout">Logout</button>
`;

logout.onclick=()=>signOut(auth);

startGPS();
watchRequests();

// cek profile
onValue(ref(db,"users/"+myUID),snap=>{

let d=snap.val()||{};

if(!d.username)
usernameBox.style.display="block";

else if(!d.avatar)
avatarBox.style.display="block";

},{onlyOnce:true});

}else showLogin();

});
