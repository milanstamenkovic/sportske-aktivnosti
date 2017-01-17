

////////////////////////////////////////////////////////////////////////////////
var adresa = "http://192.168.1.52:8080/geoserver/bpp";
var adresa2 = "http://localhost:8080/geoserver/bpp";
var view;
var qq;
var map, info, draw, bbox = '';
var source = new ol.source.Vector({wrapX: false});
var slojevi = [];
var vectorSourceZone;
var vectorSourceLinije;
var vectorSourceStanice;
var postavljeneLinije = false, postavljeneZone = false;
var staniceFilter = "";
var linijeFilter = "";
var zoneFilter = "";
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var popup;
var fInfoState = false;
var linije,stanice,zone;
var pomQ = 'box';
var sources = [
	new ol.source.ImageWMS({
          url: adresa2 +'/wms',
          params: (staniceFilter != "" ? {'LAYERS': 'bpp:stanice', 'cql_filter': staniceFilter } : {'LAYERS': 'bpp:stanice'}),
          serverType: 'geoserver'
        }),
    new ol.source.ImageWMS({
        url: adresa2 +'/wms',
        params: (linijeFilter != "" ? {'LAYERS': 'bpp:linije', /*'STYLES' : 'linije_style,line',*/ 'cql_filter': linijeFilter } : {'LAYERS': 'bpp:linije'/*, 'STYLES' : 'linije_style,line'*/}),
        serverType: 'geoserver'
      }),
    new ol.source.ImageWMS({
        url: adresa2 +'/wms',
        params: (zoneFilter != "" ? {'LAYERS': 'bpp:zone','STYLES' : 'cite_lakes,polygon', 'cql_filter': zoneFilter } : {'LAYERS': 'bpp:zone','STYLES' : 'cite_lakes,polygon'}),
        serverType: 'geoserver'
      })    
];

function WFS(stanice, linije, zone)
{
	var vectorStanice = new ol.layer.Vector();
	var vectorLinije = new ol.layer.Vector();
	var vectorZone = new ol.layer.Vector();

	if(stanice){
		vectorSourceStanice = new ol.source.Vector({
			format: new ol.format.GeoJSON(),
			url: adresa2 + '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=bpp:stanice&outputFormat=application%2Fjson' + (staniceFilter != "" ? '&CQL_FILTER='+encodeURIComponent(staniceFilter) : "")
		});

		vectorStanice = new ol.layer.Vector({
			source: vectorSourceStanice,
			/*style: (function() {
			   var stroke = new ol.style.Stroke({
				 color: 'black'
			   });
			   var textStroke = new ol.style.Stroke({
				 color: '#fff',
				 width: 3
			   });
			   var textFill = new ol.style.Fill({
				 color: '#000'
			   });
			   return function(feature, resolution) {
				 return [new ol.style.Style({
				   stroke: stroke,
				   //fill: new ol.style.Fill({
				   //		color: [feature.get('id')*feature.get('id')*15, 255/feature.get('id'), feature.get('id')*30, 0.20]
			   	   // }),
				   text: new ol.style.Text({
					 font: '12px Calibri,sans-serif',
					 text: String(feature.get('naziv')),
					 fill: textFill,
					 stroke: textStroke
				   })
				 })];
			   };
			 })()*/
		});
		map.addLayer(vectorStanice);
		slojevi.push(vectorStanice);
	}
	
	if(linije){

		vectorSourceLinije = new ol.source.Vector({
			format: new ol.format.GeoJSON(),
			url: adresa2 + '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=bpp:linije&outputFormat=application%2Fjson' + (linijeFilter != "" ? '&CQL_FILTER='+encodeURIComponent(linijeFilter) : "")
		});

		vectorLinije = new ol.layer.Vector({
			source: vectorSourceLinije
		});

		map.addLayer(vectorLinije);
		slojevi.push(vectorLinije);
	}
	
	if(zone){
		vectorSourceZone = new ol.source.Vector({
			format: new ol.format.GeoJSON(),
			url: adresa2 + '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=bpp:zone&outputFormat=application%2Fjson' + (zoneFilter != "" ? '&CQL_FILTER='+encodeURIComponent(zoneFilter) : "")
		});


		vectorZone = new ol.layer.Vector({
			source: vectorSourceZone,
			style: (function() {
			   var stroke = new ol.style.Stroke({
				 color: 'black'
			   });
			   var textStroke = new ol.style.Stroke({
				 color: '#fff',
				 width: 3
			   });
			   var textFill = new ol.style.Fill({
				 color: '#000'
			   });
			   return function(feature, resolution) {
				 return [new ol.style.Style({
				   stroke: stroke,
				   fill: new ol.style.Fill({
				   		color: [feature.get('id')*feature.get('id')*15, 255/feature.get('id'), feature.get('id')*30, 0.20]
			   		}),
				   /*text: new ol.style.Text({
					 font: '12px Calibri,sans-serif',
					 text: String(feature.get('id')),
					 fill: textFill,
					 stroke: textStroke
				   })*/
				 })];
			   };
			 })()
		});
		
		map.addLayer(vectorZone);
		slojevi.push(vectorZone);
	}

}

function WMS(stanice, linije, zone)
{
  if(zone){
    var a =new ol.layer.Image({
      source: new ol.source.ImageWMS({
        url: adresa2 +'/wms',
        params: (zoneFilter != "" ? {'LAYERS': 'bpp:zone','STYLES' : 'cite_lakes,polygon', 'cql_filter': zoneFilter } : {'LAYERS': 'bpp:zone','STYLES' : 'cite_lakes,polygon'}),
        serverType: 'geoserver'
      }),
		opacity:0.5
    })
			
             map.addLayer(a);
             slojevi.push(a);
}
if(linije){
var a =new ol.layer.Image({
      source: new ol.source.ImageWMS({
        url: adresa2 +'/wms',
        params: (linijeFilter != "" ? {'LAYERS': 'bpp:linije', 'cql_filter': linijeFilter } : {'LAYERS': 'bpp:linije'}),
        serverType: 'geoserver'
      }),
opacity:0.5
    })
             map.addLayer(a);
             slojevi.push(a);
           }

if(stanice){
  var a =new ol.layer.Image({
        source: new ol.source.ImageWMS({
          url: adresa2 +'/wms',
          params: (staniceFilter != "" ? {'LAYERS': 'bpp:stanice', 'cql_filter': staniceFilter } : {'LAYERS': 'bpp:stanice'}),
          serverType: 'geoserver'
        }),
  opacity:0.5
      })

  map.addLayer(a);
  slojevi.push(a);
           }
           
	
}

function refreshData()
{
  var radio = document.getElementById("wms-servis").checked;

  linije = document.getElementById("sloj-linije").checked;
  stanice = document.getElementById("sloj-stanice").checked;
  zone = document.getElementById("sloj-zone").checked;

  var num = slojevi.length;
   for (var i = num - 1; i>= 0; i--) {
          map.removeLayer(slojevi[i]);
   }
	
	makeFilters();
	
  if (radio)
    WMS(stanice,linije,zone);
  else
    WFS(stanice,linije,zone);
}

function makeFilters()
{
	staniceFilter = "";
	linijeFilter = "";
	zoneFilter = "";
	
	var sF = $("#filter-stanice").val().toUpperCase();
	var lF = $("#filter-linije").val().toUpperCase();
	var zF = $("#filter-zone").val().toUpperCase();
	
	if(sF != "")
	{
		sF = sF.split(" ");
		for(var i = 0; i < sF.length; ++i)
		{
			if(i == 0)
				staniceFilter += ("id=" + sF[i]); 
			else
				staniceFilter += ("OR id=" + sF[i]); 
		}
	}
	
	if(lF != "")
	{
		lF = lF.split(" ");
		for(var i = 0; i < lF.length; ++i)
		{
			if(i == 0)
				linijeFilter += ("ls LIKE '" + lF[i] + "%'"); 
			else
				linijeFilter += ("OR ls LIKE '" + lF[i] + "%'"); 
		}
	}
	
	if(zF != "")
	{
		zF = zF.split(" ");
		for(var i = 0; i < zF.length; ++i)
		{
			if(i == 0)
				zoneFilter += ("zona=" + zF[i]); 
			else
				zoneFilter += ("OR zona=" + zF[i]); 
		}
	}
	////////////////////////////////////////////////////////////////////////
	if(bbox != "")
	{
		if(staniceFilter != "")
			staniceFilter = bbox + " AND (" + staniceFilter + ")";
		else
			staniceFilter = bbox;
			
		if(linijeFilter != "")
			linijeFilter = bbox + " AND (" + linijeFilter + ")";
		else
			linijeFilter = bbox;
			
		if(zoneFilter != "")
			zoneFilter = bbox + " AND (" + zoneFilter + ")";
		else
			zoneFilter = bbox;
		
		//console.log(staniceFilter);
	}
	/////////////////////////////////////////////////////////////////////////////
}

function init()
{
popup = new ol.Overlay( /** @type {olx.OverlayOptions} */ ({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    }
}));

view = new ol.View({
          center: ol.proj.transform([ 21.891537,43.318364], 'EPSG:4326', 'EPSG:3857'),
          zoom: 14
        });

  document.getElementById("refresh-button").addEventListener("click", refreshData);
  document.getElementById("box-button").addEventListener("click", function (){addInteraction('box')});
  document.getElementById("line-button").addEventListener("click",   function (){addInteraction('line')});
  document.getElementById("within-button").addEventListener("click",   function (){addInteraction('within')});
//WFS();
//return;
  map = new ol.Map({
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM()
          })
        ],
        target: 'map',
        overlays: [popup],
        controls: ol.control.defaults({
          attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
            collapsible: false
          })
        }),
        view: view
      });
      

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      
}

function togleFeatureInfo()
{
	bbox = "";
	if(draw != null)
		map.removeInteraction(draw);
	if(fInfoState)
	{
		fInfoState = false;
		map.unByKey(qq);
		document.getElementById('info').innerHTML = '';
	}
	else
	{
		fInfoState = true;
		
		qq = map.on('singleclick', function(evt) {
		  document.getElementById('info').innerHTML = '';
		  var viewResolution = /** @type {number} */ (view.getResolution());
		  if(stanice)
		  var url0 = sources[0].getGetFeatureInfoUrl(
			  evt.coordinate, viewResolution, 'EPSG:3857',
			  {'INFO_FORMAT': 'text/html'});
		  if(linije)
		  var url1 = sources[1].getGetFeatureInfoUrl(
			  evt.coordinate, viewResolution, 'EPSG:3857',
			  {'INFO_FORMAT': 'text/html'});
		  if(zone)
		  var url2 = sources[2].getGetFeatureInfoUrl(
			  evt.coordinate, viewResolution, 'EPSG:3857',
			  {'INFO_FORMAT': 'text/html'});
		  if (url0) {
			document.getElementById('info').innerHTML +=
				'<iframe seamless style="width: 100%" src="' + url0 + '"></iframe>';
				}
		  if (url1) {
			document.getElementById('info').innerHTML +=
				'<iframe seamless style="width: 100%" src="' + url1 + '"></iframe>';
				}
		  if (url2) {
			document.getElementById('info').innerHTML +=
				'<iframe seamless style="width: 100%" src="' + url2 + '"></iframe>';
		  }
		});
	}
}

function addInteraction(box) {
	bbox = "";
	pomQ = box;
	
	if(fInfoState)
	{
		fInfoState = false;
		map.unByKey(qq);
		document.getElementById('info').innerHTML = '';
	}
	
  	var value;
	if(draw != null)
		map.removeInteraction(draw);
	value = 'LineString';
	maxPoints = 2;
	geometryFunction = function(coordinates, geometry) {
		if (!geometry) {
			geometry = new ol.geom.Polygon(null);
		}
		var start = coordinates[0];
		var end = coordinates[1];
		if(box == 'box')
			geometry.setCoordinates([
			[start, [start[0], end[1]], end, [end[0], start[1]], start]
		]);
		else if(box == 'line')
			geometry.setCoordinates([
				[start, /*[start[0], end[1]],*/ end/*, [end[0], start[1]], start*/]
		]);
		else
			geometry.setCoordinates([
				[start, [start[0], end[1]], end, [end[0], start[1]], start]
		]);
		return geometry;
	};
    draw = new ol.interaction.Draw({
      source: source,
      type: /** @type {ol.geom.GeometryType} */ (value),
      geometryFunction: geometryFunction,
      maxPoints: maxPoints
    });
    map.addInteraction(draw);

		draw.on('drawend', function (event) {
    // get the feature

		var kordinate = event.feature.getGeometry().getCoordinates();
		var latlng = [];

		for(var i = 0; i < kordinate[0].length; i++)
		{
			var x = kordinate[0][i];
			var y = ol.proj.transform(kordinate[0][i], 'EPSG:3857', 'EPSG:4326');
			latlng.push(y);
		}
		
		if(pomQ == 'box')
			bbox = 'BBOX(geom,'+latlng[2] +','+ latlng[0] +')' ;
		else if (pomQ == 'within')
			bbox = 'WITHIN(geom,POLYGON(('+latlng[3][0] + ' ' + latlng[3][1] +','+latlng[2][0] + ' ' + latlng[2][1] +','+latlng[1][0] + ' ' + latlng[1][1] +','+ latlng[0][0] + ' ' + latlng[0][1] + ',' + latlng[3][0] + ' ' + latlng[3][1]+')))' ;
		else
			bbox = 'INTERSECTS(geom,LINESTRING('+latlng[1][0] + ' ' + latlng[1][1] +','+ latlng[0][0] + ' ' + latlng[0][1] +'))' ;
		
		
		refreshData();

});
  }
