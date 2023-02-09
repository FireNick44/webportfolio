var loader = document.querySelector(".loader");
var content = document.querySelector(".content");

function Sleep(milliseconds) {
   return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

window.addEventListener("onload", sessionOnLoadPage());
window.addEventListener("load", sessionLoadPage());

async function sessionOnLoadPage() { }

async function sessionLoadPage() {
   if(sessionStorage.getItem("pageHasLightmode", true)) themeMenu(); //looking for lightmode

   if (!sessionStorage.getItem("pageWasLoaded")) {
      await Sleep(5000);
      loader.classList.add("disappear");
      await Sleep(100);
      content.classList.add("appear");
      sessionStorage.setItem("pageWasLoaded", true);
   } else if (sessionStorage.getItem("pageWasLoaded")) {
      await Sleep(2000);
      loader.classList.add("disappear");
      await Sleep(100);
      content.classList.add("appear");
   }
}


var body = document.body;
var cover = document.getElementById("cover");
var toggle = document.getElementById("toggle");
var moon = document.getElementById("moon");
var sun = document.getElementById("sun");

var hContact = document.getElementById("head-contact");
var github = document.getElementById("github");

var me = document.getElementById("me");
var wave1 = document.getElementById("wave1");
var wave2 = document.getElementById("wave2");

var brick = document.getElementById("intro-brick");
var introScroll = document.getElementById("intro-scroll");

var projects = document.getElementById("projects");
var wave3 = document.getElementById("wave3");

var fix1 = document.getElementById("fix1");
var fix2 = document.getElementById("fix2");
var fix3 = document.getElementById("fix3");

var byeWave = document.getElementById("bye-wave");

function show(){
   alert("hi")
}

function themeToggle(){
   if(cover.classList.contains("cover-open")) sessionStorage.setItem("pageHasLightmode", true); //lightmode
   else if(!cover.classList.contains("cover-open")) sessionStorage.removeItem("pageHasLightmode") //Darkmode
   cover.classList.toggle("cover-open");
   toggle.classList.toggle("toggle-wrapper-open");
   moon.classList.toggle("colorLightFill");
   sun.classList.toggle("colorDarkFill");
   
   hContact.classList.toggle("colorDark");
   github.classList.toggle("colorDarkFill");

   me.classList.toggle("colorDarkBG");
   wave1.classList.toggle("colorLightFill");
   wave2.classList.toggle("colorLightFill");


   brick.classList.toggle("colorDarkBG");
   introScroll.classList.toggle("colorDarkFill");

   projects.classList.toggle("colorDarkBG");
   wave3.classList.toggle("colorLightFill");
   
   
   fix1.classList.toggle("colorDarkBG");
   fix2.classList.toggle("colorDarkBG");
   fix3.classList.toggle("colorBlack");

   byeWave.classList.toggle("bye-waveLight");

}

function themeMenu(){
   if(cover.classList.contains("cover-open")) sessionStorage.setItem("pageHasLightmode", true); //lightmode
   else if(!cover.classList.contains("cover-open")) sessionStorage.removeItem("pageHasLightmode") //Darkmode
   
   // modemenu.classList.toggle("open");
   // body.classList.toggle("body-light");
   // bg.classList.toggle("background-light");
   // cards1.classList.toggle("card-light");
}