/* eslint-disable no-script-url */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { Component } from 'react'
import $ from 'jquery'
import GoogleMapReact from 'google-map-react'
import { l, auth, generateColor, checkDuplicate, sp, rand, randBetween } from '../helpers/common'

import SearchBox from './SearchBox'
import AutoComplete from './AutoComplete'
import HttpService from '../services/HttpService'
// const AnyReactComponent = ({ text }) => <div>{text}</div>
let palette = [
  { color: "#56d86c", tagId: null },
  { color: "#5f2700", tagId: null },
  { color: "#294eea", tagId: null },
  { color: "#ffb478", tagId: null },
  { color: "#ea5343", tagId: null },
  { color: "#ffe682", tagId: null },
  { color: "#dd2c28", tagId: null },
  { color: "#156bff", tagId: null },
  { color: "#fc9e2d", tagId: null },
  { color: "#b36235", tagId: null },
  { color: "#fb7c2c", tagId: null },
  { color: "#306f3c", tagId: null },
  { color: "#ffd200", tagId: null },
  { color: "#5f274f", tagId: null },
  { color: "#3bbd63", tagId: null },
  { color: "#b2388f", tagId: null },
  { color: "#fbadd9", tagId: null },
  { color: "#8b250a", tagId: null },
  { color: "#7e420a", tagId: null },
  { color: "#3999ff", tagId: null },
],
currentTag = null

export default class MapComponent extends Component {
  constructor(props){
    super(props)
    this.searchplaces = React.createRef()
    this.savebtn = React.createRef()
    this.searchtags = React.createRef()
    this.drawshapes = React.createRef()

    this.http = new HttpService()
    this.state = {
      name: 'Yul5ia',
      username: 'supervisor@mail.ru',
      mapsApiLoaded: false,
      mapInstance: null,
      mapsApi: null,
      tags: [],
      canDraw: false
    }
  }

  static defaultProps = {
    // center: {
    //   lat: 40.758896,
    //   lng: -73.985130
    // },
    center: {
      lat: 40.78343,
      lng: -73.96625
    },
    zoom: 14
  }

  componentDidMount(){
    $(() => {
      $('#sidebar-collapse').on('click', () => {
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
    
    maps.event.addListener(map, 'click', () => {
      l("Map Clicked")
    })

    const drawingManager = new maps.drawing.DrawingManager({ map, drawingControl: false })
    
    maps.event.addListener(drawingManager, 'circlecomplete', shape => {
      drawingManager.setDrawingMode(null)
      l(currentTag)
      // shape.parent = currentTag

      shape.addListener('click', () => {
        l("Circle clicked", shape)
        l("Current Tag", currentTag)
      })

      shape.addListener('radius_changed', () => {
        l("Circle radius changed", shape)
        outer.setRadius(shape.getRadius()*1.5)
        // outer.setRadius(shape.getRadius() + 3)
      })
      
      shape.addListener('center_changed', () => {
        l("Circle center changed", shape)   
        outer.setCenter(shape.getCenter())     
      })

      // Outer shape for circle
      let outer = new maps.Circle({
        strokeColor: currentTag.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: currentTag.color,
        fillOpacity: 0.35,
        radius: shape.getRadius() * 1.5,
        // radius: shape.getRadius() + 3,
        center: shape.getCenter(),
        editable: true,
        suppressUndo: true,
        // draggable: true,
        map: map,
        zIndex: 0
      })

      outer.addListener('click', () => {
        l("Outer circle clicked", outer)
        l("Current Tag", currentTag)
      })
      outer.addListener('radius_changed', () => {
        l("Outer circle radius changed", outer)
        // outer.setRadius(shape.getRadius() * 1.5)
        // outer.setRadius(shape.getRadius() + 3)
      })

      currentTag.shapes.push({
        id: rand(8),
        inner: shape,
        outer: outer,
        influence: 30,
      })
    })

    maps.event.addListener(drawingManager, 'polygoncomplete', shape => {
      drawingManager.setDrawingMode(null)
      currentTag.shapes.push(shape)
      // shape.parent = currentTag
      
      maps.event.addListener(shape, 'click', () => {
        l("Poly clicked", shape)
      })
    })

    maps.event.addListener(drawingManager, 'rectanglecomplete', shape => {
      drawingManager.setDrawingMode(null)
      currentTag.shapes.push(shape)
      // shape.parent = currentTag
      
      maps.event.addListener(shape, 'click', () => {
        l("Rect clicked", shape)
      })
    })
    
    this.setState({
      mapsApiLoaded: true,
      mapInstance: map,
      mapsApi: maps,
      drawingManager
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
        fillOpacity: 0.35,
        // fillOpacity: 1,
        strokeColor: '#00FF00',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        // strokeWeight: 1,
        // clickable: false,
        editable: true,
        draggable: true,
        suppressUndo: true,
        zIndex: 1
      },
      polygonOptions: {
        fillColor: '#0000FF',
        // fillOpacity: 1,
        fillOpacity: 0.35,
        strokeColor: '#0000FF',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        // strokeWeight: 1,
        // clickable: false,
        editable: true,
        draggable: true,
        suppressUndo: true,
        zIndex: 1
      },
      rectangleOptions: {
        fillColor: '#FF0000',
        fillOpacity: 0.35,
        // fillOpacity: 1,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        // strokeWeight: 1,
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
  
  chooseColor = tag => {
    let availColors = palette.filter(c => !c.tagId)
    , chosenColor

    if (availColors.length){
      chosenColor = availColors[randBetween(0, availColors.length - 1)]
      chosenColor.tagId = tag.id
    } else{
      chosenColor = {
        color: generateColor(),
        tagId: tag.id
      }
      palette.push(chosenColor)
    }
    return chosenColor.color
  }
  
  tagAdded = tag => {
    // l(tag)
    let { tags } = this.state
    if(checkDuplicate(tags, tag)) return
    
    tag.color = this.chooseColor(tag)
    tag.shapes = []
    tags.push(tag)
    this.setState({ tags }, this.tagSelected(tag))
  }
  
  tagDeselected = () => {
    let { tags } = this.state
    , canDraw = false
    
    currentTag = null
    
    tags.forEach(t => {
      t.active = false
      t.shapes.forEach(s => s.setMap(null))
    })
    this.setState({ tags, canDraw })
  }

  tagSelected = tag => {
    this.tagDeselected()

    let { tags, mapInstance, mapsApi, drawingManager } = this.state    
    , canDraw = true
    
    currentTag = tag
    
    tags.forEach(t => {
      if(t.id === tag.id) t.active = true
      else t.active = false
    })
    this.setState({ tags, canDraw }, () => {
      drawingManager.setOptions({
        circleOptions: {
          fillOpacity: 1,
          fillColor: tag.color,
          strokeColor: tag.color,
          strokeOpacity: 1,
          strokeWeight: 2,
          editable: true,
          draggable: true,
          suppressUndo: true,   
          zIndex: 1
        },
        polygonOptions: {
          fillOpacity: 1,
          fillColor: tag.color,
          strokeColor: tag.color,
          strokeOpacity: 1,
          strokeWeight: 2,
          editable: true,
          draggable: true,
          suppressUndo: true,
          zIndex: 1
        },
        rectangleOptions: {
          fillOpacity: 1, 
          fillColor: tag.color,
          strokeColor: tag.color,
          strokeOpacity: 1,
          strokeWeight: 2,
          editable: true,
          draggable: true,
          suppressUndo: true,
          zIndex: 1
        }
      })
    })
    
    if(!tag.shapes.length){ // Fetch shapes if new/no shapes
      const url = '/api/v1/tags-influence'
      , params = { tags_ids: [tag.id] }

      this.http
      .get(url, params, auth)
      .then(res => {
        let results = res.data.tags
        , shapes = []
        tag.shapes = shapes
        
        if (results.length){
          // results.forEach(t => {
          const areas = results[0].areas
          areas.length && l(areas)
          areas.forEach(area => {
            const coords = area.geometry.coordinates
            , radius = area.properties.radius
            shapes.push(
              new mapsApi.Circle({
                strokeColor: tag.color,
                strokeOpacity: 1,
                strokeWeight: 2,
                fillColor: tag.color,
                fillOpacity: 1,
                map: mapInstance,
                center: new mapsApi.LatLng(coords[1], coords[0]),
                // radius: radius*100,
                radius: radius*1,
                editable: true,
                draggable: true,
                suppressUndo: true,
              })
            )
          })        
          // })
        }
        // this.setState({ tags }, () => {
        //   // l(tags)
        // })
      })
    } else { // Set shapes again if existing
      tag.shapes.forEach(s => s.setMap(mapInstance))
    }
  }
  
  tagDeleted = tag => {
    let { tags } = this.state
    
    // Delete tags
    tags = tags.filter(t => t.id !== tag.id)
    this.setState({ tags })

    // Delete drawn shapes
    tag.shapes.forEach(s => s.setMap(null))

    // Reset palette
    palette.filter(c => c.tagId === tag.id)[0].tagId = null
  }

  startDrawing = type => {
    const { drawingManager, mapsApi } = this.state
    switch(type){
      case "polygon": 
        drawingManager.setDrawingMode(mapsApi.drawing.OverlayType.POLYGON)
      break;
      
      case "circle": 
        drawingManager.setDrawingMode(mapsApi.drawing.OverlayType.CIRCLE)
      break;

      default: 
        drawingManager.setDrawingMode(mapsApi.drawing.OverlayType.RECTANGLE)
      break;
    }
  }

  save = () => {
    l("save")
  }

  render() {
    const { mapsApiLoaded, mapInstance, mapsApi, tags, canDraw } = this.state
    
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
          {/* <nav className="sidebar hidden" onClick={this.tagDeselected}>{ */}
          <nav className="sidebar" onClick={this.tagDeselected}>{
            tags.length > 0 && tags.map((tag, idx) => {
              return (
                <div 
                  key={idx} 
                  className={`row mx-0 py-2 tag-row ${tag.active ? "active" : ""} `}
                  onClick={e => { sp(e); this.tagSelected(tag) }}
                  >
                  <div className="col-1">
                    <div 
                      className="tag-color"
                      style={{
                        border: `1px solid ${tag.color}`,
                        borderRadius: 2,
                        background: `${tag.color}`
                      }}
                    ></div>
                  </div>
                  <div className="col-2">{
                    tag.image ?
                    <img className="tag-img" src={tag.image} alt="" /> :
                    <img className="tag-img" src="assets/tag-plh.png" alt="" />
                  }</div>
                  <div className="col-7 tag-title p-0">{tag.full_name}</div>
                  <div className="col-1">
                    <img 
                      src="assets/delete-tag-black.svg" 
                      className="tag-delete" 
                      onClick={e => { sp(e); this.tagDeleted(tag) }}
                      alt=""/>
                  </div>
                </div>
              )
            })
          }{
            tags.length === 0 && <h4>No tags selected</h4>
          }</nav>
          <div className="content">
            <GoogleMapReact
              options={{ streetViewControl: true }}
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
            <div className="search-bar" ref={this.searchplaces}>{ 
              mapsApiLoaded && 
              <SearchBox 
                map={mapInstance} 
                mapsApi={mapsApi} 
                onPlacesChanged={this.placesChanged} 
              />
            }</div>
            <div className="search-bar" ref={this.searchtags}>
              <AutoComplete
                inputProps={{
                  placeholder: 'Search for tags ...',
                }}
                optionSelected={this.tagAdded}
                // type="tag"
                // inputChanged={this.handleAutoInput}
                // getCurrSugg={this.handleSuggestions}
              />
            </div>
            <div className={`draw-shape ${canDraw ? "" : "disabled"}`} ref={this.drawshapes}>
              <div className="ctn-icon" onClick={() => this.startDrawing("polygon")}>
                <img className="pr" src="assets/edit-grey.svg" alt="" />
                <img className="sc" src="assets/edit-active.svg" alt="" />
              </div>
              <div className="ctn-icon" onClick={() => this.startDrawing("circle")}>
                <img className="pr" src="assets/circle-grey.svg" alt="" />
                <img className="sc" src="assets/circle-active.svg" alt="" />
              </div>
              <div className="ctn-icon" onClick={() => this.startDrawing("rectangle")}>
                <img className="pr" src="assets/square-grey.svg" alt="" />
                <img className="sc" src="assets/square-active.svg" alt="" />
              </div>
            </div>
            <button className="btn-accent" onClick={this.save} ref={this.savebtn}>
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }
}