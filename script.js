import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getDatabase, ref, update, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

const firebaseConfig={
apiKey:"AIza...",
authDomain:"closr...",
databaseURL:"https://...",
projectId:"...",
storageBucket:"..."
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getDatabase(app);
const storage=getStorage(app);

let map=L.map("map").setView([-6.2,106.8],15);
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);

let myUID,myLat,myLng;
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
push(ref(db,"moments/"+myUID),{text,photo,lat:myLat,lng:myLng,time:Date.now()});
momentBox.style.display="none";
};

/////////////////////////////////////////////////
// FRIEND SEARCH
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
loginBox.innerHTML=`Logged in<br><button onclick="signOut(auth)">Logout</button>`;
}else showLogin();
});
