//////////////// FIREBASE //////////////////

import { initializeApp }
from "[https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js](https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js)";

import {
getAuth,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
signOut,
onAuthStateChanged
} from "[https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js](https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js)";

import {
getDatabase,
ref,
update,
push,
onValue
} from "[https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js](https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js)";

import {
getStorage,
ref as sRef,
uploadBytes,
getDownloadURL
} from "[https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js](https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js)";

const firebaseConfig={
apiKey:"AIzaSyD9SIzJ58zYlvwGYewKXwCmrq6SGgDLUM",
authDomain:"closr-c35df.firebaseapp.com",
databaseURL:"[https://closr-c35df-default-rtdb.firebaseio.com](https://closr-c35df-default-rtdb.firebaseio.com)",
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
const logoutBtn=document.getElementById("logoutBtn");

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

},
()=>alert("GPS gagal / belum diizinkan!"));
}

window.centerMe=()=>{
if(myLat) map.setView([myLat,myLng],17);
};

//////////////// MOMENT //////////////////

window.openMoment=()=>{
momentBox.style.display="block";
};

window.sendMoment=async()=>{

let text=momentText.value.trim();
if(!text) return;

let photoURL="";
let file=momentPhoto?.files?.[0];

if(file){
let fileRef=sRef(storage,"moments/"+myUID+"/"+Date.now());
await uploadBytes(fileRef,file);
photoURL=await getDownloadURL(fileRef);
}

push(ref(db,"moments/"+myUID),{
text,
photo:photoURL,
lat:myLat,
lng:myLng,
time:Date.now(),
friendsOnly:friendOnly?.checked||false
});

momentText.value="";
momentPhoto.value="";
momentBox.style.display="none";
};

//////////////// USERS //////////////////

onValue(ref(db,"users"),snap=>{

for(let id in userMarkers)
map.removeLayer(userMarkers[id]);

userMarkers={};

snap.forEach(c=>{

let u=c.val();
if(!u.lat) return;

let avatar=u.avatar||"avatar/avatar1.png";

let icon=L.divIcon({
className:"",
html:`

<div style="text-align:center">
<img src="${avatar}"
style="width:50px;height:50px;border-radius:50%;border:3px solid #E53935;">
<br>${u.username||"user"}
</div>`
});

let m=L.marker([u.lat,u.lng],{icon}).addTo(map);

userMarkers[c.key]=m;

});
});

//////////////// MOMENTS //////////////////

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

//////////////// TIMELINE //////////////////

window.toggleTimeline=()=>{
timelineBox.style.display=
timelineBox.style.display==="none"?"block":"none";
};

//////////////// AUTH //////////////////

logoutBtn.onclick=()=>signOut(auth);

onAuthStateChanged(auth,user=>{

if(user){

myUID=user.uid;
loginBox.innerHTML="";
logoutBtn.style.display="block";
startGPS();

}else{

logoutBtn.style.display="none";
showLogin();

}
});
