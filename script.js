//////////////// FIREBASE //////////////////

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

import {
getStorage,
ref as sRef,
uploadBytes,
getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

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
const storage=getStorage(app);

//////////////// MAP //////////////////

let map=L.map("map").setView([-6.2,106.8],15);

L.tileLayer(
"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
).addTo(map);

let userMarkers={};
let momentMarkers={};

let myUID=null;
let myLat,myLng;

//////////////// LOGIN //////////////////

const loginBox=document.getElementById("loginBox");

function showLogin(){

loginBox.innerHTML=`
<h3>Login</h3>
<input id="email"><br>
<input id="pass" type="password"><br>
<button id="reg">Register</button>
<button id="log">Login</button>
`;

reg.onclick=()=>createUserWithEmailAndPassword(auth,email.value,pass.value);
log.onclick=()=>signInWithEmailAndPassword(auth,email.value,pass.value);
}

//////////////// GPS //////////////////

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

//////////////// MOMENT + PHOTO //////////////////

window.openMoment=()=>{
momentBox.style.display="block";
};

window.sendMoment=async()=>{

let text=momentText.value.trim();
if(!text) return;

let photoURL="";

let file=momentPhoto?.files?.[0];

if(file){

let fileRef=sRef(storage,
"moments/"+myUID+"/"+Date.now());

await uploadBytes(fileRef,file);

photoURL=await getDownloadURL(fileRef);
}

push(ref(db,"moments/"+myUID),{
text,
photo:photoURL,
lat:myLat,
lng:myLng,
time:Date.now(),
friendsOnly:friendOnly?.checked || false
});

momentText.value="";
momentPhoto.value="";
momentBox.style.display="none";
};

//////////////// RADAR USERS //////////////////

onValue(ref(db,"users"),snap=>{

for(let id in userMarkers)
map.removeLayer(userMarkers[id]);

userMarkers={};

snap.forEach(c=>{

let u=c.val();
if(!u.lat) return;

let icon=L.divIcon({
className:"",
html:`👤<br>${u.username||"user"}`
});

let m=L.marker([u.lat,u.lng],{icon})
.addTo(map);

m.on("click",()=>{

if(c.key!==myUID)
showInteractionPopup(
m.getLatLng(),
c.key,
u.username||"user"
);

});

userMarkers[c.key]=m;

});
});

//////////////// MOMENT MARKERS //////////////////

onValue(ref(db,"moments"),snap=>{

for(let k in momentMarkers)
map.removeLayer(momentMarkers[k]);

momentMarkers={};

snap.forEach(user=>{

user.forEach(m=>{

let d=m.val();

let mk=L.marker([d.lat,d.lng])
.addTo(map)
.bindPopup(`
📍 ${d.text}
${d.photo?`<img class="preview" src="${d.photo}">`:""}
`);

momentMarkers[m.key]=mk;

});
});
});

//////////////// PROFILE VIEWER //////////////////

window.openProfile=(uid)=>{

onValue(ref(db,"moments/"+uid),snap=>{

let html="<b>Profile</b><br><br>";

snap.forEach(m=>{

let d=m.val();

html+=`
📍 ${d.text}<br>
${d.photo?`<img class="preview" src="${d.photo}">`:""}
<hr>
`;

});

html+=`<button onclick="profileBox.style.display='none'">Close</button>`;

profileBox.innerHTML=html;
profileBox.style.display="block";

},{onlyOnce:true});
};

//////////////// TIMELINE //////////////////

window.toggleTimeline=()=>{

timelineBox.style.display=
timelineBox.style.display==="none"
?"block":"none";
};

onValue(ref(db,"moments"),snap=>{

let feed=[];

snap.forEach(user=>{
user.forEach(m=>feed.push(m.val()));
});

feed.sort((a,b)=>b.time-a.time);

let html="<b>Timeline</b><br><br>";

feed.forEach(f=>{

html+=`
📍 ${f.text}<br>
${f.photo?`<img class="preview" src="${f.photo}">`:""}
<hr>
`;

});

timelineBox.innerHTML=html;
});

//////////////// AUTH //////////////////

onAuthStateChanged(auth,user=>{

if(user){

myUID=user.uid;

loginBox.innerHTML=`
Logged in<br>
<button id="logout">Logout</button>
`;

document.getElementById("logout").onclick=
()=>signOut(auth);

startGPS();

}else showLogin();

});

//////////////////////////////////////////////////////
// FLOATING INTERACTION POPUP
//////////////////////////////////////////////////////

let interactionBox=null;

window.showInteractionPopup=(latlng,uid,name)=>{

if(interactionBox)
map.closePopup(interactionBox);

interactionBox=L.popup({
closeButton:false,
autoClose:false,
closeOnClick:false
})
.setLatLng(latlng)
.setContent(`
<b>${name}</b><br><br>
<button onclick="openProfile('${uid}')">Profile</button><br>
<button onclick="closeInteraction()">Close</button>
`)
.openOn(map);

};

window.closeInteraction=()=>{
if(interactionBox)
map.closePopup(interactionBox);
};
