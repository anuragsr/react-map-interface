import React, { Component } from 'react';
import GoogleMapReact from 'google-map-react';
// import * as PIXI from 'pixi.js';
const AnyReactComponent = ({ text }) => <div>{text}</div>;

export default class MapComponent extends Component {
  // constructor(props){
  //   super(props)
  // }

  static defaultProps = {
    center: {
      lat: 59.95,
      lng: 30.33
    },
    zoom: 11
  };

  componentDidMount(){
    console.log("App init from vscode yay!!")
    let a = 5
    const b = 0x990900
    console.log(
      a.toString(2), // Base 2
      b.toString(16) // Base 16
    )

    this.newfn.call(["Ok man", 1, a, b])
    
//     let app = new PIXI.Application(500, 300, {
//       transparent: true,
//       antialias: true
//     })
// 
//     let g = new PIXI.Graphics();
//     g.beginFill(0xff0000); // black color
//     g.drawPolygon(new PIXI.Point(0, 0), new PIXI.Point(100, 0), new PIXI.Point(100, 100), new PIXI.Point(0, 0));
//     // or
//     g.drawPolygon([
//       0, 0,
//       100, 0,
//       100, 100,
//       0, 0
//     ]);
//     g.endFill();
// 
//     let ctn = new PIXI.Container()
//     app.stage.addChild(ctn)
//     ctn.addChild(g)
// 
//     let view = app.view
//     // view.style.position = "absolute"
//     // // view.style.outline = "5px solid green"
//     // view.style.top = view.style.left = 0
//     // view.style.width = view.style.height = 200
//     document.querySelector("#root").appendChild(view)
//     console.log(ctn)
  }
  
  newfn = arg => {
    console.log(arg)
  }

  handleGoogleMapApi = google => {
    const map = google.map
    google.maps.Polygon.prototype.getBounds = function () {
      var bounds = new google.maps.LatLngBounds();
      this.getPath().forEach(function (element, index) { bounds.extend(element); });
      return bounds;
    }
    google.maps.Polygon.prototype.getCenter = function () {
      var arr = this.getPath().getArray()
      , distX = 0, distY = 0
      , len = arr.length

      arr.forEach(function (element, index) { 
        distX+= element.lat()
        distY+= element.lng()
      });
      
      return new google.maps.LatLng(distX/len, distY/len);
    }
    google.maps.Rectangle.prototype.getCenter = function () {
      var bounds = this.getBounds()
//       , distX = 0, distY = 0
//       , len = arr.length
// 
//       arr.forEach(function (element, index) { 
//         distX+= element.lat()
//         distY+= element.lng()
//       });
      
      return new google.maps.LatLng(
        (bounds.getSouthWest().lat() + bounds.getNorthEast().lat()) /2, 
        (bounds.getSouthWest().lng() + bounds.getNorthEast().lng()) /2, 
      );
    }
    const drawingManager = new google.maps.drawing.DrawingManager({
      // drawingMode: google.maps.drawing.OverlayType.MARKER,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [
          google.maps.drawing.OverlayType.CIRCLE,
          google.maps.drawing.OverlayType.POLYGON,
          google.maps.drawing.OverlayType.RECTANGLE
          // google.maps.drawing.OverlayType.MARKER,
          // google.maps.drawing.OverlayType.POLYLINE,
        ]
      },
      // markerOptions: {icon: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png'},
      circleOptions: {
        fillColor: '#00FF00',
        fillOpacity: 1,
        strokeColor: '#00FF00',
        strokeWeight: 1,
        // clickable: false,
        editable: true,
        draggable: true,
        suppressUndo: true,
        zIndex: 1
      },
      polygonOptions: {
        fillColor: '#0000FF',
        fillOpacity: 1,
        strokeColor: '#0000FF',
        strokeWeight: 1,
        // clickable: false,
        editable: true,
        draggable: true,
        suppressUndo: true,
        zIndex: 1
      },
      rectangleOptions: {
        fillColor: '#FF0000',
        fillOpacity: 1,
        strokeColor: '#FF0000',
        strokeWeight: 1,
        // clickable: false,
        editable: true,
        draggable: true,
        suppressUndo: true,
        zIndex: 1
      }
    });
    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'circlecomplete', function(circle) {
      drawingManager.setDrawingMode(null)
      console.log(circle);
      let temp2 = new google.maps.Circle({ 
        strokeColor: '#00FF00',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#00FF00',
        fillOpacity: 0.35,
        radius: circle.getRadius()*1.5, 
        center: circle.getCenter(),
        editable: true,
        suppressUndo: true,
        draggable: true,
        map: map
      })

      circle.addListener('radius_changed', function() {
        // console.log("radius", circle);
        // console.log("radius", circle.getRadius());
        // let nr = circle.getRadius()*2
        // console.log("new radius", nr);
        temp2.setRadius(circle.getRadius()*1.5)
      });

      circle.addListener('center_changed', function() {
        // console.log("center", circle.getBounds());
        temp2.setCenter(circle.getCenter())
      });
    });

    google.maps.event.addListener(drawingManager, 'polygoncomplete', function(poly) {
      drawingManager.setDrawingMode(null)
      console.log(poly);
      let start = poly.getCenter()
      , opoints = poly.getPath().getArray()
      , nArr = []

      opoints.forEach(pt => {
        let np = google.maps.geometry.spherical.interpolate(start, pt, 1.5)
        nArr.push(np)
      })

      let nPoly = new google.maps.Polygon({
        strokeColor: '#0000FF',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#0000FF',
        fillOpacity: 0.35,
        map: map,
        editable: true,
        suppressUndo: true,
        draggable: true,
        path: nArr
      });
      console.log(nPoly);

      poly.getPath().addListener('insert_at', function() {        
        console.log('Vertex added.');
        let start = poly.getCenter()
        , opoints = poly.getPath().getArray()
        , nArr = []

        opoints.forEach(pt => {
          let np = google.maps.geometry.spherical.interpolate(start, pt, 1.5)
          nArr.push(np)
        })

        nPoly.setPath(nArr)
      })

      poly.getPath().addListener('set_at', function() {
        console.log('Vertex moved');
        let start = poly.getCenter()
        , opoints = poly.getPath().getArray()
        , nArr = []

        opoints.forEach(pt => {
          let np = google.maps.geometry.spherical.interpolate(start, pt, 1.5)
          nArr.push(np)
        })

        nPoly.setPath(nArr)
      });

    });

    google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(rect) {
      drawingManager.setDrawingMode(null)
      console.log(rect);
      let rectangle = new google.maps.Rectangle({
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
          map: map,
          editable: true,
          draggable: true,
          suppressUndo: true
        })
      , start = rect.getCenter()
      , bounds = rect.getBounds()

      rectangle.setBounds(
        // rect.getBounds()
        new google.maps.LatLngBounds(
          google.maps.geometry.spherical.interpolate(start, bounds.getSouthWest(), 1.5),
          google.maps.geometry.spherical.interpolate(start, bounds.getNorthEast(), 1.5),
        )
      )

      // rectangle.addListener('bounds_changed', function(e){
      //   console.log(e)
      //   console.log(rectangle.getBounds())
      // });

      rect.addListener('bounds_changed', function(e){
        var start = rect.getCenter()
        , bounds = rect.getBounds()

        rectangle.setBounds(
          // rect.getBounds()
          new google.maps.LatLngBounds(
            google.maps.geometry.spherical.interpolate(start, bounds.getSouthWest(), 1.5),
            google.maps.geometry.spherical.interpolate(start, bounds.getNorthEast(), 1.5),
          )
        )
      });
    });
  }

  // new google.maps.LatLng(
  //   rect.getBounds().getSouthWest().lat() - .005, 
  //   rect.getBounds().getSouthWest().lng() - .005*2
  // ),
  // new google.maps.LatLng(
  //   rect.getBounds().getNorthEast().lat() + .005, 
  //   rect.getBounds().getNorthEast().lng() + .005*2
  // ),

  render() {
    return (
      // Important! Always set the container height explicitly
      <div style={{ height: '100vh', width: '100%' }}>
        <GoogleMapReact
          bootstrapURLKeys={{ 
            libraries: ['drawing', 'geometry'].join(','),
            key: 'AIzaSyB977EFLp4w9wVttk6Ne7s1CejK9LQyvsQ' 
          }}
          defaultCenter={this.props.center}
          defaultZoom={this.props.zoom}          
          yesIWantToUseGoogleMapApiInternals
          onGoogleApiLoaded={ this.handleGoogleMapApi }
        >
          <AnyReactComponent
            lat={59.955413}
            lng={30.337844}
            text="My Marker"
          />
        </GoogleMapReact>
      </div>
    );
  }
}