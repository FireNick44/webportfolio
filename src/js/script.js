document.addEventListener("DOMContentLoaded", sessionLoadPage);

var loader = document.querySelector(".loader");
var content = document.querySelector(".content");
var loadedDOM = 0;
var toggle = document.getElementById("toggle");

function sleep(milliseconds) {
   return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sessionLoadPage() {
   if (sessionStorage.getItem("pageHasLightmode") === "true") {
      loadedDOM = 1;
   }
   await sessionPageReady();
}

async function sessionPageReady() {
   await sleep(1000);
   if (!sessionStorage.getItem("pageWasLoaded")) {
      await sleep(5000);
   } else {
      await sleep(2000);
   }
   loader.classList.add("disappear");
   await sleep(100);
   content.classList.add("appear");
   sessionStorage.setItem("pageWasLoaded", true);
}

window.addEventListener('load', () => {
   if (loadedDOM === 1) {
      themeKlick();
   }
});

function themeKlick(){
   if(!toggle.classList.contains("toggleWrapperOpen")) sessionStorage.setItem("pageHasLightmode", true);  //lightmode
   else if(toggle.classList.contains("toggleWrapperOpen")) sessionStorage.removeItem("pageHasLightmode"); //Darkmode

   let cover = document.getElementById("cover");
   let moon = document.getElementById("moon");
   let sun = document.getElementById("sun");
   let hContact = document.getElementById("headContact");
   let github = document.getElementById("github");
   let me = document.getElementById("me");
   let wave1 = document.getElementById("wave1");
   let wave2 = document.getElementById("wave2");
   let wave3 = document.getElementById("wave3");
   let brick = document.getElementById("introBrick");
   let introScroll = document.getElementById("introScroll");
   let projects = document.getElementById("projects");
   let fix1 = document.getElementById("fix1");
   let fix2 = document.getElementById("fix2");
   let fix3 = document.getElementById("fix3");
   let byeWave = document.getElementById("byeWave");

   toggle.classList.toggle("toggleWrapperOpen");
   cover.classList.toggle("coverOpen");
   moon.classList.toggle("colorLightFill");
   sun.classList.toggle("colorDarkFill");//
   hContact.classList.toggle("colorDark");
   github.classList.toggle("colorDarkFill");//
   me.classList.toggle("colorDarkBG");
   wave1.classList.toggle("colorLightFill");
   wave2.classList.toggle("colorLightFill");
   wave3.classList.toggle("colorLightFill");//
   brick.classList.toggle("colorDarkBG");
   introScroll.classList.toggle("colorDarkFill");//
   projects.classList.toggle("colorDarkBG");//
   fix1.classList.toggle("colorDarkBG");
   fix2.classList.toggle("colorDarkBG");
   fix3.classList.toggle("colorBlack");//
   byeWave.classList.toggle("byeWaveLight");
}

function show(){
   alert("Hi :)")
   var element = document.getElementById("9712qgd");
   element.classList.toggle("content");
}

