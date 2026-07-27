const homePage = document.getElementById("homePage");
const searchPage = document.getElementById("searchPage");

document.getElementById("searchBtn").onclick = function () {

    homePage.style.display = "none";
    searchPage.style.display = "block";

};

document.getElementById("backBtn").onclick = function () {

    searchPage.style.display = "none";
    homePage.style.display = "block";

};

document.getElementById("queryBtn").onclick = function () {

    const route = document.getElementById("routeInput").value;
    searchRoute(route);
    const start = document.getElementById("startInput").value;
    const end = document.getElementById("endInput").value;

    document.getElementById("resultText").innerHTML =
`
公車：${route}<br><br>
起點：${start}<br><br>
終點：${end}<br><br>

🔄 下一步將開始查詢 TDX API...
`;

};

console.log(CLIENT_ID);

async function getAccessToken() {

    const url = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";

    const body =
        "grant_type=client_credentials" +
        "&client_id=" + CLIENT_ID +
        "&client_secret=" + CLIENT_SECRET;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body
    });

    const data = await response.json();

    console.log("Access Token：");
    console.log(data.access_token);

}


getAccessToken();

async function searchRoute(routeNumber) {

    const tokenResponse = await fetch(
        "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body:
                "grant_type=client_credentials" +
                "&client_id=" + CLIENT_ID +
                "&client_secret=" + CLIENT_SECRET
        }
    );

    const tokenData = await tokenResponse.json();

    const response = await fetch(
        `https://tdx.transportdata.tw/api/basic/v2/Bus/Route/City/Taipei/${routeNumber}?$format=JSON`,
        {
            headers: {
                Authorization: "Bearer " + tokenData.access_token
            }
        }
    );

    const routes = await response.json();

if (routes.length === 0) {

    document.getElementById("resultText").innerHTML =
        "❌ 找不到此公車路線";

    return;
}

const route = routes[0];

document.getElementById("resultText").innerHTML = `
🚌 路線：${route.RouteName.Zh_tw}<br><br>

📍 起點：${route.DepartureStopNameZh}<br><br>

🏁 終點：${route.DestinationStopNameZh}<br><br>

🏢 業者：${route.Operators[0].OperatorName.Zh_tw}
`;

}