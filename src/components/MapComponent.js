/* eslint-disable no-script-url */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { Component } from 'react'
import $ from 'jquery'
import GoogleMapReact from 'google-map-react'
import { l, auth } from '../helpers/common'

import SearchBox from './SearchBox'
import AutoComplete from './AutoComplete'
// const AnyReactComponent = ({ text }) => <div>{text}</div>

// const pos_obj = {
//   BOTTOM: 11,
//   BOTTOM_CENTER: 11,
//   BOTTOM_LEFT: 10,
//   BOTTOM_RIGHT: 12,
//   CENTER: 13,
//   LEFT: 5,
//   LEFT_BOTTOM: 6,
//   LEFT_CENTER: 4,
//   LEFT_TOP: 5,
//   RIGHT: 7,
//   RIGHT_BOTTOM: 9,
//   RIGHT_CENTER: 8,
//   RIGHT_TOP: 7,
//   TOP: 2,
//   TOP_CENTER: 2,
//   TOP_LEFT: 1,
//   TOP_RIGHT: 3,
// }

export default class MapComponent extends Component {
  constructor(props){
    super(props)
    this.searchplaces = React.createRef()
    this.savebtn = React.createRef()
    this.searchtags = React.createRef()
    this.drawshapes = React.createRef()
    this.state = {
      name: 'Yul5ia',
      username: 'supervisor@mail.ru',
      mapsApiLoaded: false,
      mapInstance: null,
      mapsapi: null,
    }
  }

  static defaultProps = {
    center: {
      lat: 40.730610,
      lng: -73.935242
    },
    zoom: 12
  }

  componentDidMount(){
    $(() => {
      $('#sidebar-collapse').on('click', function () {
        $('.sidebar').toggleClass('hidden')
      })
    })
  }
  
  logout = () => this.props.logout()
  
  apiLoaded = (map, maps) => {

    map.controls[maps.ControlPosition.LEFT_TOP].push(this.searchtags.current)
    map.controls[maps.ControlPosition.LEFT_TOP].push(this.drawshapes.current)
    
    this.savebtn.current.index = -1
    map.controls[maps.ControlPosition.RIGHT_TOP].push(this.searchplaces.current)
    map.controls[maps.ControlPosition.RIGHT_BOTTOM].push(this.savebtn.current)
    
    // map.addListener('click', () => {
    //   l("Map Clicked")
    // })


    // let newDiv = document.createElement("div")
    // newDiv.textContent = "Some Div"
    // newDiv.index = -1
    // map.controls[maps.ControlPosition.RIGHT_BOTTOM].push(newDiv)
    
    // let newDiv2 = document.createElement("div")
    // newDiv2.textContent = "Some Div 2"
    // newDiv2.index = -1
    // map.controls[maps.ControlPosition.RIGHT_BOTTOM].push(newDiv2)
    // map.controls[maps.ControlPosition.BOTTOM_RIGHT].push(newDiv)

    this.setState({
      mapsApiLoaded: true,
      mapInstance: map,
      mapsapi: maps,
    })  
  }

  handleGoogleMapApi = google => {
    const map = google.map
    google.maps.Polygon.prototype.getBounds = function () {
      var bounds = new google.maps.LatLngBounds()
      this.getPath().forEach(function (element, index) { bounds.extend(element) })
      return bounds
    }
    google.maps.Polygon.prototype.getCenter = function () {
      var arr = this.getPath().getArray()
      , distX = 0, distY = 0
      , len = arr.length

      arr.forEach(function (element, index) { 
        distX+= element.lat()
        distY+= element.lng()
      })
      
      return new google.maps.LatLng(distX/len, distY/len)
    }
    google.maps.Rectangle.prototype.getCenter = function () {
      var bounds = this.getBounds()
//       , distX = 0, distY = 0
//       , len = arr.length
// 
//       arr.forEach(function (element, index) { 
//         distX+= element.lat()
//         distY+= element.lng()
//       })
      
      return new google.maps.LatLng(
        (bounds.getSouthWest().lat() + bounds.getNorthEast().lat()) /2, 
        (bounds.getSouthWest().lng() + bounds.getNorthEast().lng()) /2, 
      )
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
    })
    drawingManager.setMap(map)

    google.maps.event.addListener(drawingManager, 'circlecomplete', function(circle) {
      drawingManager.setDrawingMode(null)
      console.log(circle)
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
        // console.log("radius", circle)
        // console.log("radius", circle.getRadius())
        // let nr = circle.getRadius()*2
        // console.log("new radius", nr)
        temp2.setRadius(circle.getRadius()*1.5)
      })

      circle.addListener('center_changed', function() {
        // console.log("center", circle.getBounds())
        temp2.setCenter(circle.getCenter())
      })
    })

    google.maps.event.addListener(drawingManager, 'polygoncomplete', function(poly) {
      drawingManager.setDrawingMode(null)
      console.log(poly)
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
      })
      console.log(nPoly)

      poly.getPath().addListener('insert_at', function() {        
        console.log('Vertex added.')
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
        console.log('Vertex moved')
        let start = poly.getCenter()
        , opoints = poly.getPath().getArray()
        , nArr = []

        opoints.forEach(pt => {
          let np = google.maps.geometry.spherical.interpolate(start, pt, 1.5)
          nArr.push(np)
        })

        nPoly.setPath(nArr)
      })

    })

    google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(rect) {
      drawingManager.setDrawingMode(null)
      console.log(rect)
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
      // })

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
      })
    })
  }

  placesChanged = places => this.state.mapInstance.setCenter(places[0].geometry.location)
  
  tagSelected = tag => {
    l(tag)
  }
  // new google.maps.LatLng(
  //   rect.getBounds().getSouthWest().lat() - .005, 
  //   rect.getBounds().getSouthWest().lng() - .005*2
  // ),
  // new google.maps.LatLng(
  //   rect.getBounds().getNorthEast().lat() + .005, 
  //   rect.getBounds().getNorthEast().lng() + .005*2
  // ),
  save = () => {
    l("save")
  }

  render() {
    const { mapsApiLoaded, mapInstance, mapsapi } = this.state
    
    return (
      <div className="map-outer">
        <nav className="navbar navbar-expand-lg navbar-dark">
          <a className="navbar-brand" id="sidebar-collapse" href="javascript:void(0)">
            <img src="assets/burger.svg" alt="" />
          </a>
          <div className="ml-auto">
            <ul className="navbar-nav">
              <li className="nav-item">
                <img className="avatar" src="assets/user-icon.png" alt="" />
                <span className="mx-3">{this.state.username}</span>
              </li>
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="javascript:void(0)" data-toggle="dropdown">
                </a>
                <div className="dropdown-menu">
                  <a className="dropdown-item" onClick={this.logout} href="javascript:void(0)">Logout</a>
                </div>
              </li>
            </ul>
          </div>
        </nav>
        <div className="wrapper">
          <nav className="sidebar hidden">
            <h3>Bootstrap Sidebar</h3>
          </nav>
          {/* Important! Always set the container height explicitly */}
          <div className="content">            
            <GoogleMapReact
              options={{
                streetViewControl: true,
                // streetViewControlOptions: {
                //   position: pos_obj.RIGHT_BOTTOM,
                // },
                // zoomControl: true,
                // zoomControlOptions: {
                //   position: pos_obj.RIGHT_BOTTOM,
                // },
              }}
              bootstrapURLKeys={{ 
                libraries: ['drawing', 'geometry', 'places'],
                key: 'AIzaSyB977EFLp4w9wVttk6Ne7s1CejK9LQyvsQ' 
              }}
              defaultCenter={this.props.center}
              defaultZoom={this.props.zoom}
              yesIWantToUseGoogleMapApiInternals
              // onGoogleApiLoaded={ this.handleGoogleMapApi }
              onGoogleApiLoaded={({ map, maps }) => {
                this.apiLoaded(map, maps)
              }}
            >
              {/* <AnyReactComponent
                lat={59.955413}
                lng={30.337844}
                text="My Marker"
              /> */}                
            </GoogleMapReact>
            <div className="search-bar" ref={this.searchplaces}>
              { mapsApiLoaded && 
                <SearchBox 
                  map={mapInstance} 
                  mapsapi={mapsapi} 
                  onPlacesChanged={this.placesChanged} 
                /> }
            </div>
            <div className="search-bar" ref={this.searchtags}>
              <AutoComplete
                inputProps={{
                  placeholder: 'Search for tags ...',
                }}
                optionSelected={this.tagSelected}
                // type="tag"
                // inputChanged={this.handleAutoInput}
                // getCurrSugg={this.handleSuggestions}
              />
            </div>
            <div className="draw-shape" ref={this.drawshapes}>
              <div className="ctn-icon">
                <img className="pr" src="assets/edit-grey.svg" alt="" />
                <img className="sc" src="assets/edit-active.svg" alt="" />
              </div>
              <div className="ctn-icon">
                <img className="pr" src="assets/circle-grey.svg" alt="" />
                <img className="sc" src="assets/circle-active.svg" alt="" />
              </div>
              <div className="ctn-icon">
                <img className="pr" src="assets/square-grey.svg" alt="" />
                <img className="sc" src="assets/square-active.svg" alt="" />
              </div>
            </div>
            <button className="btn-accent" onClick={this.save}ref={this.savebtn}>
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }
}