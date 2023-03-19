import * as maplibregl from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const init_coord = [139.9493, 35.8881];
const init_zoom = 12;
const init_bearing = 0;
const init_pitch = 0;

function getLinkType(d) {
    return d === "1" ? '公式サイト' :
           d === "2" ? 'Instagram' :
           d === "3" ? 'Twitter' :
           '-';
}

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tile2.openstreetmap.jp/styles/osm-bright-ja/style.json',
    center: init_coord,
    interactive: true,
    zoom: init_zoom,
    minZoom: 5,
    maxZoom: 21,
    maxBounds: [[110.0000, 25.0000],[170.0000, 50.0000]],
    bearing: init_bearing,
    pitch: init_pitch,
    attributionControl:false
    });

map.on('load', function () {
    map.addSource('poi', {
        'type': 'geojson',
        'data': './app/data/poi_data.geojson',
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
            'circle-stroke-width':3,
            'circle-stroke-opacity': ['interpolate',['linear'],['zoom'],5,0.2,15,1],
            'circle-opacity': 0.9,
            'circle-radius': ['interpolate',['linear'],['zoom'],5,2,15,12]
        }
    });
    map.addLayer({
        'id': 'poi_text',
        'type': 'symbol',
        'source': 'poi',
        'minzoom': 5,
        'layout': {'text-field':['get', 'name_poi'],'text-offset': [0,0],'text-anchor': 'top','icon-image':'','text-ignore-placement':false,'text-size': 10,'text-font': ['Open Sans Semibold','Arial Unicode MS Bold']},
        'paint': {'text-color': '#333','text-halo-color': '#fff','text-halo-width': 1}
    });
});

map.on('click', 'poi_point', function (e){
    map.panTo(e.lngLat,{duration:1000});

    let popupContent = '';
    popupContent += '<table class="tablestyle02"><tr><th>場所</th><th>ブログ</th><th>備考</th></tr>'
    map.queryRenderedFeatures(e.point, { layers: ['poi_point']}).forEach(function (feat){
        popupContent += '<tr><td>' + feat.properties["name_poi"]+'</td><td><a href="' + feat.properties["link_source"] + '" target="_blank" rel="noopener">' + feat.properties["blog_source"]+'</a></td>';
        popupContent += '<td class="remarks"><a href="https://www.google.com/maps/search/?api=1&query=' + feat.geometry["coordinates"][1].toFixed(5)+',' + feat.geometry["coordinates"][0].toFixed(5) + '&zoom=18" target="_blank" rel="noopener">Googleマップ</a>';
        popupContent += (feat.properties["url_flag"] === '0' ? '': '<br><a href="'+feat.properties["url_link"]+'" target="_blank" rel="noopener">'+getLinkType(feat.properties["url_flag"])+'</a>')+'</td></tr>';
    });
    popupContent += '</table>';
    
    new maplibregl.Popup({closeButton:true, focusAfterOpen:false, className:'t-popup', maxWidth:'360px', anchor:'bottom'})
    .setLngLat(e.lngLat)
    .setHTML(popupContent)
    .addTo(map);
});

document.getElementById('b_location').style.backgroundColor = "#fff";
document.getElementById('b_location').style.color = "#333";

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
                
                let popupContent;
                if (map.queryRenderedFeatures([c_lng, c_lat], { layers: ['poi_point'] })[0] !== undefined){
                    popupContent = '<table class="tablestyle02"><tr><th>場所</th><th>ブログ</th><th>備考</th></tr>'
                    map.queryRenderedFeatures([c_lng, c_lat], { layers: ['poi_point'] }).forEach(function (feat){
                        popupContent += '<tr><td>'+feat.properties["name_poi"]+'</td><td><a href="'+feat.properties["link_source"]+'" target="_blank" rel="noopener">'+feat.properties["blog_source"]+'</a></td>';
                        popupContent += '<td class="remarks"><a href="https://www.google.com/maps/search/?api=1&query='+feat.geometry["coordinates"][1].toFixed(5)+','+feat.geometry["coordinates"][0].toFixed(5)+'&zoom=18" target="_blank" rel="noopener">Googleマップ</a>';
                        popupContent += (feat.properties["url_flag"] === '0' ? '': '<br><a href="'+feat.properties["url_link"]+'" target="_blank" rel="noopener">'+getLinkType(feat.properties["url_flag"])+'</a>')+'</td></tr>';
                    });
                    popupContent += '</table>';
                } else {
                    popupContent = "現在地：周辺の情報はありません。";
                }

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

const attCntl = new maplibregl.AttributionControl({
    customAttribution: '<a href="https://github.com/sanskruthiya/chiblo-map">Github</a>',
    compact: true
});

map.addControl(attCntl, 'bottom-right');
