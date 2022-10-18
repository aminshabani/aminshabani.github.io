// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-analytics.js";
import { getDatabase, ref, set  } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-database.js";
const firebaseConfig = {
    apiKey: "AIzaSyB7atQalAZk9P_K7WMtrZg3jIotRqvG0oM",
    authDomain: "housedm-7a8e4.firebaseapp.com",
    projectId: "housedm-7a8e4",
    storageBucket: "housedm-7a8e4.appspot.com",
    messagingSenderId: "320229824154",
    appId: "1:320229824154:web:a19ce02118355c6477f123",
    measurementId: "G-98RNZEQP3C"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
function writeResponseData(userId, output) {
  set(ref(database, 'users/' + userId), {
    output : output
  });
}
function myFunction() {
    var output = ''
    var inputs = document.getElementsByTagName('input'); 
    for(var i = 0; i < inputs.length; i++) {
        if(inputs[i].checked){ 
            output += String(inputs[i].name) + ', ' + String(inputs[i].value) + "/";
        }
    }
    console.log(output)
    console.log('going for push');
    writeResponseData(inputs[0].name, output)
    alert('Thanks for participating!')
}
window.myFunction = myFunction
