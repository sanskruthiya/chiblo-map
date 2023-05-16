import * as maplibregl from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const init_coord = [139.9493, 35.8881];
const init_zoom = 11.5;
const init_bearing = 0;
const init_pitch = 0;

function getLinkType(d) {
    return d === "1" ? '公式サイト' :
           d === "2" ? 'Instagram' :
           d === "3" ? 'Twitter' :
           '-';
}

const map_description = document.getElementById('description');
map_description.innerHTML += '<h2>ちーぶろマップ</h2>';
map_description.innerHTML += '<p class="tipstyle01">柏・流山周辺の地域ブロガーの方々が発信している記事を地図上の場所とリンクさせて表示するマップです。</p>';
map_description.innerHTML += '<p class="tipstyle01">この説明を閉じるには、もう一度「このマップについて」ボタンを押してください。</p>';
map_description.innerHTML += '<p class="tipstyle01">地図上の水色の円をクリック/タップすると、その場所のお店やおすすめスポットのブログ記事が一覧で表示されます。</p>';
map_description.innerHTML += '<p class="tipstyle01">ご意見等は<a href="https://form.run/@party--1681740493" target="_blank">問い合わせフォーム（外部サービス）</a>からお知らせください。</p>';
map_description.innerHTML += '<p class="tipstyle01">更新情報<ul><li>2023/5/16 簡易検索とリスト表示機能を追加しました。</li><li>2023/4/18 問い合わせフォームを設定しました。</li><li>2023/4/16 記事を追加しました（掲載数：377件）</li></ul></p>';
map_description.innerHTML += '<hr><p class="remarks"><a href="https://twitter.com/Smille_feuille" target="_blank">管理人Twitter</a> View code on <a href="https://github.com/sanskruthiya/chiblo-map">Github</a></p>';

const filterPOl = document.getElementById('filterinput');
const listingPOl = document.getElementById('feature-list');

function renderListings(features) {
    const listingBox = document.createElement('p');
    listingPOl.innerHTML = '';
    
    if (features.length) { 
        listingBox.textContent = 'マップ表示範囲内の記事数：'+features.length;
        listingPOl.appendChild(listingBox);
        for (const feature of features) {
            const itemLink = document.createElement('a');
            const label = `${feature.properties.name_poi} (${feature.properties.blog_source})`;
            itemLink.href = feature.properties.link_source;
            itemLink.target = '_blank';
            itemLink.textContent = label;
            listingPOl.appendChild(itemLink);
            listingPOl.append(document.createElement("br"));
        }
        filterPOl.parentNode.style.display = 'block';
    } else if (features.length === 0 && filterPOl.value !== "") {
        listingBox.textContent = 'マップ表示範囲内で該当なし';
        listingPOl.appendChild(listingBox);
    } else {
        listingBox.textContent = 'キーワードを入力してください。';
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
    pitch: init_pitch,
    attributionControl:true
});

map.on('load', function () {
    map.addSource('poi', {
        'type': 'geojson',
        'data': './app/data/poi.geojson?20230516',
    });
    map.addLayer({
        'id': 'poi_blank',
        'type': 'circle',
        'source': 'poi',
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
        'source': 'poi',
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
        'source': 'poi',
        'minzoom': 5,
        //'maxzoom': 17,
        'paint': {
            'heatmap-weight': ['interpolate',['linear'],['get', 'count'],1,1,10,50],
            'heatmap-intensity': ['interpolate',['linear'],['zoom'],5,1,20,20],
            'heatmap-color': ['interpolate',['linear'],['heatmap-density'],0,'rgba(200,255,255,0)', 0.4, '#e0ffff', 1, '#00bfff'],
            'heatmap-radius': ['interpolate',['linear'],['zoom'],5,1,20,30],
            'heatmap-opacity': ['interpolate',['linear'],['zoom'],5,1,12,0.6,20,0]
        },  
        'layout': {
            'visibility': 'visible',
        }
    });
    map.addLayer({
        'id': 'poi_text',
        'type': 'symbol',
        'source': 'poi',
        'minzoom': 8,
        'layout': {
            'text-field':['get', 'name_poi'],
            'text-offset': [0,0],
            'text-anchor': 'top',
            'icon-image':'',
            'text-ignore-placement':false,
            'text-size': ['interpolate',['linear'],['zoom'],8,10,12,10,20,12],
            'text-font': ['Open Sans Semibold','Arial Unicode MS Bold']
        },
        'paint': {'text-color': '#333','text-halo-color': '#fff','text-halo-width': 1}
    });
    
    map.on('moveend', () => {
        const extentPOI = map.queryRenderedFeatures({ layers: ['poi_blank'] });
        
        const filtered_reload = [];
        if (filterPOl.value.length > 0) {
            for (const feature of extentPOI) {
                if (feature.properties.name_poi.includes(filterPOl.value) || feature.properties.blog_source.includes(filterPOl.value) || feature.properties.title_source.includes(filterPOl.value)) {
                    filtered_reload.push(feature);
                }
            }
            renderListings(filtered_reload);
        } else {
            renderListings(extentPOI);
        }
        
        if (filtered_reload.length) {
            map.setFilter('poi_text', ['match',['get', 'fid'],filtered_reload.map((feature) => {return feature.properties.fid;}),true,false]);
            map.setFilter('poi_heat', ['match',['get', 'fid'],filtered_reload.map((feature) => {return feature.properties.fid;}),true,false]);
            map.setFilter('poi_point', ['match',['get', 'fid'],filtered_reload.map((feature) => {return feature.properties.fid;}),true,false]);
        } else {
            map.setFilter('poi_heat', ['has', 'fid']);
            map.setFilter('poi_text', ['has', 'fid']);
            map.setFilter('poi_point', ['has', 'fid']);
        }
    });
    
    filterPOl.addEventListener('change', (e) => {
        const uniquePOI = map.queryRenderedFeatures({ layers: ['poi_blank'] });
        const filtered = [];
        
        if (e.target.value.length > 0) {
            for (const feature of uniquePOI) {
                if (feature.properties.name_poi.includes(e.target.value) || feature.properties.blog_source.includes(e.target.value)) {
                    filtered.push(feature);
                }
            }
            renderListings(filtered);
        } else {
            renderListings(uniquePOI);
        }
        
        if (filtered.length) {
            map.setFilter('poi_text', ['match',['get', 'fid'],filtered.map((feature) => {return feature.properties.fid;}),true,false]);
            map.setFilter('poi_heat', ['match',['get', 'fid'],filtered.map((feature) => {return feature.properties.fid;}),true,false]);
            map.setFilter('poi_point', ['match',['get', 'fid'],filtered.map((feature) => {return feature.properties.fid;}),true,false]);
        } else {
            map.setFilter('poi_heat', ['has', 'fid']);
            map.setFilter('poi_text', ['has', 'fid']);
            map.setFilter('poi_point', ['has', 'fid']);
        }
    });

    map.on('click', 'poi_point', function (e){
        map.panTo(e.lngLat,{duration:1000});
    
        let popupContent = '';
        popupContent += '<table class="tablestyle02"><tr><th class="main">ブログ記事</th><th class="remarks">備考</th></tr>'
        map.queryRenderedFeatures(e.point, { layers: ['poi_point']}).forEach(function (feat){
            const blogContent = feat.properties["name_poi"] + ' (' + feat.properties["blog_source"] + ') ' + feat.properties["title_source"];
            popupContent += '<tr><td class="main"><a href="' + feat.properties["link_source"] + '" target="_blank" rel="noopener">' + (blogContent.length < 38 ? blogContent : blogContent.slice(0,36) + '...') + '</a></td>';
            popupContent += '<td class="remarks"><a href="https://www.google.com/maps/search/?api=1&query=' + feat.geometry["coordinates"][1].toFixed(5)+',' + feat.geometry["coordinates"][0].toFixed(5) + '&zoom=18" target="_blank" rel="noopener">Googleマップ</a>';
            popupContent += (feat.properties["url_flag"] === '0' ? '': '<br><a href="'+feat.properties["url_link"]+'" target="_blank" rel="noopener">'+getLinkType(feat.properties["url_flag"])+'</a>')+'</td></tr>';
        });
        popupContent += '</table>';
        
        new maplibregl.Popup({closeButton:true, focusAfterOpen:false, className:'t-popup', maxWidth:'360px', anchor:'bottom'})
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);
    });

    map.zoomTo(12, {duration: 1000});
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
    const visibility = document.getElementById('feature-list');
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
