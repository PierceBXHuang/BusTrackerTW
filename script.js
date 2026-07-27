// =========================
// BusTrackerTW v2
// Step 1
// =========================

const CLIENT_ID = "piercebxhuang.pt-0e854e05-bee2-4c1d";
const CLIENT_SECRET = "c7662d45-91b9-4860-8835-3d7cf11be9a5";

const TOKEN_URL =
"https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";

const FAVORITE_KEY = "BusTrackerTW_Favorites";

let accessToken = "";

let refreshTimer=null;

async function getToken(){

    const body = new URLSearchParams({

        grant_type:"client_credentials",

        client_id:CLIENT_ID,

        client_secret:CLIENT_SECRET

    });

    const response = await fetch(

        TOKEN_URL,

        {

            method:"POST",

            headers:{

                "Content-Type":
                "application/x-www-form-urlencoded"

            },

            body

        }

    );

    const data = await response.json();

    accessToken=data.access_token;

    console.log("Token OK");

}

getToken();

const API_BASE = "https://tdx.transportdata.tw/api/basic/v2";

const routeInput = document.getElementById("routeInput");
const startInput = document.getElementById("startInput");
const endInput = document.getElementById("endInput");

const searchBtn = document.getElementById("searchBtn");

const loading = document.getElementById("loading");
const error = document.getElementById("error");

const resultCard = document.getElementById("resultCard");

const routeName = document.getElementById("routeName");
const destination = document.getElementById("destination");

const eta1 = document.getElementById("eta1");
const eta2 = document.getElementById("eta2");
const eta3 = document.getElementById("eta3");

const updateTime = document.getElementById("updateTime");
const CITY = "Taipei";


async function apiGet(url){

    if(!accessToken){

        await getToken();

    }

    const response = await fetch(url,{

        headers:{

            Authorization:`Bearer ${accessToken}`

        }

    });

    if(!response.ok){

        throw new Error("API 錯誤");

    }

    return await response.json();

}

async function getRoute(route){

    return await apiGet(

`${API_BASE}/Bus/Route/City/${CITY}/${encodeURIComponent(route)}?$format=JSON`

    );

}

async function getStops(route){

    return await apiGet(

`${API_BASE}/Bus/StopOfRoute/City/${CITY}/${encodeURIComponent(route)}?$format=JSON`

    );

}

async function getETA(route){

    return await apiGet(

`${API_BASE}/Bus/EstimatedTimeOfArrival/City/${CITY}/${encodeURIComponent(route)}?$format=JSON`

    );

}

function formatETA(sec){

    if(sec==null){

        return "--";

    }

    if(sec<=60){

        return "即將進站";

    }

    return Math.ceil(sec/60)+" 分";

}

async function searchBus() {

    try {

        error.textContent = "";
        loading.style.display = "block";
        resultCard.style.display = "none";

        const route = routeInput.value.trim();
        const start = startInput.value.trim();
        const end = endInput.value.trim();

        if (!route || !start || !end) {
            throw new Error("請輸入完整資訊");
        }

        // 取得站牌資料
        const stopData = await getStops(route);

        let direction = null;
        let stopUID = null;

        // 找方向與 StopUID
        for (const dir of stopData) {

            const startIndex = dir.Stops.findIndex(
                s => s.StopName.Zh_tw === start
            );

            const endIndex = dir.Stops.findIndex(
                s => s.StopName.Zh_tw === end
            );

            if (
                startIndex !== -1 &&
                endIndex !== -1 &&
                startIndex < endIndex
            ) {

                direction = dir.Direction;
                stopUID = dir.Stops[startIndex].StopUID;

                break;

            }

        }

        if (!stopUID) {

            throw new Error("找不到起點或終點");

        }

        console.log("Direction =", direction);
        console.log("StopUID =", stopUID);

        // 取得 ETA
        clearInterval(refreshTimer);

refreshTimer=setInterval(()=>{

    searchBus();

},30000);

const etaData = await getETA(route);

// 只留下同一站、同一方向
const result = etaData.filter(item =>
    item.StopUID === stopUID &&
    item.Direction === direction
);

// 依到站時間排序
result.sort((a, b) => {

    const ta = a.EstimateTime ?? 999999;
    const tb = b.EstimateTime ?? 999999;

    return ta - tb;

});

routeName.textContent = route;

destination.textContent =
`${start} → ${end}`;

eta1.textContent =
formatETA(result[0]?.EstimateTime);

// 先保留空白
eta2.textContent="--";

eta3.textContent="--";

updateTime.textContent =
new Date().toLocaleTimeString("zh-TW");

resultCard.style.display="block";

    }

    catch (err) {

        error.textContent = err.message;

    }

    finally {

        loading.style.display = "none";

    }

}

searchBtn.addEventListener("click", searchBus);

document.addEventListener("keydown",e=>{

    if(e.key==="Enter"){

        searchBus();

    }

});

function getFavorites(){

    const data =
        localStorage.getItem(FAVORITE_KEY);

    if(!data){

        return [];

    }

    return JSON.parse(data);

}

function saveFavorites(list){

    localStorage.setItem(

        FAVORITE_KEY,

        JSON.stringify(list)

    );

}

function addFavorite(){

    const route =
        routeInput.value.trim();

    const start =
        startInput.value.trim();

    const end =
        endInput.value.trim();

    if(!route||!start||!end){

        return;

    }

    const list =
        getFavorites();

    const exists =
        list.some(item=>

            item.route===route &&

            item.start===start &&

            item.end===end

        );

    if(exists){

        alert("已經收藏");

        return;

    }

    list.push({

        route,

        start,

        end

    });

    saveFavorites(list);

    renderFavorites();

}

const favoriteList =
document.getElementById("favoriteList");

function renderFavorites(){

    favoriteList.innerHTML="";

    const list =
        getFavorites();

    if(list.length===0){

        favoriteList.innerHTML=

        "<p>目前沒有收藏</p>";

        return;

    }

    list.forEach((item,index)=>{

        const card=
            document.createElement("div");

        card.className="favorite-item";

        card.innerHTML=`

            <b>${item.route}</b>

            <br>

            ${item.start}

            →

            ${item.end}

            <br><br>

            <button class="goBtn">

                查詢

            </button>

            <button class="deleteBtn">

                刪除

            </button>

        `;

        card.querySelector(".goBtn")

        .onclick=()=>{

            routeInput.value=item.route;

            startInput.value=item.start;

            endInput.value=item.end;

            searchBus();

        };

        card.querySelector(".deleteBtn")

        .onclick=()=>{

            list.splice(index,1);

            saveFavorites(list);

            renderFavorites();

        };

        favoriteList.appendChild(card);

    });

}

const favoriteBtn =
document.getElementById("favoriteBtn");

favoriteBtn.onclick=()=>{

    addFavorite();

};

renderFavorites();
