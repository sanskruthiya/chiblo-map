import * as maplibregl from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

let init_coord = [139.95, 35.89];
let init_zoom = 11.5;
let init_bearing = 0;
let init_pitch = 0;

const filterPOl = document.getElementById('filterinput');
const listingPOl = document.getElementById('feature-list');
const clearBtn = document.getElementById('clearButton');
const selectedRange = document.querySelector('.range-select');
const selectedCategory = document.querySelector('.category-select');
const loadingCount = document.getElementById("loading-count");

const dateA = new Date(); 
const yearA = dateA.getFullYear();
const monthA = dateA.getMonth();
const dayA = dateA.getDate();

const utc_1m = Date.UTC(yearA, monthA-1, dayA) / 1000;
const utc_3m = Date.UTC(yearA, monthA-3, dayA) / 1000;
const utc_6m = Date.UTC(yearA, monthA-6, dayA) / 1000;
const utc_1y = Date.UTC(yearA-1, monthA, dayA) / 1000;
const utc_3y = Date.UTC(yearA-3, monthA, dayA) / 1000;
const utc_5y = Date.UTC(yearA-5, monthA, dayA) / 1000;

const periodRange = ["全ての期間の記事","1ヶ月以内の記事","3ヶ月以内の記事","6ヶ月以内の記事","12ヶ月以内の記事","3年以内の記事"];
let targetRange = 0;

// カテゴリの定義
const categories = [
    { value: '', label: '全てのカテゴリ' },
    { value: 'a', label: '子連れに優しい場所' },
    { value: 'b', label: 'お洒落なカフェ' },
    { value: 'c', label: 'ペットOKのお店' },
    { value: 'd', label: '夏の暑い日におすすめ' }
];
let targetCategory = '';

// カテゴリドロップダウンの初期化
const categoryLength = categories.length;
for (let i = 0; i < categoryLength; i++) {
    const listedCategory = document.getElementById('category-id');
    const optionName = document.createElement('option');
    optionName.value = categories[i].value;
    optionName.textContent = categories[i].label;
    listedCategory.appendChild(optionName);
}

const periodLength = periodRange.length;
for (let i = 0; i < periodLength; i++) {
    const listedPeriod = document.getElementById('range-id');
    const optionName = document.createElement('option');
    optionName.value = periodRange[i];
    optionName.textContent = periodRange[i];
    listedPeriod.appendChild(optionName);
}

function getUTC(d) {
    return d === 1 ? utc_1m :
           d === 2 ? utc_3m :
           d === 3 ? utc_6m :
           d === 4 ? utc_1y :
           d === 5 ? utc_3y :
           utc_5y;
}

function getLinkType(d) {
    return d === "1" ? '公式サイト' :
           d === "2" ? '公式Instagram' :
           d === "3" ? '公式Twitter' :
           '-';
}

function renderListings(features) {
    const listingBox = document.createElement('p');
    listingPOl.innerHTML = '';

    const existingToggleButton = document.getElementById('toggle-list-button'); //This returns null on the first render.
    if (existingToggleButton) {existingToggleButton.remove();}
    
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '▲ 広げる';
    toggleButton.id = 'toggle-list-button';
    toggleButton.classList.add('toggle-button');
    if (listingPOl.classList.contains('large-screen')) {
        toggleButton.textContent = '▼ 戻す';
    } else {
        toggleButton.textContent = '▲ 広げる';
    }
    
    toggleButton.addEventListener('click', function() {
        listingPOl.classList.toggle('large-screen');
        if (listingPOl.classList.contains('large-screen')) {
            toggleButton.textContent = '▼ 戻す';
        } else {
            toggleButton.textContent = '▲ 広げる';
        }
    });
    listingPOl.insertBefore(toggleButton, listingPOl.firstChild);
    
    if (features.length) { 
        listingBox.textContent = 'マップ中央付近の記事数：'+features.length;
        listingPOl.appendChild(listingBox);
        for (const feature of features) {
            const itemLink = document.createElement('a');
            const label = `<strong>${feature.properties.name_poi}</strong> (${feature.properties.blog_source} ${feature.properties.date_text}) ${feature.properties.title_source}`;
            itemLink.href = feature.properties.link_source;
            itemLink.target = '_blank';
            //itemLink.textContent = label;
            itemLink.innerHTML = label;
            listingPOl.appendChild(itemLink);
            listingPOl.append(document.createElement("hr"));
        }
        filterPOl.parentNode.style.display = 'block';
    } else if (features.length === 0 && filterPOl.value !== "") {
        listingBox.textContent = 'マップ中央付近に該当する記事がありません。';
        listingPOl.appendChild(listingBox);
    } else {
        listingBox.textContent = 'マップ中央付近に記事がありません。';
        listingPOl.appendChild(listingBox);
        filterPOl.parentNode.style.display = 'block';
    }
}

const map = new maplibregl.Map({
    container: 'map',
    style: './app/data/basemap_style.json',
    center: init_coord,
    interactive: true,
    zoom: init_zoom,
    minZoom: 5,
    maxZoom: 21,
    maxBounds: [[110.0000, 25.0000],[170.0000, 50.0000]],
    bearing: init_bearing,
    hash: false, // URLに現在の地図状態を含めない
    pitch: init_pitch,
    attributionControl:true
});

map.on('load', function () {

    const poi = {'type': 'FeatureCollection','features': []}

    map.addLayer({
        'id': 'poi_pseudo',
        'type': 'circle',
        //'source': 'poi',
        'source': {'type':'geojson','data':poi},
        'minzoom': 5,
        'layout': {
            'visibility': 'visible', 
        },
        'paint': {
            'circle-color':'transparent',
            'circle-stroke-color':'transparent'
        }
    });
    map.addLayer({
        'id': 'poi_point',
        'type': 'circle',
        //'source': 'poi',
        'source': {'type':'geojson','data':poi},
        'minzoom': 5,
        'layout': {
            'visibility': 'visible',
        },
        'paint': {
            'circle-color':'transparent',
            'circle-blur': 0.1,
            'circle-stroke-color':'#00bfff',
            'circle-stroke-width':['interpolate',['linear'],['zoom'],5,1,12,1,20,3],
            'circle-stroke-opacity': ['interpolate',['linear'],['zoom'],12,0.2,18,1],
            'circle-opacity': 0.1,
            'circle-radius': ['interpolate',['linear'],['zoom'],5,4,20,12]
        }
    });
    map.addLayer({
        'id': 'poi_heat',
        'type': 'heatmap',
        //'source': 'poi',
        'source': {'type':'geojson','data':poi},
        'minzoom': 5,
        //'maxzoom': 17,
        'paint': {
            'heatmap-weight': ['interpolate',['linear'],['get', 'count'],1,1,10,50],
            'heatmap-intensity': ['interpolate',['linear'],['zoom'],5,1,20,20],
            'heatmap-color': ['interpolate',['linear'],['heatmap-density'],0,'rgba(200,255,255,0)', 0.4, '#e0ffff', 1, '#00bfff'],
            'heatmap-radius': ['interpolate',['linear'],['zoom'],5,1,20,15],
            'heatmap-opacity': ['interpolate',['linear'],['zoom'],5,1,12,0.6,20,0]
        },  
        'layout': {
            'visibility': 'visible',
        }
    });
    map.addLayer({
        'id': 'poi_text',
        'type': 'symbol',
        //'source': 'poi',
        'source': {'type':'geojson','data':poi},
        'minzoom': 8,
        'layout': {
            'text-field':['get', 'name_poi'],
            'text-offset': [0,0],
            'text-anchor': 'top',
            'icon-image':'',
            //'symbol-spacing': 250,
            'symbol-sort-key':['get', 'date_stamp'],
            //'symbol-sort-key': ['*', ['get', 'fid'], 1], // 初期値はそのままのPOI ID順
            'symbol-z-order': "viewport-y",//"source"
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-size': ['interpolate',['linear'],['zoom'],8,10,12,10,20,12],
            'text-font': ['Open Sans Semibold','Arial Unicode MS Bold']
        },
        'paint': {'text-color': '#333','text-halo-color': '#fff','text-halo-width': 1}
    });
    
    let fgb_src_pd = map.getSource('poi_pseudo');
    let fgb_src_pt = map.getSource('poi_point');
    let fgb_src_ht = map.getSource('poi_heat');
    let fgb_src_tx = map.getSource('poi_text');
    
    let loadFGB_poi = async (url, updateCount) => {
        let updatedURL = `${url}?${yearA}${monthA+1}${dayA}`;//added URL parameter to get the latest dataset.
        console.log(updatedURL);
        const response = await fetch(updatedURL);
        let meta, iter = flatgeobuf.deserialize(response.body, null, m => meta = m)
        for await (let feature of iter) {
          poi.features.push(feature)
          loadingCount.textContent = ((poi.features.length / meta.featuresCount) * 100).toFixed(0);
          if (poi.features.length == meta.featuresCount || (poi.features.length % updateCount) == 0) {
            fgb_src_pd.setData(poi);
            fgb_src_pt.setData(poi);
            fgb_src_ht.setData(poi);
            fgb_src_tx.setData(poi);
          }
          if (poi.features.length == meta.featuresCount) {
            setTimeout(function () {
                document.getElementById("titlewindow").style.display = "none";
                map.zoomTo(init_zoom+0.5, {duration: 1000});
            }, 500); 
          }
        }
      }
    loadFGB_poi('./app/data/poi.fgb', 512);

    function generateList () {
        const center = map.getCenter();
        const point = map.project(center);
        const bbox = [
            [point.x - 30, point.y - 30],
            [point.x + 30, point.y + 30]
        ];
        
        // 期間とカテゴリの選択状態を取得
        targetRange = selectedRange.selectedIndex;
        targetCategory = selectedCategory.value;

        // フィルター条件の作成
        let filters = ['all',
            ['>=', ["to-number", ['get', 'date_stamp']], getUTC(targetRange)]
        ];

        // カテゴリフィルターの追加
        if (targetCategory !== '') {
            filters.push(['in', targetCategory, ['get', 'flag_poi']]);
        }

        const uniquePOI = map.queryRenderedFeatures({ layers: ['poi_pseudo'], filter: filters });
        const extentPOI = map.queryRenderedFeatures(bbox, { layers: ['poi_pseudo'], filter: filters });
        
        const filtered_unique = [];
        const filtered_extent = [];
        
        if (filterPOl.value.length > 0) {
            for (const feature of uniquePOI) {
                if (feature.properties.name_poi.includes(filterPOl.value) || feature.properties.flag_poi.includes(filterPOl.value) || feature.properties.blog_source.includes(filterPOl.value) || feature.properties.title_source.includes(filterPOl.value)) {
                    filtered_unique.push(feature);
                }
            }
            for (const feature of extentPOI) {
                if (feature.properties.name_poi.includes(filterPOl.value) || feature.properties.flag_poi.includes(filterPOl.value) || feature.properties.blog_source.includes(filterPOl.value) || feature.properties.title_source.includes(filterPOl.value)) {
                    filtered_extent.push(feature);
                }
            }
            renderListings(filtered_extent);
            if (filtered_unique.length) {
                map.setFilter('poi_text', ['match',['get', 'fid'],filtered_unique.map((feature) => {return feature.properties.fid;}),true,false]);
                map.setFilter('poi_heat', ['match',['get', 'fid'],filtered_unique.map((feature) => {return feature.properties.fid;}),true,false]);
                map.setFilter('poi_point', ['match',['get', 'fid'],filtered_unique.map((feature) => {return feature.properties.fid;}),true,false]);
            } else {
                //If the result is 0, then it returns no poi.
                map.setFilter('poi_heat', ['has', 'poi0']);
                map.setFilter('poi_text', ['has', 'poi0']);
                map.setFilter('poi_point', ['has', 'poi0']);
            }
        } else {
            renderListings(extentPOI);
            
            // 新しいフィルタリング処理（カテゴリフィルターを含む）
            map.setFilter('poi_heat', filters);
            map.setFilter('poi_text', filters);
            map.setFilter('poi_point', filters);
        }
    } 

    map.on('moveend', generateList);
    filterPOl.addEventListener('change', generateList);
    clearBtn.addEventListener('click', generateList); //this is fired right after the onclick event of clearButton
    selectedRange.addEventListener('change', generateList);
    selectedCategory.addEventListener('change', generateList);

    // クリックエフェクトを生成する関数
    function createRippleEffect(e, lngLat) {
        const canvas = map.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const point = map.project(lngLat);
        const ripple = document.createElement('div');
        ripple.className = 'ripple-effect';
        ripple.style.left = (point.x - 10 + rect.left) + 'px';
        ripple.style.top = (point.y - 10 + rect.top) + 'px';
        ripple.style.width = '30px';
        ripple.style.height = '30px';
        document.body.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 1000); // アニメーションの長さに合わせて調整
    }

    // マップ全体のクリックイベント
    map.on('click', function(e) {
        // POIポイント以外のクリックのみここでエフェクトを表示
        const features = map.queryRenderedFeatures(e.point, { layers: ['poi_point'] });
        if (features.length === 0) {
            createRippleEffect(e, e.lngLat);
        }
    });

    // POIポイントのクリックイベント
    map.on('click', 'poi_point', function (e){
        // マップの移動を開始
        map.panTo(e.lngLat, {duration:1000});
        
        // マップの移動完了を待ってからエフェクトを表示
        setTimeout(() => {
            createRippleEffect(e, e.lngLat);
        }, 800);
    
        let popupContent = '';
        popupContent += '<table class="tablestyle02"><tr><th class="main">ブログ記事 <small style="font-weight: normal; font-size: 11px; color: #fff;">（🔗場所名をクリックで追加リンク表示）</small></th></tr>';
        map.queryRenderedFeatures(e.point, { layers: ['poi_point']}).forEach(function (feat){
            const blogContent = '<a href="' + feat.properties["link_source"] + '" target="_blank" rel="noopener">' + feat.properties["blog_source"] + '（' + feat.properties["date_text"] + '）<br>' + feat.properties["title_source"] + '</a>';
            const linkOfficial = (feat.properties["url_flag"] === '0' ? '': '<a href="'+feat.properties["url_link"]+'" target="_blank" rel="noopener">🏠 '+getLinkType(feat.properties["url_flag"])+'</a> ／ ') + '<a href="https://www.google.com/maps/search/?api=1&query=' + feat.geometry["coordinates"][1].toFixed(5)+',' + feat.geometry["coordinates"][0].toFixed(5) + '&zoom=18" target="_blank" rel="noopener">🗺️ Google Map</a><hr>';
            popupContent += '<tr><td class="main"><details><summary>' + feat.properties["name_poi"] + '</summary>' + linkOfficial + '</details>' + blogContent + '</td></tr>';
        });
        popupContent += '</table>';
        
        new maplibregl.Popup({closeButton:true, focusAfterOpen:false, className:'t-popup', maxWidth:'360px', anchor:'bottom'})
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);
    });
});

document.getElementById('b_location').style.backgroundColor = "#fff";
document.getElementById('b_location').style.color = "#333";

document.getElementById('b_description').style.backgroundColor = "#fff";
document.getElementById('b_description').style.color = "#333";
document.getElementById('description').style.display ="none";

document.getElementById('b_filter').style.backgroundColor = "#2c7fb8";
document.getElementById('b_filter').style.color = "#fff";
document.getElementById('filterbox').style.display ="block";

document.getElementById('b_listing').style.backgroundColor = "#2c7fb8";
document.getElementById('b_listing').style.color = "#fff";
document.getElementById('feature-list').style.display ="block";

document.getElementById("hide-title-button").addEventListener("click", function () {
    document.getElementById("titlewindow").style.display = "none";
});

document.getElementById('b_filter').addEventListener('click', function () {
    const visibility = document.getElementById('filterbox');
    if (visibility.style.display == 'block') {
        visibility.style.display = 'none';
        this.style.backgroundColor = "#fff";
        this.style.color = "#555"
    }
    else {
        visibility.style.display = 'block';
        this.style.backgroundColor = "#2c7fb8";
        this.style.color = "#fff";
    }
});

document.getElementById('b_listing').addEventListener('click', function () {
    const visibility01 = document.getElementById('feature-list');
    const visibility02 = document.getElementById('icon-center');
    if (visibility01.style.display == 'block') {
        visibility01.style.display = 'none';
        visibility02.style.display = 'none';
        this.style.backgroundColor = "#fff";
        this.style.color = "#555"
    }
    else {
        visibility01.style.display = 'block';
        visibility02.style.display = 'block';
        this.style.backgroundColor = "#2c7fb8";
        this.style.color = "#fff";
    }
});

document.getElementById('b_description').addEventListener('click', function () {
    const visibility = document.getElementById('description');
    if (visibility.style.display == 'block') {
        visibility.style.display = 'none';
        this.style.backgroundColor = "#fff";
        this.style.color = "#555"
    }
    else {
        visibility.style.display = 'block';
        this.style.backgroundColor = "#2c7fb8";
        this.style.color = "#fff";
    }
});

const loc_options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0
};

document.getElementById('icon-loader').style.display = 'none';

let popup_loc = new maplibregl.Popup({anchor:"bottom", focusAfterOpen:false});
let marker_loc = new maplibregl.Marker();
let flag_loc = 0;

document.getElementById('b_location').addEventListener('click', function () {
    this.setAttribute("disabled", true);
    if (flag_loc > 0) {
        marker_loc.remove();
        popup_loc.remove();
        this.style.backgroundColor = "#fff";
        this.style.color = "#333";
        flag_loc = 0;
        this.removeAttribute("disabled");
    }
    else {
        document.getElementById('icon-loader').style.display = 'block';
        this.style.backgroundColor = "#87cefa";
        this.style.color = "#fff";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                marker_loc.remove();
                popup_loc.remove();

                document.getElementById('icon-loader').style.display = 'none';
                this.style.backgroundColor = "#2c7fb8";
                this.style.color = "#fff";

                let c_lat = position.coords.latitude;
                let c_lng = position.coords.longitude;
            
                map.jumpTo({
                    center: [c_lng, c_lat],
                    zoom: init_zoom + 1,
                });

                const popupContent = "現在地";;

                popup_loc.setLngLat([c_lng, c_lat]).setHTML(popupContent).addTo(map);
                marker_loc.setLngLat([c_lng, c_lat]).addTo(map);
                flag_loc = 1;
                this.removeAttribute("disabled");
            },
            (error) => {
                popup_loc.remove();
                document.getElementById('icon-loader').style.display = 'none';
                this.style.backgroundColor = "#999";
                this.style.color = "#fff";
                console.warn(`ERROR(${error.code}): ${error.message}`)
                map.flyTo({
                    center: init_coord,
                    zoom: init_zoom,
                    speed: 1,
                });
                popup_loc.setLngLat(init_coord).setHTML('現在地が取得できませんでした').addTo(map);
                flag_loc = 2;
                this.removeAttribute("disabled");
            },
            loc_options
        );
    }
});
