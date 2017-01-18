var geoURL = 'http://localhost:8080/geoserver/wms';
var osm = new ol.layer.Tile({ source: new ol.source.OSM() });
var routesSrc = initializeWMSSource('sportske-aktivnosti:rute');
var parksSrc = initializeWMSSource('sportske-aktivnosti:parkovi');
var playgroundsSrc = initializeWMSSource('sportske-aktivnosti:tereni');
var closedSrc = initializeWMSSource('sportske-aktivnosti:zatvoreni');

var routes = new ol.layer.Tile({ source: routesSrc });
var parks = new ol.layer.Tile({ source: parksSrc });
var playgrounds = new ol.layer.Tile({ source: playgroundsSrc });
var closedPlaces = new ol.layer.Tile({ source: closedSrc });

var getFeatureInfo = false;
var filtering = false;
var draw;

var sources = [routesSrc, parksSrc, playgroundsSrc, closedSrc];
var index = 0;


parks.setOpacity(0.65);
playgrounds.setOpacity(0.8);

function initializeWMSSource(layer) {
    return new ol.source.TileWMS({
        url: geoURL,
        params: {
            'LAYERS': layer,
            'VERSION': '1.1.1',
            'TILED': true,
            'TRANSPARENT': 'true'
        },
        serverType: 'geoserver'
    });
}




$(document).ready(function () {
    /* ------------------------------------------------- */
    var raster = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    var source = new ol.source.Vector({ wrapX: false });

    var vector = new ol.layer.Vector({
        source: source
    });

    /* ---------------------------------------------------*/

    var map = new ol.Map({
        target: 'map',
        renderer: 'canvas',
        layers: [
            osm,
            raster,
            vector
        ],
        view: new ol.View({
            center: ol.proj.transform([21.9000, 43.3162379], 'EPSG:4326', 'EPSG:3857'),
            zoom: 14
        })
    });


    var destLoc = [-338.1008, 43.3406];
    var currentLoc = [-338.1000, 43.2948];

    var ext = ol.extent.boundingExtent([destLoc, currentLoc]);
    ext = ol.proj.transformExtent(ext, ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));


    //map.getView().fit(ext, map.getSize());

    map.addControl(new ol.control.OverviewMap({ collapsed: false }));
    map.addInteraction(new ol.interaction.Select({ condition: ol.events.condition.mouseMove }));

    map.on('singleclick', function (event) {

        if (!filtering) {
            var animation = ol.animation.pan({
                easing: eval(ol.easing['easeout']),
                source: map.getView().getCenter()
            });

            map.beforeRender(animation);
            map.getView().setCenter(event.coordinate);

            if (getFeatureInfo) {
                var url = sources[index].getGetFeatureInfoUrl(
                    event.coordinate, map.getView().getResolution(), 'EPSG:3857',
                    { 'INFO_FORMAT': 'text/html' });

                if (url)
                    $('#feature-info').html('<iframe seamless src="' + url + '"></iframe>');
            }
        } else {

        }

    });

    map.on('pointermove', function (event) {
        var coord = ol.proj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
        $('#mouse-coordinates').text('Koordinate: ' + ol.coordinate.toStringXY(coord, 4));
    });

    $('.filter-chb').click(function () {
        filtering = !filtering;
        filtering ? addInteraction() : map.removeInteraction(draw);
        var display = filtering ? "block" : "none";
        $(".filterContainer").css("display", display);
    });

    $('.layer-chb').click(function () {
        switch (parseInt($(this).val())) {
            case 0:
                if (this.checked) {
                    map.addLayer(osm);
                    map.removeLayer(routes);
                    map.removeLayer(parks);
                    map.removeLayer(playgrounds);
                    map.removeLayer(closedPlaces);
                    for (var i = 1; i < 5; i++)
                        $('input[value=' + i + ']').prop('checked', !($('input[value=' + i + ']').prop('checked'))).trigger('click');
                }
                else
                    map.removeLayer(osm);
                break;
            case 1:
                this.checked ? map.addLayer(routes) : map.removeLayer(routes);
                break;
            case 2:
                this.checked ? map.addLayer(parks) : map.removeLayer(parks);
                break;
            case 3:
                this.checked ? map.addLayer(playgrounds) : map.removeLayer(playgrounds);
                break;
            case 4:
                this.checked ? map.addLayer(closedPlaces) : map.removeLayer(closedPlaces);
                break;
            case 5:
                getFeatureInfo = !getFeatureInfo;
                if (!getFeatureInfo) {
                    $('.radioBtns').hide();
                    $('#feature-info iframe').remove();
                }
                else
                    $('.radioBtns').show();
                break;
        }
    });

    $('.radioBtns input').click(function () {
        index = this.value;
    });

    /* ------------------------------ */



    function addInteraction() {
        var typeSelect = $('#geometryType')[0];
        var value = typeSelect.value;
        if (value !== 'None') {
            draw = new ol.interaction.Draw({
                source: source,
                type: /** @type {ol.geom.GeometryType} */ (typeSelect.value),
            });

            draw.on("drawend", function (event) {
                var feature = event.feature;
                var geometry = feature.getGeometry();
                var coordinates = geometry.getCoordinates();
            });

            map.addInteraction(draw);
        }
    }


    $('#geometryType')[0].onchange = function () {
        map.removeInteraction(draw);
        addInteraction();
    };

});




function initSlider(config) {
    var min = 0;
    var max = 10;

    if (config) {
        if (config.min)
            min = config.min;
        if (config.max)
            max = config.max;
    }


    $("#sliderMinVal").html(min);
    $("#sliderMaxVal").html(max);

    $.extend(config, {
        animate: "fast",
        min: min,
        max: max
    });

    $("#slider").slider(config);
}

function initCenterMarker(map, pos) {
    var iconFeature = new ol.Feature({
        geometry: new ol.geom.Point(pos),
        name: 'Referentna tacka'
    });

    var iconStyle = new ol.style.Style({
        image: new ol.style.Icon(/** @type {olx.style.IconOptions} */({
            // anchor: [1, 1],
            // anchorXUnits: 'pixel',
            // anchorYUnits: 'pixel',
            opacity: 0.75,
            src: 'center_eye.png',
            // size: [100, 100],
            // the scale factor
            scale: 0.1
        }))
    });

    iconFeature.setStyle(iconStyle);

    var vectorSource = new ol.source.Vector({
        features: [iconFeature],

    });

    var vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        renderers: ['Canvas', 'VML']

    });

    map.addLayer(vectorLayer);
}












