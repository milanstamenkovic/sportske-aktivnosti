var geoUrlWMS = 'http://localhost:8080/geoserver/wms';
var geoUrlWFS = 'http://localhost:8080/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typename=';

var osm = new ol.layer.Tile({ source: new ol.source.OSM() });

var styles = {
    "parkovi": new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 0, 0.8)',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0, 0, 0, 0.2)'
        })
    }),
    "tereni": new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(0, 255, 0, 1.0)',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0, 255, 0, 0.2)'
        })
    }),
    "zatvoreni": new ol.style.Style({
        image: new ol.style.RegularShape({
            fill: new ol.style.Fill({ color: 'red' }),
            points: 4,
            radius: 5,
            angle: Math.PI / 4
        })
    })
};
var isWMS = true;
var filtering = false;
var activeLayers = {};
var lastFilter;

function getWMSSource(layerName, filter) {
    var params = {
        url: geoUrlWMS,
        params: {
            'LAYERS': layerName,
            'VERSION': '1.1.1',
            'TILED': true,
            'TRANSPARENT': 'true'
        },
        serverType: 'geoserver'
    }
    var extraQuery = getQueryString();
    if (filter) {
        if (extraQuery != "")
            extraQuery = " AND " + extraQuery;
        $.extend(params.params, {
            'cql_filter': filter + extraQuery
        })
    }
    else
        if (extraQuery != "")
            $.extend(params.params, {
                'cql_filter': extraQuery
            })

    return new ol.source.TileWMS(params);
}

function getWFSSource(layerName, filter) {
    var params = {
        format: new ol.format.GeoJSON(),
        url: geoUrlWFS + layerName + '&outputFormat=application%2Fjson'
    }
    if (filter)
        params.url += '&cql_filter=' + encodeURIComponent(filter);
    var extraQuery = getQueryString();
    if(extraQuery != "")
        params.url += filter ? encodeURIComponent(" AND " + extraQuery) : '&cql_filter=' + encodeURIComponent(extraQuery);

    return new ol.source.Vector(params);
}


function showLayers(map, filter) {
    var layerNames = getCheckedLayerNames();
    layerNames.forEach(function (name) {
        showLayer(map, name, filter);
    });
}

function showLayer(map, name, filter) {
    var layer;
    if (isWMS) {
        var source = getWMSSource(name, filter);
        layer = new ol.layer.Tile({ source: source });
    }
    else {
        var source = getWFSSource(name, filter);
        var style = styles[name.split(":")[1]];
        layer = new ol.layer.Vector({ source: source, style: style });
    }
    console.log(layer);
    layer.setOpacity(0.8);
    activeLayers[name] = layer;
    map.addLayer(layer);
}

function getQueryString() {
    var query = $("#queryString")[0].value;
    return query;
}
function removeLayersFromMap(map) {
    for (var layerName in activeLayers) {
        if (activeLayers.hasOwnProperty(layerName)) {
            map.removeLayer(activeLayers[layerName]);
        }
    }
    activeLayers = {};
}

function getCheckedLayerNames() {
    $checkedLayers = $(".layer-chb:checked");
    var layerNames = $checkedLayers.map(function () {
        return this.name;
    });
    return $.makeArray(layerNames);
}

function createFilter(geometry, geometryType) {

    switch (geometryType) {
        case "LineString":
            lastFilter = getQueryIntersectsLine(geometry);
            break;
        case "Point":
            break;
        case "Polygon":
            lastFilter = getQueryWithinPolygon(geometry);
            break;
        case "Circle":
            lastFilter = getQueryWithinRadius(geometry);
            break;
    }
    return lastFilter;
}

function getCoordinatesAsString(coordinates) {
    var coordsString = "";
    for (var i = 0; i < coordinates.length; i++) {
        var coords = ol.proj.transform(coordinates[i], 'EPSG:3857', 'EPSG:4326');
        coordsString += coords[0] + " " + coords[1] + ",";
    }
    coordsString = coordsString.substring(0, coordsString.length - 1);

    return coordsString;
}

function getQueryIntersectsLine(geometry) {
    var coordinates = geometry.getCoordinates();
    var filterString = "INTERSECTS(geom, MULTILINESTRING((" + getCoordinatesAsString(coordinates) + ")))";
    return filterString;
}

function getQueryWithinRadius(geometry) {
    var circularPolygon = ol.geom.Polygon.fromCircle(geometry);
    return getQueryWithinPolygon(circularPolygon);
}

function getQueryWithinPolygon(geometry) {
    var coordinates = geometry.getCoordinates()[0];
    var filterString = "WITHIN(geom, POLYGON((" + getCoordinatesAsString(coordinates) + ")))";
    return filterString;
}

$(document).ready(function () {

    var source = new ol.source.Vector({ wrapX: false });
    var vector = new ol.layer.Vector({
        source: source
    });

    var map = new ol.Map({
        target: 'map',
        renderer: 'canvas',
        layers: [
            osm,
            vector
        ],
        view: new ol.View({
            center: ol.proj.transform([21.9000, 43.3162379], 'EPSG:4326', 'EPSG:3857'),
            zoom: 14
        })
    });

    map.addControl(new ol.control.OverviewMap({ collapsed: false }));

    map.on('singleclick', function (event) {
        if ($("#feature-info-chb").prop("checked")) {
            var animation = ol.animation.pan({
                easing: eval(ol.easing['easeout']),
                source: map.getView().getCenter()
            });

            map.beforeRender(animation);
            map.getView().setCenter(event.coordinate);

            $('#feature-info').html("");
            map.forEachFeatureAtPixel(event.pixel, function (feature) {

            });
            map.forEachLayerAtPixel(event.pixel, function (layer) {
                var url = layer.getSource().getGetFeatureInfoUrl(
                    event.coordinate, map.getView().getResolution(), 'EPSG:3857',
                    { 'INFO_FORMAT': 'text/html' });

                if (url) {
                    var featureInfoHtml = $('#feature-info').html();
                    $('#feature-info').html(featureInfoHtml + '<iframe seamless src="' + url + '"></iframe>');
                }
            }, null, function (layer) {
                return layer != osm;
            });
        }
    });

    map.on('pointermove', function (event) {
        var coord = ol.proj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
        $('#mouse-coordinates').text('Koordinate: ' + ol.coordinate.toStringXY(coord, 4));
    });

    $('.webServiceBtns input').click(function () {
        if (!(isWMS && this.value == 0) && !(!isWMS && this.value == 1)) {
            removeLayersFromMap(map);
            $(".layer-chb").prop("checked", false);
            isWMS = this.value == 0;
        }

        $("#feature-info-chb").prop("checked", isWMS);
    });

    $("#feature-info-chb").click(function () {
        if (isWMS)
            if (filtering) {
                if (this.checked) {
                    map.removeInteraction(draw);

                }
                else {
                    addInteraction();
                    $('#feature-info').html("");

                }
            }
            else {
                this.checked = true;
            }
        else {
            this.checked = false;
        }
    });

    $('#map-chb').click(function () {
        if (this.checked) {
            map.addLayer(osm);
            showLayers(map);
        }
        else {
            map.removeLayer(osm);
            removeLayersFromMap(map);

        }
    });

    $('.layer-chb').click(function () {
        var layerName = this.name;
        if (this.checked) {
            showLayer(map, layerName, lastFilter);
        }
        else {
            map.removeLayer(activeLayers[layerName]);
            delete activeLayers[layerName];
        }
    });

    var draw;
    function addInteraction() {
        var typeSelect = $('#geometryType')[0];
        var value = typeSelect.value;
        if (value !== 'None') {
            filtering = true;
            $("#feature-info-chb").prop("checked", false);

            draw = new ol.interaction.Draw({
                source: source,
                type: (typeSelect.value),
            });

            draw.on("drawstart", function (event) {
                source.clear();
            });
            draw.on("drawend", function (event) {
                removeLayersFromMap(map);

                var geometry = event.feature.getGeometry();
                var filterString = createFilter(geometry, value)
                showLayers(map, filterString);
            });

            map.addInteraction(draw);
        }
        else {
            $("#feature-info-chb").prop("checked", true);

            filtering = false;
            lastFilter = undefined;
            map.removeInteraction(draw);
            map.removeLayer(vector);
            removeLayersFromMap(map);
            showLayers(map);
        }

    }

    $('#geometryType')[0].onchange = function () {
        map.removeInteraction(draw);
        addInteraction();
    };

});

// function initSlider(config) {
//     var min = 0;
//     var max = 10;

//     if (config) {
//         if (config.min)
//             min = config.min;
//         if (config.max)
//             max = config.max;
//     }


//     $("#sliderMinVal").html(min);
//     $("#sliderMaxVal").html(max);

//     $.extend(config, {
//         animate: "fast",
//         min: min,
//         max: max
//     });

//     $("#slider").slider(config);
// }