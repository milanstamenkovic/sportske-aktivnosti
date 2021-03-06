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
var geometryFilter;
var within = true;

function getWMSSource(layerName) {
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
    params = makeFilterQuery(params);
    return new ol.source.TileWMS(params);
}

function getWFSSource(layerName) {
    var params = {
        format: new ol.format.GeoJSON(),
        url: geoUrlWFS + layerName + '&outputFormat=application%2Fjson'
    }
    params = makeFilterQuery(params)
    return new ol.source.Vector(params);
}

function makeFilterQuery(params) {
    var filter = "";
    var stringFilter = getQueryString();

    if (geometryFilter && stringFilter != "")
        filter = geometryFilter + " AND " + stringFilter;
    else {
        if (geometryFilter)
            filter = geometryFilter;
        if (stringFilter != "")
            filter = stringFilter;
    }

    if (filter != "") {
        if (isWMS)
            $.extend(params.params, {
                'cql_filter': filter
            })
        else
            params.url += '&cql_filter=' + encodeURIComponent(filter);
    }
    return params;
}

function showLayers(map) {
    var layerNames = getCheckedLayerNames();
    layerNames.forEach(function (name) {
        showLayer(map, name);
    });
}

function showLayer(map, name) {
    var layer;
    if (isWMS) {
        var source = getWMSSource(name);
        layer = new ol.layer.Tile({ source: source });
    }
    else {
        var source = getWFSSource(name);
        var style = styles[name.split(":")[1]];
        layer = new ol.layer.Vector({ source: source, style: style });
    }
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

function createGeometryFilter(geometry, geometryType) {

    switch (geometryType) {
        case "LineString":
            geometryFilter = getQueryIntersectsLine(geometry);
            break;
        case "Point":
            geometryFilter = getQueryFromPoint(geometry);
            break;
        case "Polygon":
            geometryFilter = getQueryWithinPolygon(geometry);
            break;
        case "Circle":
            geometryFilter = getQueryWithinRadius(geometry);
            break;
    }
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
    var filterString = (within ? "INTERSECTS" : "DISJOINT") + "(geom, MULTILINESTRING((" + getCoordinatesAsString(coordinates) + ")))";
    return filterString;
}

function getQueryWithinRadius(geometry) {
    var circularPolygon = ol.geom.Polygon.fromCircle(geometry);
    return getQueryWithinPolygon(circularPolygon);
}

function getQueryWithinPolygon(geometry) {
    var coordinates = geometry.getCoordinates()[0];
    var filterString = (within ? "WITHIN" : "DISJOINT") + "(geom, POLYGON((" + getCoordinatesAsString(coordinates) + ")))";
    return filterString;
}

function getQueryFromPoint(geometry) {
    var coordinates = ol.proj.transform(geometry.getCoordinates(), 'EPSG:3857', 'EPSG:4326');
    var radius = ol.proj.transform([$("#radiusTxtBox")[0].value, 0], 'EPSG:3857', 'EPSG:4326')[0];
    var filterString = (within ? "DWITHIN" : "BEYOND") + "(geom, POINT(" + coordinates[0] + " " + coordinates[1] + ")," + radius + ",meters)";
    return filterString;
}

$(document).ready(function () {

    var overlay = new ol.Overlay({
        element: document.getElementById('popup'),
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });

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
        overlays: [overlay],
        view: new ol.View({
            center: ol.proj.transform([21.9000, 43.3162379], 'EPSG:4326', 'EPSG:3857'),
            zoom: 14
        })
    });

    map.addControl(new ol.control.OverviewMap({ collapsed: false }));

    map.on('singleclick', function (event) {
        $('#popup-closer').click();
        $('#popup-content').html('');
        if ($("#feature-info-chb").prop("checked")) {
            var animation = ol.animation.pan({
                easing: eval(ol.easing['easeout']),
                source: map.getView().getCenter()
            });

            map.beforeRender(animation);
            map.getView().setCenter(event.coordinate);

            $('#feature-info').html("");
            if (isWMS) {
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
            } else {
                var table = '';
                map.forEachFeatureAtPixel(event.pixel, function (feature, layer) {
                    console.log(feature);
                    var tmp = feature.f.split(".");
                    var featureName = tmp[0].charAt(0).toUpperCase() + tmp[0].slice(1);
                    table += '<table style="width:100%;border-collapse: collapse;">';
                    table += '<tr><caption align="center";>' + featureName + '</caption></tr>';
                    for (var property in feature.H) {
                        if (property != 'geometry') {
                            table += '<tr><td style="width:50%; border: 1px solid black; border-collapse: collapse;">' + property + '</td>' +
                                '<td style="width:50%; border: 1px solid black; border-collapse: collapse;">' + feature.H[property] + '</td></tr>';
                        }
                    }
                    table += '</table><br>';
                });
                if (table != '') {
                    $('#popup-content').html(table);
                    overlay.setPosition(event.coordinate);
                }
            }

        }
    });

    $('#popup-closer').click(function () {
        overlay.setPosition(undefined);
        this.blur();
        return false;
    });

    map.on('pointermove', function (event) {
        var coord = ol.proj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
        $('#mouse-coordinates').text('Koordinate: ' + ol.coordinate.toStringXY(coord, 4));
    });

    $('#withinGeometry')[0].onchange = function () {
        within = this.value == 'Within';
    };

    $('.webServiceBtns input').click(function () {
        if (!(isWMS && this.value == 0) && !(!isWMS && this.value == 1)) {
            removeLayersFromMap(map);
            $(".layer-chb").prop("checked", false);
            isWMS = this.value == 0;
        }
    });

    $("#feature-info-chb").click(function () {
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
    });

    $('#map-chb').click(function () {
        this.checked ? map.addLayer(osm) : map.removeLayer(osm);
    });

    $('.layer-chb').click(function () {
        var layerName = this.name;
        if (this.checked) {
            showLayer(map, layerName, geometryFilter);
        }
        else {
            map.removeLayer(activeLayers[layerName]);
            delete activeLayers[layerName];
        }
    });

    $("#textQueryBtn").click(function () {
        removeLayersFromMap(map);
        showLayers(map);
    });

    var draw;
    function addInteraction() {
        var typeSelect = $('#geometryType')[0];
        var value = typeSelect.value;
        if (value !== 'None') {
            $('#withinGeometry').css("display", "inline")
            if (value == 'Point') {
                $(".radiusForPoint").css("display", "block");
            }
            else {
                $(".radiusForPoint").css("display", "none");
            }
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
                createGeometryFilter(geometry, value);
                showLayers(map);
            });

            map.addInteraction(draw);
        }
        else {
            $("#feature-info-chb").prop("checked", true);

            filtering = false;
            geometryFilter = undefined;
            map.removeInteraction(draw);
            map.removeLayer(vector);
            removeLayersFromMap(map);
            showLayers(map);
            $('#withinGeometry').css("display", "none");
        }
    }

    $('#geometryType')[0].onchange = function () {
        map.removeInteraction(draw);
        addInteraction();
    };
});