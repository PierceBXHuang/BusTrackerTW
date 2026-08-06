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

let routeListCache = [];
let stopCache = {};


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

// ===== 查詢模式 =====

const selectMode = document.getElementById("selectMode");
const manualMode = document.getElementById("manualMode");

const routeSelect = document.getElementById("routeSelect");
const routeSearch =
document.getElementById("routeSearch");
const startSelect = document.getElementById("startSelect");
const endSelect = document.getElementById("endSelect");

const modeRadios =
document.querySelectorAll('input[name="searchMode"]');

modeRadios.forEach(radio=>{

    radio.addEventListener("change",()=>{

        if(radio.value==="select"){

            selectMode.style.display="block";
            manualMode.style.display="none";

        }

        else{

            selectMode.style.display="none";
            manualMode.style.display="block";

        }

    });

});

routeSelect.addEventListener("change",()=>{

    loadStops(routeSelect.value);

});

routeSearch.addEventListener("input", filterRoutes);


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

async function getAllRoutes(){

    return await apiGet(

`${API_BASE}/Bus/Route/City/${CITY}?$format=JSON`

    );

}

async function getStops(route){

    return await apiGet(

`${API_BASE}/Bus/StopOfRoute/City/${CITY}/${encodeURIComponent(route)}?$format=JSON`

    );

}

function detectDirection(route, startName, endName){

    const stopData = stopCache[route];

    if(!stopData){
        return null;
    }

    for(const dir of stopData){

        const startStops = dir.Stops.filter(
            stop => stop.StopName.Zh_tw === startName
        );

        const endStops = dir.Stops.filter(
            stop => stop.StopName.Zh_tw === endName
        );

        for(const startStop of startStops){

            for(const endStop of endStops){

                if(startStop.StopSequence < endStop.StopSequence){

                    return{
                        direction: dir.Direction,
                        startStop,
                        endStop
                    };

                }

            }

        }

    }

    return null;

}

async function getETA(route){

    return await apiGet(

`${API_BASE}/Bus/EstimatedTimeOfArrival/City/${CITY}/${encodeURIComponent(route)}?$format=JSON`

    );

}

async function loadRoutes(){

    try{

        console.log("① loadRoutes 開始");

        const data = await getAllRoutes();

        console.log("② API回傳：", data);

        // 去除重複路線
        const routes = [...new Set(

            data.map(item=>item.RouteName.Zh_tw)

        )];

        // 公車路線排序
        routes.sort(busRouteCompare);
        console.log("③ 路線數量：", routes.length);

        routeListCache = routes;

        console.log("④ routeSelect =", routeSelect);

       renderRouteOptions(routes);

        console.log("已載入",routes.length,"條路線");

    }

    catch(err){

        console.error(err);

    }

}

function renderRouteOptions(routes){

    routeSelect.innerHTML =
        '<option value="">請選擇路線</option>';

    routes.forEach(route=>{

        const option =
            document.createElement("option");

        option.value = route;

        option.textContent = route;

        routeSelect.appendChild(option);

    });

}

function filterRoutes() {

    const keyword = routeSearch.value
        .trim()
        .toLowerCase();

    if (keyword === "") {

        renderRouteOptions(routeListCache);
        return;

    }

    const filtered = routeListCache
        .filter(route =>
            route.toLowerCase().includes(keyword)
        )
        .sort((a, b) => {

            const aa = a.toLowerCase();
            const bb = b.toLowerCase();

            // 完全相同
            if (aa === keyword && bb !== keyword) return -1;
            if (bb === keyword && aa !== keyword) return 1;

            // 開頭符合
            const aStarts = aa.startsWith(keyword);
            const bStarts = bb.startsWith(keyword);

            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            // 仍維持原本公車排序
            return busRouteCompare(a, b);

        });

    renderRouteOptions(filtered);

}

async function loadStops(route){

    if(!route){

        startSelect.innerHTML =
            '<option value="">請先選擇路線</option>';

        endSelect.innerHTML =
            '<option value="">請先選擇路線</option>';

        startSelect.disabled = true;
        endSelect.disabled = true;

        return;

    }

    try{

        // 已快取就直接使用
        if(stopCache[route]){

            fillStopSelects(route);

            return;

        }

        const stopData = await getStops(route);

        stopCache[route] = stopData;

        console.log("已快取站牌：", route);

        fillStopSelects(route);

    }

    catch(err){

        console.error(err);

    }

}

function fillStopSelects(route){

    const stopData = stopCache[route];

    if(!stopData){
        console.error("找不到站牌資料");
        return;
    }

    startSelect.innerHTML =
        '<option value="">請選擇起站</option>';

    endSelect.innerHTML =
        '<option value="">請選擇終點</option>';

    startSelect.disabled = false;
    endSelect.disabled = false;

    const added = new Set();

    stopData.forEach(dir=>{

        dir.Stops.forEach(stop=>{

            const name = stop.StopName.Zh_tw;

            if(added.has(name)) return;

            added.add(name);

            const option1 = document.createElement("option");
            option1.value = name;
            option1.textContent = name;
            startSelect.appendChild(option1);

            const option2 = document.createElement("option");
            option2.value = name;
            option2.textContent = name;
            endSelect.appendChild(option2);

        });

    });

}

function busRouteCompare(a, b) {

    function parse(route) {

        // 分類優先順序
        const prefixOrder = [
            "",
            "紅",
            "藍",
            "棕",
            "綠",
            "小",
            "幹線",
            "市民小巴",
            "內科",
            "南軟",
            "跳蛙"
        ];

        const match = route.match(/^([^\d]*?)(\d+)(.*)$/);

        if (match) {

            const prefix = match[1];
            const number = parseInt(match[2]);
            const suffix = match[3];

            let order = prefixOrder.indexOf(prefix);

            if (order === -1) {
                order = prefixOrder.length;
            }

            return {
                order,
                prefix,
                number,
                suffix
            };

        }

        // 完全沒有數字
        return {

            order: prefixOrder.length + 1,
            prefix: route,
            number: 0,
            suffix: ""

        };

    }

    const A = parse(a);
    const B = parse(b);

    // 第一層：分類
    if (A.order !== B.order) {

        return A.order - B.order;

    }

    // 第二層：前綴
    if (A.prefix !== B.prefix) {

        return A.prefix.localeCompare(B.prefix, "zh-TW");

    }

    // 第三層：數字
    if (A.number !== B.number) {

        return A.number - B.number;

    }

    // 第四層：副、區、快...
    return A.suffix.localeCompare(B.suffix, "zh-TW");

}

function formatETA(sec){

    if(sec==null){

        return "未發車";

    }

    if(sec<=60){

        return "即將進站";

    }

    return Math.ceil(sec/60)+" 分";

}

async function searchBus(route, start, end) {

    try {

        error.textContent = "";
        loading.style.display = "block";
        resultCard.style.display = "none";

        if (!route || !start || !end) {
            throw new Error("請輸入完整資訊");
        }

        // 自動判斷方向
        const directionResult =
        await detectDirection(route, start, end);

        if (!directionResult) {
            throw new Error("找不到符合的行駛方向");
        }

        const direction = directionResult.direction;
        const stopUID = directionResult.startStop.StopUID;

        console.log("Direction =", direction);
        console.log("StopUID =", stopUID);

        // 每30秒更新一次
        clearInterval(refreshTimer);

        refreshTimer = setInterval(() => {
            searchBus(route, start, end);
        }, 30000);

        // 取得 ETA
        const etaData = await getETA(route);

        // 篩選同一站、同一方向
        const etaResult = etaData.filter(item =>
            item.StopUID === stopUID &&
            item.Direction === direction
        );

        // 依到站時間排序
        etaResult.sort((a, b) => {

            const ta = a.EstimateTime ?? 999999;
            const tb = b.EstimateTime ?? 999999;

            return ta - tb;

        });

        routeName.textContent = route;
        destination.textContent = `${start} → ${end}`;

        eta1.textContent = formatETA(etaResult[0]?.EstimateTime);

        // 先保留，下一版會做第二、第三班
        eta2.textContent = "--";
        eta3.textContent = "--";

        updateTime.textContent =
            new Date().toLocaleTimeString("zh-TW");

        resultCard.style.display = "block";

    }
    catch (err) {

        error.textContent = err.message;

    }
    finally {

        loading.style.display = "none";

    }

}

searchBtn.addEventListener("click",()=>{

    const mode=document.querySelector(
        'input[name="searchMode"]:checked'
    ).value;

    let route,start,end;

    if(mode==="manual"){

        route=routeInput.value.trim();

        start=startInput.value.trim();

        end=endInput.value.trim();

    }

    else{

        route=routeSelect.value;

        start=startSelect.value;

        end=endSelect.value;

    }

    searchBus(route,start,end);

});

document.addEventListener("keydown",e=>{

    if(e.key!=="Enter") return;

    const mode=document.querySelector(
        'input[name="searchMode"]:checked'
    ).value;

    let route,start,end;

    if(mode==="manual"){

        route=routeInput.value.trim();

        start=startInput.value.trim();

        end=endInput.value.trim();

    }

    else{

        route=routeSelect.value;

        start=startSelect.value;

        end=endSelect.value;

    }

    searchBus(route,start,end);

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

    const mode = document.querySelector(
    'input[name="searchMode"]:checked'
    ).value;

    let route, start, end;

    if (mode === "manual") {

        route = routeInput.value.trim();
        start = startInput.value.trim();
        end = endInput.value.trim();

    } else {

        route = routeSelect.value;
        start = startSelect.value;
        end = endSelect.value;

    }

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

            searchBus(

                item.route,

                item.start,

                item.end

            );

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

async function init(){

    await getToken();

    await loadRoutes();

    renderFavorites();

}

init();