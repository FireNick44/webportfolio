var loader = document.querySelector(".loader")

window.addEventListener("load", vanish);

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}


async function vanish() {
    await Sleep(2000);
    loader.classList.add("disppear");
}

