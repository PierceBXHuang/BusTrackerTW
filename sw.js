const CACHE_NAME = "bus-tracker-v2";

const urlsToCache = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./icons/appbus.png"
];

// 安裝
self.addEventListener("install", event => {

    self.skipWaiting();

    event.waitUntil(

        caches.open(CACHE_NAME)

            .then(cache => cache.addAll(urlsToCache))

    );

});

// 啟用
self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(keys =>

            Promise.all(

                keys.map(key => {

                    if (key !== CACHE_NAME) {

                        return caches.delete(key);

                    }

                })

            )

        )

    );

    self.clients.claim();

});

// 請求
self.addEventListener("fetch", event => {

    event.respondWith(

        fetch(event.request)

            .then(response => {

                const copy = response.clone();

                caches.open(CACHE_NAME)

                    .then(cache => cache.put(event.request, copy));

                return response;

            })

            .catch(() => caches.match(event.request))

    );

});