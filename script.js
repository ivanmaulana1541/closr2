import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getDatabase, ref, update, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

const firebaseConfig={apiKey:"AIza...",authDomain:"...",databaseURL:"...",projectId:"...",storageBucket:"..."};
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getDatabase(app);
const storage=getStorage(app);

let map=L.map("map").setView([-6.2,106.8],15);
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);

let myUID,myLat,myLng;
let myFriends={};
let momentMarkers={};

const loginBox=document.getElementById("loginBox");

function showLogin(){
loginBox.innerHTML=`
<h3>Login</h3>
<input id="email"><br>
<input id="pass" type="password"><br>
<button onclick="createUserWithEmailAndPassword(auth,email.value,pass.value)">Register</button>
<button onclick="signInWithEmailAndPassword(auth,email.value,pass.value)">Login</button>`;
}

function ensureUsername(){
onValue(ref(db,"users/"+myUID+"/username"),snap=>{
if(!snap.exists())
update(ref(db,"users/"+myUID),{username:"user_"+myUID.slice(0,5)});
},{onlyOnce:true});
}

function startGPS(){
navigator.geolocation.watchPosition(pos=>{
myLat=pos.coords.latitude;
myLng=pos.coords.longitude;
update(ref(db,"users/"+myUID),{lat:myLat,lng:myLng});
map.setView([myLat,myLng],16);
});
}

window.centerMe=()=>{if(myLat) map.setView([myLat,myLng],17);};

/////////////////////////////////////////////////
// FRIEND CACHE
/////////////////////////////////////////////////

function loadFriends(){
onValue(ref(db,"friends/"+myUID),snap=>{
myFriends=snap.val()||{};
});
}

/////////////////////////////////////////////////
// MOMENT POST
/////////////////////////////////////////////////

window.openMoment=()=>momentBox.style.display="block";

window.sendMoment=async()=>{
let text=momentText.value.trim();
if(!text) return;

let photo="";
let file=momentPhoto.files[0];
if(file){
let r=sRef(storage,"moments/"+myUID+"/"+Date.now());
await uploadBytes(r,file);
photo=await getDownloadURL(r);
}

push(ref(db,"moments/"+myUID),{
text,photo,lat:myLat,lng:myLng,
time:Date.now(),
friendsOnly:friendOnly.checked
});

momentBox.style.display="none";
};

/////////////////////////////////////////////////
// VISIBILITY CHECK
/////////////////////////////////////////////////

function canSee(owner,data){
if(!data.friendsOnly) return true;
return owner===myUID || myFriends[owner];
}

/////////////////////////////////////////////////
// MAP MOMENTS
/////////////////////////////////////////////////

onValue(ref(db,"moments"),snap=>{

for(let k in momentMarkers) map.removeLayer(momentMarkers[k]);
momentMarkers={};

snap.forEach(user=>{
let owner=user.key;

user.forEach(m=>{
let d=m.val();
if(!canSee(owner,d)) return;

let mk=L.marker([d.lat,d.lng])
.addTo(map)
.bindPopup(`📍 ${d.text}`);
momentMarkers[m.key]=mk;
});

});

});

/////////////////////////////////////////////////
// TIMELINE
/////////////////////////////////////////////////

window.toggleTimeline=()=>{
timelineBox.style.display=
timelineBox.style.display==="none"?"block":"none";
};

onValue(ref(db,"moments"),snap=>{

let feed=[];

snap.forEach(user=>{
let owner=user.key;
user.forEach(m=>{
let d=m.val();
if(canSee(owner,d)) feed.push(d);
});
});

feed.sort((a,b)=>b.time-a.time);

let html="<b>Timeline</b><br><br>";

feed.forEach(f=>{
html+=`📍 ${f.text}<hr>`;
});

timelineBox.innerHTML=html;

});

/////////////////////////////////////////////////
// FRIEND SEARCH + REQUEST
/////////////////////////////////////////////////

window.openFriend=()=>friendBox.style.display="block";

window.searchFriend=()=>{
let k=friendSearch.value.toLowerCase();
onValue(ref(db,"users"),snap=>{
friendResult.innerHTML="";
snap.forEach(c=>{
let u=c.val();
if(c.key===myUID||!u.username) return;
if(u.username.toLowerCase().includes(k)){
friendResult.innerHTML+=`
<b>${u.username}</b><br>
<button onclick="sendFriend('${c.key}')">Add</button><hr>`;
}
});
},{onlyOnce:true});
};

window.sendFriend=(uid)=>{
update(ref(db,"friendRequests/"+uid),{[myUID]:true});
alert("Request sent");
};

/////////////////////////////////////////////////
// REQUEST SYSTEM
/////////////////////////////////////////////////

window.openRequests=()=>{
requestBox.style.display="block";
loadRequests();
};

function loadRequests(){
onValue(ref(db,"friendRequests/"+myUID),snap=>{
requestList.innerHTML="";
snap.forEach(c=>{
let uid=c.key;
requestList.innerHTML+=`
<b>${uid}</b><br>
<button onclick="acceptFriend('${uid}')">Accept</button>
<button onclick="rejectFriend('${uid}')">Reject</button>
<hr>`;
});
},{onlyOnce:true});
}

window.acceptFriend=(uid)=>{
update(ref(db,"friends/"+myUID),{[uid]:true});
update(ref(db,"friends/"+uid),{[myUID]:true});
remove(ref(db,"friendRequests/"+myUID+"/"+uid));
loadFriends();
loadRequests();
};

window.rejectFriend=(uid)=>{
remove(ref(db,"friendRequests/"+myUID+"/"+uid));
loadRequests();
};

/////////////////////////////////////////////////
// AUTH
/////////////////////////////////////////////////

onAuthStateChanged(auth,user=>{
if(user){
myUID=user.uid;
ensureUsername();
startGPS();
loadFriends();
loginBox.innerHTML=`Logged in<br><button onclick="signOut(auth)">Logout</button>`;
}else showLogin();
});
